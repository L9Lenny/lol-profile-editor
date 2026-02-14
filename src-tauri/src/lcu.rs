use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};
use std::fs;
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LcuInfo {
    pub port: String,
    pub token: String,
}

pub fn find_lcu_info() -> Option<LcuInfo> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        ProcessRefreshKind::default().with_exe(sysinfo::UpdateKind::Always)
    );

    let process = sys.processes().values().find(|p| {
        let name = p.name().to_string_lossy().to_lowercase();
        name == "leagueclientux.exe" || name == "leagueclient.exe"
    })?;

    let exe_path = process.exe()?;
    let install_dir = exe_path.parent()?;
    let lockfile_path = install_dir.join("lockfile");

    if let Ok(contents) = fs::read_to_string(lockfile_path) {
        let parts: Vec<&str> = contents.split(':').collect();
        if parts.len() >= 5 {
            return Some(LcuInfo {
                port: parts[2].to_string(),
                token: parts[3].to_string(),
            });
        }
    }
    
    // Fallback: Check common install path if process didn't give US the path (rare)
    let common_path = PathBuf::from("C:\\Riot Games\\League of Legends\\lockfile");
    if common_path.exists() {
        if let Ok(contents) = fs::read_to_string(common_path) {
            let parts: Vec<&str> = contents.split(':').collect();
            if parts.len() >= 5 {
                return Some(LcuInfo {
                    port: parts[2].to_string(),
                    token: parts[3].to_string(),
                });
            }
        }
    }

    None
}

pub fn get_auth_header(token: &str) -> String {
    let auth = format!("riot:{}", token);
    format!("Basic {}", general_purpose::STANDARD.encode(auth))
}
