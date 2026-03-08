use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
}

#[derive(Debug, Clone, Serialize)]
struct FileDropPayload {
    paths: Vec<String>,
}

fn config_dir() -> PathBuf {
    let dir = app_config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("fluxstudio");
    fs::create_dir_all(&dir).ok();
    dir
}

fn app_config_dir() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join("Library/Application Support"))
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA").ok().map(PathBuf::from)
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_CONFIG_HOME")
            .ok()
            .map(PathBuf::from)
            .or_else(|| std::env::var("HOME").ok().map(|h| PathBuf::from(h).join(".config")))
    }
}

#[tauri::command]
fn get_unread_count() -> u32 {
    // Placeholder: in production, this would query the messaging backend
    0
}

#[tauri::command]
fn save_window_state(state: WindowState) -> Result<(), String> {
    let path = config_dir().join("window-state.json");
    let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_window_state() -> Option<WindowState> {
    let path = config_dir().join("window-state.json");
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

#[tauri::command]
fn open_detached_window(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let url = format!("http://localhost:5173{}", path);
    tauri::WebviewWindowBuilder::new(
        &app,
        "detached",
        tauri::WebviewUrl::External(url.parse().unwrap()),
    )
    .title("FluxStudio")
    .inner_size(1024.0, 768.0)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {
            // Focus the main window when a second instance is launched
        }))
        .invoke_handler(tauri::generate_handler![
            get_unread_count,
            save_window_state,
            load_window_state,
            open_detached_window,
        ])
        .on_drag_drop_event(|app, event| {
            match event {
                tauri::DragDropEvent::Drop { paths, .. } => {
                    let string_paths: Vec<String> = paths
                        .iter()
                        .filter_map(|p| p.to_str().map(String::from))
                        .collect();
                    let _ = app.emit("tauri://file-drop", FileDropPayload {
                        paths: string_paths,
                    });
                }
                tauri::DragDropEvent::Over { .. } => {
                    let _ = app.emit("tauri://file-drop-hover", ());
                }
                tauri::DragDropEvent::Leave { .. } => {
                    let _ = app.emit("tauri://file-drop-cancelled", ());
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
