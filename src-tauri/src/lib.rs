mod lcu;

use serde_json::json;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};

#[tauri::command]
async fn get_lcu_connection() -> Result<lcu::LcuInfo, String> {
    lcu::find_lcu_info().ok_or_else(|| "League of Legends non è avviato o lockfile non trovato".to_string())
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
        Ok("Bio aggiornata con successo!".to_string())
    } else {
        Err(format!("Errore LCU: {}", res.status()))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_lcu_connection, update_bio])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
