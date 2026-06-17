use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct FileRecord {
    pub id: i64,
    pub user_id: i64,
    pub original_name: String,
    pub stored_name: String,
    pub file_type: String,
    pub size_bytes: i64,
    pub uploaded_at: Option<String>,
}
