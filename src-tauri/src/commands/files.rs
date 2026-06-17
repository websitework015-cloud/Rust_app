use crate::models::file_record::FileRecord;
use sqlx::SqlitePool;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

fn get_uploads_dir(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Could not get app data dir");
    let uploads_dir = app_dir.join("uploads");
    fs::create_dir_all(&uploads_dir).expect("Could not create uploads dir");
    uploads_dir
}

fn detect_file_type(filename: &str) -> Result<String, String> {
    let lower = filename.to_lowercase();
    if lower.ends_with(".csv") {
        Ok("csv".to_string())
    } else if lower.ends_with(".xlsx") {
        Ok("xlsx".to_string())
    } else if lower.ends_with(".xls") {
        Ok("xls".to_string())
    } else if lower.ends_with(".html") || lower.ends_with(".htm") {
        Ok("html".to_string())
    } else {
        Err("Unsupported file type. Only xls, xlsx, csv, html are allowed.".to_string())
    }
}

#[tauri::command]
pub async fn upload_file(
    app_handle: AppHandle,
    pool: State<'_, SqlitePool>,
    user_id: i64,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<FileRecord, String> {
    let file_type = detect_file_type(&file_name)?;

    let uploads_dir = get_uploads_dir(&app_handle);

    // Generate a unique stored filename to avoid collisions
    let timestamp = chrono_now();
    let stored_name = format!("{}_{}", timestamp, file_name);
    let dest_path = uploads_dir.join(&stored_name);

    fs::write(&dest_path, &file_data).map_err(|e| e.to_string())?;

    let size_bytes = file_data.len() as i64;

    let result = sqlx::query(
        "INSERT INTO files (user_id, original_name, stored_name, file_type, size_bytes)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(user_id)
    .bind(&file_name)
    .bind(&stored_name)
    .bind(&file_type)
    .bind(size_bytes)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let new_id = result.last_insert_rowid();

    let record: FileRecord = sqlx::query_as(
        "SELECT id, user_id, original_name, stored_name, file_type, size_bytes, uploaded_at
         FROM files WHERE id = ?",
    )
    .bind(new_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub async fn list_files(
    pool: State<'_, SqlitePool>,
    user_id: i64,
) -> Result<Vec<FileRecord>, String> {
    let files: Vec<FileRecord> = sqlx::query_as(
        "SELECT id, user_id, original_name, stored_name, file_type, size_bytes, uploaded_at
         FROM files WHERE user_id = ? ORDER BY uploaded_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(files)
}

#[tauri::command]
pub async fn read_file_content(
    app_handle: AppHandle,
    pool: State<'_, SqlitePool>,
    file_id: i64,
) -> Result<String, String> {
    let record: FileRecord = sqlx::query_as(
        "SELECT id, user_id, original_name, stored_name, file_type, size_bytes, uploaded_at
         FROM files WHERE id = ?",
    )
    .bind(file_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let uploads_dir = get_uploads_dir(&app_handle);
    let file_path = uploads_dir.join(&record.stored_name);

    if record.file_type == "xlsx" || record.file_type == "xls" {
        // Return base64 for binary formats — frontend parses with SheetJS
        let bytes = fs::read(&file_path).map_err(|e| e.to_string())?;
        Ok(base64_encode(&bytes))
    } else {
        // csv and html are plain text
        fs::read_to_string(&file_path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn delete_file(
    app_handle: AppHandle,
    pool: State<'_, SqlitePool>,
    file_id: i64,
) -> Result<String, String> {
    let record: FileRecord = sqlx::query_as(
        "SELECT id, user_id, original_name, stored_name, file_type, size_bytes, uploaded_at
         FROM files WHERE id = ?",
    )
    .bind(file_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let uploads_dir = get_uploads_dir(&app_handle);
    let file_path = uploads_dir.join(&record.stored_name);
    let _ = fs::remove_file(&file_path); // ignore if already missing

    sqlx::query("DELETE FROM files WHERE id = ?")
        .bind(file_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok("File deleted".to_string())
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    now.to_string()
}

fn base64_encode(data: &[u8]) -> String {
    use std::fmt::Write;
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    let mut chunks = data.chunks_exact(3);

    for chunk in &mut chunks {
        let n = ((chunk[0] as u32) << 16) | ((chunk[1] as u32) << 8) | (chunk[2] as u32);
        write!(result, "{}", CHARS[((n >> 18) & 63) as usize] as char).unwrap();
        write!(result, "{}", CHARS[((n >> 12) & 63) as usize] as char).unwrap();
        write!(result, "{}", CHARS[((n >> 6) & 63) as usize] as char).unwrap();
        write!(result, "{}", CHARS[(n & 63) as usize] as char).unwrap();
    }

    let rem = chunks.remainder();
    if rem.len() == 1 {
        let n = (rem[0] as u32) << 16;
        write!(result, "{}", CHARS[((n >> 18) & 63) as usize] as char).unwrap();
        write!(result, "{}", CHARS[((n >> 12) & 63) as usize] as char).unwrap();
        result.push_str("==");
    } else if rem.len() == 2 {
        let n = ((rem[0] as u32) << 16) | ((rem[1] as u32) << 8);
        write!(result, "{}", CHARS[((n >> 18) & 63) as usize] as char).unwrap();
        write!(result, "{}", CHARS[((n >> 12) & 63) as usize] as char).unwrap();
        write!(result, "{}", CHARS[((n >> 6) & 63) as usize] as char).unwrap();
        result.push('=');
    }

    result
}
