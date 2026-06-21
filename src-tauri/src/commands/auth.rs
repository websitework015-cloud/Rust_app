use crate::models::user::{MySqlUserRow, UserProfile};
use bcrypt::{hash, verify, DEFAULT_COST};
use sqlx::{MySqlPool, SqlitePool};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn register(
    pool: State<'_, MySqlPool>,
    name: String,
    email: String,
    password: String,
) -> Result<String, String> {
    let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM users WHERE email = ?")
        .bind(&email)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Err("Email already registered".to_string());
    }

    let password_hash = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
        .bind(&name)
        .bind(&email)
        .bind(&password_hash)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok("Registration successful".to_string())
}

#[tauri::command]
pub async fn login(
    mysql_pool: State<'_, MySqlPool>,
    sqlite_pool: State<'_, SqlitePool>,
    app_handle: AppHandle,
    email: String,
    password: String,
) -> Result<UserProfile, String> {
    let row: Option<MySqlUserRow> = sqlx::query_as(
        "SELECT id, name, email, password_hash, credits FROM users WHERE email = ?",
    )
    .bind(&email)
    .fetch_optional(mysql_pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let row = row.ok_or("Invalid email or password")?;

    let valid = verify(&password, &row.password_hash).map_err(|e| e.to_string())?;
    if !valid {
        return Err("Invalid email or password".to_string());
    }

    // Clear uploaded files on every login so the dashboard always starts blank
    clear_uploaded_files(sqlite_pool.inner(), &app_handle, row.id).await;

    Ok(UserProfile {
        id: row.id,
        name: row.name,
        email: row.email,
        password_hash: String::new(),
        credits: row.credits,
        created_at: None,
    })
}

async fn clear_uploaded_files(pool: &SqlitePool, app_handle: &AppHandle, user_id: i64) {
    // Fetch stored filenames so we can delete them from disk too
    let stored: Vec<(String,)> =
        sqlx::query_as("SELECT stored_name FROM files WHERE user_id = ?")
            .bind(user_id)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        let uploads_dir = app_dir.join("uploads");
        for (name,) in &stored {
            let _ = std::fs::remove_file(uploads_dir.join(name));
        }
    }

    let _ = sqlx::query("DELETE FROM files WHERE user_id = ?")
        .bind(user_id)
        .execute(pool)
        .await;
}
