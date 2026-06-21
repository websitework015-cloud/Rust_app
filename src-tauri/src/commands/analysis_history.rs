use crate::models::cdr::CdrAnalysisResult;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AnalysisRecord {
    pub id: i64,
    pub user_id: i64,
    pub file_name: String,
    pub analyzed_at: Option<String>,
}

#[tauri::command]
pub async fn list_analyses(
    pool: State<'_, SqlitePool>,
    user_id: i64,
) -> Result<Vec<AnalysisRecord>, String> {
    let records = sqlx::query_as::<_, AnalysisRecord>(
        "SELECT id, user_id, file_name, analyzed_at
         FROM analyzed_files WHERE user_id = ? ORDER BY analyzed_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(records)
}

#[tauri::command]
pub async fn get_analysis(
    pool: State<'_, SqlitePool>,
    id: i64,
) -> Result<CdrAnalysisResult, String> {
    let row: (String,) =
        sqlx::query_as("SELECT analysis_json FROM analyzed_files WHERE id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
    serde_json::from_str(&row.0).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_analysis(
    pool: State<'_, SqlitePool>,
    id: i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM analyzed_files WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
