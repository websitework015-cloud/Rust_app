mod commands;
mod config;
mod models;

use commands::db::{init_db, init_mysql};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let sqlite_pool = init_db(&handle)
                    .await
                    .expect("Failed to initialize SQLite database");
                handle.manage(sqlite_pool);

                let mysql_pool = init_mysql()
                    .await
                    .expect("Failed to connect to MySQL. Check config.rs and ensure your MySQL server is running.");
                handle.manage(mysql_pool);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::register,
            commands::auth::login,
            commands::files::upload_file,
            commands::files::list_files,
            commands::files::read_file_content,
            commands::files::delete_file,
            commands::cdr_analysis::analyze_cdr,
            commands::credits::get_credits,
            commands::credits::buy_credits,
            commands::analysis_history::list_analyses,
            commands::analysis_history::get_analysis,
            commands::analysis_history::delete_analysis,
            commands::export::save_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
