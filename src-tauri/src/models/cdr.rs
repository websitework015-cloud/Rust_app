use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CdrRecord {
    pub start: String,
    pub provider_name: String,
    pub aparty: String,
    pub bparty: String,
    pub call_duration: i64,
    pub usage_type: String,
    pub network_type: String,
    pub mcc_start_a: String,
    pub mnc_start_a: String,
    pub lac_start_a: String,
    pub ci_start_a: String,
    pub imei: String,
    pub imsi_a: String,
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImeiRow {
    pub imei: String,
    pub events: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImsiRow {
    pub imsi: String,
    pub events: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StayPlaceRow {
    pub address: String,
    pub lac_ci: String,
    pub events: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CallListRow {
    pub bparty: String,
    pub total_events: i64,
    pub moc: i64,
    pub mtc: i64,
    pub total_duration_seconds: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmsListRow {
    pub bparty: String,
    pub total_events: i64,
    pub smsoc: i64,
    pub smsmt: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BPartyDetailRow {
    pub start: String,
    pub usage_type: String,
    pub call_duration: i64,
    pub network_type: String,
    pub address: String,
    pub imei: String,
    pub imsi_a: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CdrAnalysisResult {
    pub total_records: i64,
    pub aparty: String,
    pub imei_table: Vec<ImeiRow>,
    pub imsi_table: Vec<ImsiRow>,
    pub day_stay: Vec<StayPlaceRow>,
    pub evening_stay: Vec<StayPlaceRow>,
    pub night_stay: Vec<StayPlaceRow>,
    pub call_list: Vec<CallListRow>,
    pub sms_list: Vec<SmsListRow>,
    pub all_records: Vec<CdrRecord>, // used for bparty detail drilldown + short call form, computed on frontend
}