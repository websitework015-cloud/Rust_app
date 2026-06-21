use serde::{Deserialize, Serialize};

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

// Returned to the frontend after login — password_hash is always cleared before sending
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub password_hash: String,
    pub credits: i64,
    pub created_at: Option<String>,
}

// Used only internally for MySQL row decoding
#[derive(Debug, sqlx::FromRow)]
pub struct MySqlUserRow {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub password_hash: String,
    pub credits: i64,
}
