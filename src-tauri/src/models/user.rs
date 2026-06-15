use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub password_hash: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

// UserProfile reuses User struct — we zero out password_hash before sending
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct UserProfile {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub password_hash: String, // kept for internal verify; zeroed before sending
    pub created_at: Option<String>,
}
