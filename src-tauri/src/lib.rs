mod lcu;

use serde_json::json;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager,
};

use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
struct Settings {
    minimize_to_tray: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            minimize_to_tray: false,
        }
    }
}

struct AppSettings {
    minimize_to_tray: Mutex<bool>,
    config_path: PathBuf,
}

impl AppSettings {
    fn load_settings(&self) -> Settings {
        if let Ok(content) = fs::read_to_string(&self.config_path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Settings::default()
        }
    }

    fn save_settings(&self, settings: &Settings) {
        if let Some(parent) = self.config_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(settings) {
            let _ = fs::write(&self.config_path, json);
        }
    }
}

#[tauri::command]
fn set_minimize_to_tray(state: tauri::State<AppSettings>, enabled: bool) {
    let mut minimize = state.minimize_to_tray.lock().unwrap();
    *minimize = enabled;
    
    // Save to config file
    let settings = Settings {
        minimize_to_tray: enabled,
    };
    state.save_settings(&settings);
}

#[tauri::command]
fn get_minimize_to_tray(state: tauri::State<AppSettings>) -> bool {
    *state.minimize_to_tray.lock().unwrap()
}

#[tauri::command]
async fn get_lcu_connection() -> Result<lcu::LcuInfo, String> {
    lcu::find_lcu_info().ok_or_else(|| "League of Legends is not running or lockfile not found".to_string())
}

fn is_allowed_lcu_request(method: &str, endpoint: &str) -> bool {
    matches!(
        (method, endpoint),
        ("PUT", "/lol-chat/v1/me")
            | ("GET", "/lol-chat/v1/me")
            | ("PUT", "/lol-summoner/v1/current-summoner/icon")
            | ("GET", "/lol-challenges/v1/summary-player-data/local-player")
            | ("GET", "/lol-challenges/v1/challenges/local-player")
            | ("POST", "/lol-challenges/v1/update-player-preferences")
    )
}

#[tauri::command]
async fn lcu_request(
    method: String,
    endpoint: String,
    body: Option<serde_json::Value>,
    port: String,
    token: String
) -> Result<serde_json::Value, String> {
    let method = method.trim().to_uppercase();
    let endpoint = endpoint.trim().to_string();
    if endpoint.is_empty() || !endpoint.starts_with('/') || endpoint.contains("..") {
        return Err("Invalid endpoint".to_string());
    }
    if token.trim().is_empty() {
        return Err("Missing token".to_string());
    }
    let port_num = port.parse::<u16>().map_err(|_| "Invalid port".to_string())?;
    if !is_allowed_lcu_request(&method, &endpoint) {
        return Err("Endpoint not allowed".to_string());
    }

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("https://127.0.0.1:{}{}", port_num, endpoint);
    let auth = lcu::get_auth_header(&token);

    let mut request = match method.as_str() {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        "PATCH" => client.patch(url),
        _ => return Err("Invalid method".to_string()),
    };

    request = request.header(AUTHORIZATION, auth).header(CONTENT_TYPE, "application/json");

    if let Some(b) = body {
        request = request.json(&b);
    }

    let res = request.send().await.map_err(|e| e.to_string())?;
    
    // For 204 No Content or empty responses
    if res.status().as_u16() == 204 {
        return Ok(json!({"status": "success"}));
    }

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    
    if status.is_success() {
        if text.is_empty() {
            Ok(json!({"status": "success"}))
        } else {
            Ok(serde_json::from_str(&text).unwrap_or_else(|_| json!({"data": text})))
        }
    } else {
        Err(format!("LCU Error {}: {}", status, text))
    }
}

#[tauri::command]
async fn update_bio(port: String, token: String, new_bio: String) -> Result<String, String> {
    lcu_request(
        "PUT".to_string(),
        "/lol-chat/v1/me".to_string(),
        Some(json!({"statusMessage": new_bio})),
        port,
        token
    ).await.map(|_| "Bio updated successfully!".to_string())
}

#[tauri::command]
fn save_logs_to_path(path: String, content: String) -> Result<String, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Missing path".to_string());
    }
    let target = PathBuf::from(trimmed);
    if let Some(parent) = target.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&target, content).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn force_quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            // Get config directory
            let config_dir = app.path().app_config_dir().unwrap_or_else(|_| PathBuf::from("."));
            let config_path = config_dir.join("settings.json");
            
            // Create AppSettings and load from file
            let app_settings = AppSettings {
                minimize_to_tray: Mutex::new(true),
                config_path: config_path.clone(),
            };
            
            // Load saved settings
            let saved_settings = app_settings.load_settings();
            *app_settings.minimize_to_tray.lock().unwrap() = saved_settings.minimize_to_tray;
            
            app.manage(app_settings);
            
            // Setup System Tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap_or_else(|| tauri::image::Image::new(&[], 0, 0)))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app: &tauri::AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_lcu_connection, update_bio, set_minimize_to_tray, get_minimize_to_tray, lcu_request, save_logs_to_path, force_quit])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_, _| {});
}
