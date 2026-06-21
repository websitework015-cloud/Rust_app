use sqlx::{mysql::MySqlPoolOptions, sqlite::SqlitePoolOptions, MySqlPool, SqlitePool};
use tauri::Manager;

pub async fn init_db(app_handle: &tauri::AppHandle) -> Result<SqlitePool, sqlx::Error> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Could not get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Could not create app dir");
    let db_path = app_dir.join("auth_app.db");

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&format!("sqlite:{}?mode=rwc", db_path.to_string_lossy()))
        .await?;

    // Local file storage
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(&pool)
    .await?;

    // CDR analysis history (stores full JSON result so user can re-view without credit cost)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS analyzed_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            file_name TEXT NOT NULL,
            analysis_json TEXT NOT NULL,
            analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(&pool)
    .await?;

    // Drop the old SQLite users table if it still exists (auth moved to MySQL)
    let legacy_users: Option<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
    )
    .fetch_optional(&pool)
    .await?;

    if legacy_users.is_some() {
        sqlx::query("DELETE FROM files").execute(&pool).await?;
        sqlx::query("DELETE FROM analyzed_files").execute(&pool).await?;
        sqlx::query("DROP TABLE IF EXISTS users").execute(&pool).await?;
    }

    // Always check if the `files` table still carries the old FK constraint.
    // This handles the case where a previous run dropped `users` but crashed before
    // recreating `files`, leaving a broken schema that causes every INSERT to fail.
    let files_schema: Option<(String,)> = sqlx::query_as(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='files'",
    )
    .fetch_optional(&pool)
    .await?;

    if let Some((schema,)) = files_schema {
        if schema.to_uppercase().contains("FOREIGN KEY") {
            // Recreate without the FK — table is already empty from the step above
            sqlx::query("DROP TABLE files").execute(&pool).await?;
            sqlx::query(
                "CREATE TABLE files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    original_name TEXT NOT NULL,
                    stored_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
            )
            .execute(&pool)
            .await?;
        }
    }

    Ok(pool)
}

pub async fn init_mysql() -> Result<MySqlPool, sqlx::Error> {
    // Strip the database name from the URL so we can connect before it exists
    let base_url = crate::config::MYSQL_URL
        .rsplitn(2, '/')
        .nth(1)
        .unwrap_or(crate::config::MYSQL_URL);

    // Connect without a database and create it if it doesn't exist
    let bootstrap = MySqlPoolOptions::new()
        .max_connections(1)
        .connect(base_url)
        .await?;

    // Extract database name from the URL (last segment after final '/')
    let db_name = crate::config::MYSQL_URL
        .rsplitn(2, '/')
        .next()
        .unwrap_or("cdr_app");

    sqlx::query(&format!("CREATE DATABASE IF NOT EXISTS `{}`", db_name))
        .execute(&bootstrap)
        .await?;
    bootstrap.close().await;

    // Now connect with the database selected
    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .connect(crate::config::MYSQL_URL)
        .await?;

    // Remote users table — tracks all registered users and their credits
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            credits BIGINT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}
