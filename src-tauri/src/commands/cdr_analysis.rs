use crate::models::cdr::*;
use calamine::{open_workbook, Reader, Xlsx, Xls};
use chrono::{NaiveDateTime};
use polars::prelude::*;
use std::collections::HashMap;
use std::path::Path;
use tauri::{AppHandle, Manager, State};
use sqlx::SqlitePool;

// ---------- Column name normalization ----------
// Robi CDR headers, tolerant of case/spacing variants
fn find_col<'a>(headers: &'a [String], candidates: &[&str]) -> Option<&'a str> {
    headers.iter().find_map(|h| {
        let norm = h.to_lowercase().replace([' ', '_', '-'], "");
        for c in candidates {
            let cnorm = c.to_lowercase().replace([' ', '_', '-'], "");
            if norm == cnorm {
                return Some(h.as_str());
            }
        }
        None
    })
}

// ---------- Parse Robi's START timestamp format: 20221225104629 -> NaiveDateTime ----------
fn parse_start(raw: &str) -> Option<NaiveDateTime> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() < 14 {
        return None;
    }
    NaiveDateTime::parse_from_str(&digits[0..14], "%Y%m%d%H%M%S").ok()
}

fn format_start(dt: &NaiveDateTime) -> String {
    dt.format("%Y:%m:%d:%H:%M:%S").to_string()
}

// ---------- Read CSV into Vec<HashMap<String,String>> via Polars ----------
fn read_csv_rows(path: &Path) -> Result<Vec<HashMap<String, String>>, String> {
    let df = CsvReadOptions::default()
        .with_has_header(true)
        .try_into_reader_with_file_path(Some(path.to_path_buf()))
        .map_err(|e| e.to_string())?
        .finish()
        .map_err(|e| e.to_string())?;

    dataframe_to_rows(&df)
}

fn dataframe_to_rows(df: &DataFrame) -> Result<Vec<HashMap<String, String>>, String> {
    let headers: Vec<String> = df.get_column_names().iter().map(|s| s.to_string()).collect();
    let height = df.height();
    let mut rows: Vec<HashMap<String, String>> = vec![HashMap::new(); height];

    for h in &headers {
        let col = df.column(h).map_err(|e| e.to_string())?;
        for i in 0..height {
            let val = col.get(i).map_err(|e| e.to_string())?;
            let s = match val {
                AnyValue::Null => String::new(),
                other => other.to_string().trim_matches('"').to_string(),
            };
            rows[i].insert(h.clone(), s);
        }
    }
    Ok(rows)
}

// ---------- Read Excel (xlsx/xls) into Vec<HashMap<String,String>> via calamine ----------
fn read_excel_rows(path: &Path, is_xls: bool) -> Result<Vec<HashMap<String, String>>, String> {
    let range = if is_xls {
        let result: Result<Xls<_>, _> = open_workbook(path);
        let mut wb = result.map_err(|e| e.to_string())?;
        let sheet_name = wb.sheet_names().get(0).cloned().ok_or("No sheets found")?;
        wb.worksheet_range(&sheet_name).map_err(|e| e.to_string())?
    } else {
        let result: Result<Xlsx<_>, _> = open_workbook(path);
        let mut wb = result.map_err(|e| e.to_string())?;
        let sheet_name = wb.sheet_names().get(0).cloned().ok_or("No sheets found")?;
        wb.worksheet_range(&sheet_name).map_err(|e| e.to_string())?
    };

    let mut rows_iter = range.rows();
    let header_row = rows_iter.next().ok_or("Empty file")?;
    let headers: Vec<String> = header_row.iter().map(|c| c.to_string()).collect();

    let mut result = Vec::new();
    for row in rows_iter {
        let mut map = HashMap::new();
        for (i, cell) in row.iter().enumerate() {
            if let Some(h) = headers.get(i) {
                map.insert(h.clone(), cell.to_string());
            }
        }
        result.push(map);
    }
    Ok(result)
}

// ---------- Map raw rows into typed CdrRecord using flexible header detection ----------
fn map_to_cdr_records(raw_rows: Vec<HashMap<String, String>>) -> Vec<CdrRecord> {
    if raw_rows.is_empty() {
        return vec![];
    }
    let headers: Vec<String> = raw_rows[0].keys().cloned().collect();

    let start_col = find_col(&headers, &["START", "START TIME", "STARTTIME"]).unwrap_or("START").to_string();
    let provider_col = find_col(&headers, &["PROVIDER NAME", "PROVIDER", "OPERATOR"]).unwrap_or("PROVIDER NAME").to_string();
    let aparty_col = find_col(&headers, &["APARTY", "A PARTY", "A-PARTY", "Party A"]).unwrap_or("APARTY").to_string();
    let bparty_col = find_col(&headers, &["BPARTY", "B PARTY", "B-PARTY", "Party B"]).unwrap_or("BPARTY").to_string();
    let duration_col = find_col(&headers, &["CALL DURATION", "DURATION"]).unwrap_or("CALL DURATION").to_string();
    let usage_col = find_col(&headers, &["USAGE TYPE", "USAGETYPE"]).unwrap_or("USAGE TYPE").to_string();
    let network_col = find_col(&headers, &["NETWORK TYPE", "NETWORKTYPE"]).unwrap_or("Network type").to_string();
    let mcc_col = find_col(&headers, &["MCCSTARTA"]).unwrap_or("MCCSTARTA").to_string();
    let mnc_col = find_col(&headers, &["MNCSTARTA"]).unwrap_or("MNCSTARTA").to_string();
    let lac_col = find_col(&headers, &["LACSTARTA"]).unwrap_or("LACSTARTA").to_string();
    let ci_col = find_col(&headers, &["CISTARTA"]).unwrap_or("CISTARTA").to_string();
    let imei_col = find_col(&headers, &["IMEI"]).unwrap_or("IMEI").to_string();
    let imsi_col = find_col(&headers, &["IMSIA", "IMSI A", "IMSI"]).unwrap_or("IMSIA").to_string();
    let address_col = find_col(&headers, &["ADDRESS"]).unwrap_or("ADDRESS").to_string();

    raw_rows
        .into_iter()
        .map(|r| {
            let get = |col: &str| r.get(col).cloned().unwrap_or_default().trim().to_string();
            let raw_start = get(&start_col);
            let formatted_start = parse_start(&raw_start)
                .map(|dt| format_start(&dt))
                .unwrap_or(raw_start.clone());

            let duration_raw = get(&duration_col);
            let duration: i64 = duration_raw.parse().unwrap_or(0);

            CdrRecord {
                start: formatted_start,
                provider_name: get(&provider_col),
                aparty: get(&aparty_col),
                bparty: get(&bparty_col),
                call_duration: duration,
                usage_type: get(&usage_col).to_uppercase(),
                network_type: get(&network_col),
                mcc_start_a: get(&mcc_col),
                mnc_start_a: get(&mnc_col),
                lac_start_a: get(&lac_col),
                ci_start_a: get(&ci_col),
                imei: get(&imei_col),
                imsi_a: get(&imsi_col),
                address: get(&address_col),
            }
        })
        .collect()
}

fn hour_of(record: &CdrRecord) -> Option<u32> {
    // start is already formatted as YYYY:MM:DD:HH:MM:SS — parse hour back out
    let parts: Vec<&str> = record.start.split(':').collect();
    if parts.len() == 6 {
        parts[3].parse::<u32>().ok()
    } else {
        None
    }
}

fn classify_period(hour: u32) -> &'static str {
    if (6..18).contains(&hour) {
        "day"
    } else if (18..22).contains(&hour) {
        "evening"
    } else {
        "night"
    }
}

// ---------- Main analysis ----------
fn analyze(records: &[CdrRecord]) -> CdrAnalysisResult {
    let aparty = records.first().map(|r| r.aparty.clone()).unwrap_or_default();

    // IMEI / IMSI tables
    let mut imei_counts: HashMap<String, i64> = HashMap::new();
    let mut imsi_counts: HashMap<String, i64> = HashMap::new();
    for r in records {
        if !r.imei.is_empty() {
            *imei_counts.entry(r.imei.clone()).or_insert(0) += 1;
        }
        if !r.imsi_a.is_empty() {
            *imsi_counts.entry(r.imsi_a.clone()).or_insert(0) += 1;
        }
    }
    let mut imei_table: Vec<ImeiRow> = imei_counts
        .into_iter()
        .map(|(imei, events)| ImeiRow { imei, events })
        .collect();
    imei_table.sort_by(|a, b| b.events.cmp(&a.events));

    let mut imsi_table: Vec<ImsiRow> = imsi_counts
        .into_iter()
        .map(|(imsi, events)| ImsiRow { imsi, events })
        .collect();
    imsi_table.sort_by(|a, b| b.events.cmp(&a.events));

    // Stay place analysis (day/evening/night), grouped by address + lac/ci combo
    let mut day_map: HashMap<String, (String, i64)> = HashMap::new();
    let mut evening_map: HashMap<String, (String, i64)> = HashMap::new();
    let mut night_map: HashMap<String, (String, i64)> = HashMap::new();

    for r in records {
        let Some(hour) = hour_of(r) else { continue };
        let period = classify_period(hour);
        let lac_ci = format!("{}-{}", r.lac_start_a, r.ci_start_a);
        let key = format!("{}|{}", r.address, lac_ci);

        let map = match period {
            "day" => &mut day_map,
            "evening" => &mut evening_map,
            _ => &mut night_map,
        };
        let entry = map.entry(key).or_insert((r.address.clone(), 0));
        entry.0 = r.address.clone();
        entry.1 += 1;
        let _ = lac_ci; // stored in key already
    }

    fn top3(map: HashMap<String, (String, i64)>) -> Vec<StayPlaceRow> {
        let mut rows: Vec<StayPlaceRow> = map
            .into_iter()
            .map(|(key, (address, events))| {
                let lac_ci = key.split('|').nth(1).unwrap_or("").to_string();
                StayPlaceRow { address, lac_ci, events }
            })
            .collect();
        rows.sort_by(|a, b| b.events.cmp(&a.events));
        rows.into_iter().take(3).collect()
    }

    let day_stay = top3(day_map);
    let evening_stay = top3(evening_map);
    let night_stay = top3(night_map);

    // Call list analysis: group by bparty for MOC/MTC usage types
    let mut call_map: HashMap<String, (i64, i64, i64)> = HashMap::new(); // moc, mtc, duration
    let mut sms_map: HashMap<String, (i64, i64)> = HashMap::new(); // smsoc, smsmt

    for r in records {
        match r.usage_type.as_str() {
            "MOC" => {
                let e = call_map.entry(r.bparty.clone()).or_insert((0, 0, 0));
                e.0 += 1;
                e.2 += r.call_duration;
            }
            "MTC" => {
                let e = call_map.entry(r.bparty.clone()).or_insert((0, 0, 0));
                e.1 += 1;
                e.2 += r.call_duration;
            }
            "SMSOC" => {
                let e = sms_map.entry(r.bparty.clone()).or_insert((0, 0));
                e.0 += 1;
            }
            "SMSMT" => {
                let e = sms_map.entry(r.bparty.clone()).or_insert((0, 0));
                e.1 += 1;
            }
            _ => {}
        }
    }

    let mut call_list: Vec<CallListRow> = call_map
        .into_iter()
        .map(|(bparty, (moc, mtc, dur))| CallListRow {
            bparty,
            total_events: moc + mtc,
            moc,
            mtc,
            total_duration_seconds: dur,
        })
        .collect();
    call_list.sort_by(|a, b| b.total_events.cmp(&a.total_events));

    let mut sms_list: Vec<SmsListRow> = sms_map
        .into_iter()
        .map(|(bparty, (smsoc, smsmt))| SmsListRow {
            bparty,
            total_events: smsoc + smsmt,
            smsoc,
            smsmt,
        })
        .collect();
    sms_list.sort_by(|a, b| b.total_events.cmp(&a.total_events));

    CdrAnalysisResult {
        total_records: records.len() as i64,
        aparty,
        imei_table,
        imsi_table,
        day_stay,
        evening_stay,
        night_stay,
        call_list,
        sms_list,
        all_records: records.to_vec(),
    }
}

#[tauri::command]
pub async fn analyze_cdr(
    app_handle: AppHandle,
    pool: State<'_, SqlitePool>,
    file_id: i64,
) -> Result<CdrAnalysisResult, String> {
    let record: crate::models::file_record::FileRecord = sqlx::query_as(
        "SELECT id, user_id, original_name, stored_name, file_type, size_bytes, uploaded_at
         FROM files WHERE id = ?",
    )
    .bind(file_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_dir.join("uploads").join(&record.stored_name);

    let raw_rows = match record.file_type.as_str() {
        "csv" => read_csv_rows(&file_path)?,
        "xlsx" => read_excel_rows(&file_path, false)?,
        "xls" => read_excel_rows(&file_path, true)?,
        other => return Err(format!("Unsupported file type for CDR analysis: {}", other)),
    };

    if raw_rows.is_empty() {
        return Err("File contains no data rows".to_string());
    }

    let cdr_records = map_to_cdr_records(raw_rows);
    let result = analyze(&cdr_records);

    Ok(result)
}