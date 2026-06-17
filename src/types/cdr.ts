export interface CdrRecord {
  start: string;
  provider_name: string;
  aparty: string;
  bparty: string;
  call_duration: number;
  usage_type: string;
  network_type: string;
  mcc_start_a: string;
  mnc_start_a: string;
  lac_start_a: string;
  ci_start_a: string;
  imei: string;
  imsi_a: string;
  address: string;
}

export interface ImeiRow { imei: string; events: number; }
export interface ImsiRow { imsi: string; events: number; }
export interface StayPlaceRow { address: string; lac_ci: string; events: number; }
export interface CallListRow {
  bparty: string;
  total_events: number;
  moc: number;
  mtc: number;
  total_duration_seconds: number;
}
export interface SmsListRow {
  bparty: string;
  total_events: number;
  smsoc: number;
  smsmt: number;
}

export interface CdrAnalysisResult {
  total_records: number;
  aparty: string;
  imei_table: ImeiRow[];
  imsi_table: ImsiRow[];
  day_stay: StayPlaceRow[];
  evening_stay: StayPlaceRow[];
  night_stay: StayPlaceRow[];
  call_list: CallListRow[];
  sms_list: SmsListRow[];
  all_records: CdrRecord[];
}