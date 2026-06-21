use sqlx::MySqlPool;
use tauri::State;

#[tauri::command]
pub async fn get_credits(
    pool: State<'_, MySqlPool>,
    user_id: i64,
) -> Result<i64, String> {
    let row: (i64,) = sqlx::query_as("SELECT credits FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(row.0)
}

#[tauri::command]
pub async fn buy_credits(
    pool: State<'_, MySqlPool>,
    user_id: i64,
    amount: i64,
) -> Result<i64, String> {
    sqlx::query("UPDATE users SET credits = credits + ? WHERE id = ?")
        .bind(amount)
        .bind(user_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let row: (i64,) = sqlx::query_as("SELECT credits FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(row.0)
}
