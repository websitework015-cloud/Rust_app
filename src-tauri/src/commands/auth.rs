use crate::models::user::UserProfile;
use bcrypt::{hash, verify, DEFAULT_COST};
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn register(
    pool: State<'_, SqlitePool>,
    name: String,
    email: String,
    password: String,
) -> Result<String, String> {
    // Check if email already exists
    let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM users WHERE email = ?")
        .bind(&email)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Err("Email already registered".to_string());
    }

    // Hash password
    let password_hash = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;

    // Insert user
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
    pool: State<'_, SqlitePool>,
    email: String,
    password: String,
) -> Result<UserProfile, String> {
    // Find user by email
    let user: Option<UserProfile> = sqlx::query_as(
        "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?",
    )
    .bind(&email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let user = user.ok_or("Invalid email or password")?;

    // Verify password
    let valid = verify(&password, &user.password_hash).map_err(|e| e.to_string())?;

    if !valid {
        return Err("Invalid email or password".to_string());
    }

    Ok(UserProfile {
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: String::new(), // don't expose hash to frontend
        created_at: user.created_at,
    })
}
