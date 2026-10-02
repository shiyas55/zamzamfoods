pub mod backup;

use std::sync::Arc;
use tauri::{Manager, WindowEvent};
use backup::{BackupState, handle_closing_backup, start_backup_scheduler};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let backup_state = Arc::new(BackupState::new(app.handle()));
            app.manage(Arc::clone(&backup_state));

            // Start automated 23:59 safety backup scheduler
            start_backup_scheduler(Arc::clone(&backup_state));

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                if let Some(state) = window.try_state::<Arc<BackupState>>() {
                    handle_closing_backup(&state);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            backup::get_backup_config,
            backup::save_backup_config,
            backup::trigger_backup_now,
            backup::get_backup_history,
            backup::validate_backup_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
