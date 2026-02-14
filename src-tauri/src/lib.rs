mod lcu;

use serde_json::json;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager,
};

use std::sync::Mutex;

struct AppSettings {
    minimize_to_tray: Mutex<bool>,
}

#[tauri::command]
fn set_minimize_to_tray(state: tauri::State<AppSettings>, enabled: bool) {
    let mut minimize = state.minimize_to_tray.lock().unwrap();
    *minimize = enabled;
}

#[tauri::command]
async fn get_lcu_connection() -> Result<lcu::LcuInfo, String> {
    lcu::find_lcu_info().ok_or_else(|| "League of Legends is not running or lockfile not found".to_string())
}

#[tauri::command]
async fn update_bio(port: String, token: String, new_bio: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("https://127.0.0.1:{}/lol-chat/v1/me", port);
    let auth = lcu::get_auth_header(&token);

    let body = json!({
        "statusMessage": new_bio
    });

    let res = client.put(url)
        .header(AUTHORIZATION, auth)
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        Ok("Bio updated successfully!".to_string())
    } else {
        Err(format!("LCU Error: {}", res.status()))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppSettings { minimize_to_tray: Mutex::new(true) })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            // Setup System Tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app: &tauri::AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show().unwrap();
                            let _ = window.set_focus().unwrap();
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
                            let _ = window.show().unwrap();
                            let _ = window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_lcu_connection, update_bio, set_minimize_to_tray])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                let state = app_handle.state::<AppSettings>();
                if *state.minimize_to_tray.lock().unwrap() {
                    api.prevent_exit();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            }
            _ => {}
        });
}
