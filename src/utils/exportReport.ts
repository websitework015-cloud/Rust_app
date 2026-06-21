import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { CdrAnalysisResult, CdrRecord } from '../types/cdr';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

function nowStr(): string {
  return new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

async function saveFile(data: Uint8Array, defaultName: string, ext: string, label: string) {
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: label, extensions: [ext] }],
  });
  if (!path) return false;
  await invoke('save_file', { path, data: Array.from(data) });
  return true;
}

// ─── COLORS ─────────────────────────────────────────────────────────────────
const C = {
  PURPLE:      [139, 92, 246] as [number, number, number],
  PURPLE_LIGHT:[197, 173, 253] as [number, number, number],
  PURPLE_BG:   [245, 243, 255] as [number, number, number],
  CYAN:        [6,  182, 212] as [number, number, number],
  CYAN_BG:     [240, 253, 254] as [number, number, number],
  AMBER:       [245, 158,  11] as [number, number, number],
  AMBER_BG:    [255, 251, 235] as [number, number, number],
  BLUE:        [59, 130, 246] as [number, number, number],
  BLUE_BG:     [239, 246, 255] as [number, number, number],
  GREEN:       [16, 185, 129] as [number, number, number],
  GREEN_BG:    [240, 253, 250] as [number, number, number],
  DARK:        [15,  23,  42] as [number, number, number],
  MID:         [51,  65,  85] as [number, number, number],
  GRAY:        [100, 116, 139] as [number, number, number],
  LIGHT:       [248, 250, 252] as [number, number, number],
  WHITE:       [255, 255, 255] as [number, number, number],
  PAGE_BG:     [252, 252, 255] as [number, number, number],
};

// ─── PDF ─────────────────────────────────────────────────────────────────────

export function generatePDF(result: CdrAnalysisResult, originalName: string): Uint8Array {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 297
  const H = doc.internal.pageSize.getHeight();  // 210

  const calls  = result.all_records.filter(r => r.usage_type === 'MOC' || r.usage_type === 'MTC');
  const sms    = result.all_records.filter(r => r.usage_type === 'SMSOC' || r.usage_type === 'SMSMT');
  const moc    = result.all_records.filter(r => r.usage_type === 'MOC').length;
  const mtc    = result.all_records.filter(r => r.usage_type === 'MTC').length;
  const smsoc  = result.all_records.filter(r => r.usage_type === 'SMSOC').length;
  const smsmt  = result.all_records.filter(r => r.usage_type === 'SMSMT').length;
  const totalDur = calls.reduce((s, r) => s + r.call_duration, 0);
  const uniqueB = new Set(result.all_records.map(r => r.bparty)).size;

  // ── Page 1: Cover ──────────────────────────────────────────────────────────
  doc.setFillColor(...C.PURPLE);
  doc.rect(0, 0, W, 55, 'F');

  // diagonal accent stripe
  doc.setFillColor(159, 122, 255);
  doc.triangle(W - 80, 0, W, 0, W, 55, 'F');
  doc.setFillColor(167, 139, 250);
  doc.triangle(W - 40, 0, W, 0, W, 30, 'F');

  // Logo/icon area
  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(18, 12, 28, 28, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('⚡', 25, 30);

  // Title
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('CDR Analysis Report', 52, 24);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 185, 255);
  doc.text('Call Detail Records — Intelligence Platform', 52, 34);
  doc.setFontSize(10);
  doc.setTextColor(180, 160, 255);
  doc.text(`Generated: ${nowStr()}`, 52, 44);

  // Metadata row
  doc.setFillColor(...C.LIGHT);
  doc.rect(0, 55, W, 22, 'F');
  doc.setDrawColor(220, 215, 250);
  doc.setLineWidth(0.3);
  doc.line(0, 77, W, 77);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.DARK);
  doc.text('File:', 20, 64);
  doc.text('A-Party:', 20, 72);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.MID);
  doc.text(originalName, 36, 64);
  doc.text(result.aparty, 40, 72);

  const rightX = W / 2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.DARK);
  doc.text('Total Records:', rightX, 64);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.MID);
  doc.text(result.total_records.toLocaleString(), rightX + 34, 64);

  // Stats cards
  const stats = [
    { label: 'Total Records', value: result.total_records.toLocaleString(), color: C.PURPLE, bg: C.PURPLE_BG },
    { label: 'Total Calls',   value: calls.length.toLocaleString(),          color: C.BLUE,   bg: C.BLUE_BG   },
    { label: 'Outgoing (MOC)',value: moc.toLocaleString(),                   color: C.GREEN,  bg: C.GREEN_BG  },
    { label: 'Incoming (MTC)',value: mtc.toLocaleString(),                   color: C.AMBER,  bg: C.AMBER_BG  },
    { label: 'Total SMS',     value: sms.length.toLocaleString(),            color: C.CYAN,   bg: C.CYAN_BG   },
    { label: 'Unique B-Parties', value: uniqueB.toLocaleString(),            color: C.PURPLE, bg: C.PURPLE_BG },
    { label: 'IMEI Count',    value: result.imei_table.length.toLocaleString(), color: C.BLUE, bg: C.BLUE_BG },
    { label: 'IMSI Count',    value: result.imsi_table.length.toLocaleString(), color: C.GREEN,bg: C.GREEN_BG },
  ];

  const cols = 4;
  const cardW = (W - 40) / cols;
  const cardH = 26;
  let cy = 82;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      const st = stats[row * cols + col];
      if (!st) continue;
      const cx = 20 + col * cardW;
      const cw = cardW - 5;

      doc.setFillColor(...st.bg);
      doc.roundedRect(cx, cy, cw, cardH, 3, 3, 'F');
      doc.setDrawColor(...st.color);
      doc.setLineWidth(0.6);
      doc.roundedRect(cx, cy, cw, cardH, 3, 3, 'S');

      // Left accent bar
      doc.setFillColor(...st.color);
      doc.roundedRect(cx, cy, 3, cardH, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(...st.color);
      doc.text(st.value, cx + cw / 2, cy + 13, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.GRAY);
      doc.text(st.label, cx + cw / 2, cy + 21, { align: 'center' });
    }
    cy += cardH + 4;
  }

  // Total call duration note
  doc.setFontSize(9);
  doc.setTextColor(...C.GRAY);
  doc.setFont('helvetica', 'italic');
  doc.text(`Total call duration: ${fmt(totalDur)}  ·  Outgoing SMS: ${smsoc}  ·  Incoming SMS: ${smsmt}`, W / 2, 168, { align: 'center' });

  // ── Page 2: IMEI & IMSI ───────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'IMEI & IMSI Analysis', W, C.PURPLE, 'Device & SIM Card Usage');

  autoTable(doc, {
    startY: 26,
    head: [['IMEI Number', 'Event Count']],
    body: result.imei_table.length > 0
      ? result.imei_table.map(r => [r.imei, r.events.toLocaleString()])
      : [['No IMEI data', '—']],
    theme: 'grid',
    headStyles: { fillColor: C.PURPLE, textColor: C.WHITE, fontStyle: 'bold', fontSize: 10, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: C.DARK, cellPadding: 3 },
    alternateRowStyles: { fillColor: C.PURPLE_BG },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
    margin: { left: 18, right: W / 2 + 4 },
    tableWidth: W / 2 - 22,
    didDrawPage: (data) => {
      if (data.pageNumber > 1) addPageHeader(doc, 'IMEI & IMSI Analysis', W, C.PURPLE, '');
    },
  });

  autoTable(doc, {
    startY: 26,
    head: [['IMSI Number', 'Event Count']],
    body: result.imsi_table.length > 0
      ? result.imsi_table.map(r => [r.imsi, r.events.toLocaleString()])
      : [['No IMSI data', '—']],
    theme: 'grid',
    headStyles: { fillColor: C.BLUE, textColor: C.WHITE, fontStyle: 'bold', fontSize: 10, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: C.DARK, cellPadding: 3 },
    alternateRowStyles: { fillColor: C.BLUE_BG },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
    margin: { left: W / 2 + 4, right: 18 },
    tableWidth: W / 2 - 22,
  });

  // ── Page 3: Stay Places ───────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Location Stay Analysis', W, C.AMBER, 'Top locations by time-of-day period');

  const stayPeriods = [
    { title: 'Day Stay Places (6:00am – 6:00pm)', rows: result.day_stay, color: C.AMBER, bg: C.AMBER_BG },
    { title: 'Evening Stay Places (6:00pm – 10:00pm)', rows: result.evening_stay, color: C.PURPLE, bg: C.PURPLE_BG },
    { title: 'Night Stay Places (10:00pm – 6:00am)', rows: result.night_stay, color: C.BLUE, bg: C.BLUE_BG },
  ];

  let sy = 26;
  for (const period of stayPeriods) {
    autoTable(doc, {
      startY: sy,
      head: [[{ content: period.title, colSpan: 3, styles: { halign: 'center', fontSize: 10 } }],
             ['Address / Location', 'LAC-CI', 'Event Count']],
      body: period.rows.length > 0
        ? period.rows.map((r, i) => [`${i + 1}. ${r.address || 'Unknown Location'}`, r.lac_ci, r.events.toLocaleString()])
        : [['No activity in this period', '—', '—']],
      theme: 'striped',
      headStyles: { fillColor: period.color, textColor: C.WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: C.DARK, cellPadding: 3 },
      alternateRowStyles: { fillColor: period.bg },
      columnStyles: { 1: { halign: 'center', cellWidth: 35 }, 2: { halign: 'center', cellWidth: 28, fontStyle: 'bold' } },
      margin: { left: 18, right: 18 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) addPageHeader(doc, 'Location Stay Analysis', W, C.AMBER, '');
        sy = 26;
      },
    });
    sy = (doc as any).lastAutoTable.finalY + 8;
    if (sy > H - 25) { doc.addPage(); addPageHeader(doc, 'Location Stay Analysis', W, C.AMBER, ''); sy = 26; }
  }

  // ── Page 4: Call List ──────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Call Analysis — B-Party Summary', W, C.GREEN, `${result.call_list.length} B-parties · Total duration: ${fmt(totalDur)}`);

  autoTable(doc, {
    startY: 26,
    head: [['#', 'B-Party Number', 'Total Events', 'Outgoing (MOC)', 'Incoming (MTC)', 'Total Duration', 'Avg Duration']],
    body: result.call_list.map((r, i) => [
      (i + 1).toString(),
      r.bparty,
      r.total_events.toLocaleString(),
      r.moc.toLocaleString(),
      r.mtc.toLocaleString(),
      fmt(r.total_duration_seconds),
      r.total_events > 0 ? fmt(Math.round(r.total_duration_seconds / r.total_events)) : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: C.GREEN, textColor: C.WHITE, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: C.DARK, cellPadding: 3 },
    alternateRowStyles: { fillColor: C.GREEN_BG },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, textColor: C.GRAY },
      1: { cellWidth: 52, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'center', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 30 },
      6: { halign: 'center', cellWidth: 30 },
    },
    margin: { left: 18, right: 18 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) addPageHeader(doc, 'Call Analysis — B-Party Summary', W, C.GREEN, '');
    },
  });

  // ── Page 5: SMS List ──────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'SMS Analysis — B-Party Summary', W, C.CYAN, `${result.sms_list.length} B-parties · Sent: ${smsoc} · Received: ${smsmt}`);

  autoTable(doc, {
    startY: 26,
    head: [['#', 'B-Party Number', 'Total Events', 'Sent (SMSOC)', 'Received (SMSMT)']],
    body: result.sms_list.map((r, i) => [
      (i + 1).toString(),
      r.bparty,
      r.total_events.toLocaleString(),
      r.smsoc.toLocaleString(),
      r.smsmt.toLocaleString(),
    ]),
    theme: 'striped',
    headStyles: { fillColor: C.CYAN, textColor: C.WHITE, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: C.DARK, cellPadding: 3 },
    alternateRowStyles: { fillColor: C.CYAN_BG },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14, textColor: C.GRAY },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
    margin: { left: 18, right: 18 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) addPageHeader(doc, 'SMS Analysis — B-Party Summary', W, C.CYAN, '');
    },
  });

  // ── Page 6: All Records ───────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Complete Call Detail Records', W, C.DARK, `${result.total_records.toLocaleString()} records total`);

  autoTable(doc, {
    startY: 26,
    head: [['Start Time', 'Type', 'B-Party', 'Duration', 'Network', 'IMEI', 'IMSI', 'Address']],
    body: result.all_records.map(r => [
      r.start.replace(/:/g, ' ').replace(/^(\d{4}) (\d{2}) (\d{2}) /, '$1-$2-$3 '),
      r.usage_type,
      r.bparty,
      r.call_duration > 0 ? fmt(r.call_duration) : '—',
      r.network_type,
      r.imei,
      r.imsi_a,
      r.address || '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: C.DARK, textColor: C.WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 7.5, textColor: C.DARK, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: C.LIGHT },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 38 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 18 },
      5: { cellWidth: 38 },
      6: { cellWidth: 38 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) addPageHeader(doc, 'Complete Call Detail Records', W, C.DARK, '');
    },
  });

  // ── Page numbers & footer ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Footer bar
    doc.setFillColor(245, 243, 255);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setDrawColor(...C.PURPLE_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(0, H - 10, W, H - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.GRAY);
    doc.text('CDR Intelligence Platform', 14, H - 4);
    doc.text(`A-Party: ${result.aparty}`, W / 2, H - 4, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, W - 14, H - 4, { align: 'right' });
  }

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

function addPageHeader(doc: jsPDF, title: string, W: number, color: [number,number,number], subtitle: string) {
  doc.setFillColor(...color);
  doc.rect(0, 0, W, 22, 'F');

  // accent stripe
  const lighter: [number,number,number] = [
    Math.min(255, color[0] + 40),
    Math.min(255, color[1] + 40),
    Math.min(255, color[2] + 40),
  ];
  doc.setFillColor(...lighter);
  doc.triangle(W - 50, 0, W, 0, W, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, 13);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(220, 210, 255);
    doc.text(subtitle, W - 14, 14, { align: 'right' });
  }
}

// ─── EXCEL ───────────────────────────────────────────────────────────────────

export function generateExcel(result: CdrAnalysisResult, originalName: string): Uint8Array {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ───────────────────────────────────────────────────────
  const calls  = result.all_records.filter(r => r.usage_type === 'MOC' || r.usage_type === 'MTC');
  const sms    = result.all_records.filter(r => r.usage_type === 'SMSOC' || r.usage_type === 'SMSMT');
  const moc    = result.all_records.filter(r => r.usage_type === 'MOC').length;
  const mtc    = result.all_records.filter(r => r.usage_type === 'MTC').length;
  const smsoc  = result.all_records.filter(r => r.usage_type === 'SMSOC').length;
  const smsmt  = result.all_records.filter(r => r.usage_type === 'SMSMT').length;
  const totalDur = calls.reduce((s, r) => s + r.call_duration, 0);
  const uniqueB = new Set(result.all_records.map(r => r.bparty)).size;

  const summaryRows = [
    ['CDR ANALYSIS REPORT'],
    [''],
    ['Field', 'Value'],
    ['File', originalName],
    ['A-Party Number', result.aparty],
    ['Generated', nowStr()],
    [''],
    ['METRIC', 'VALUE'],
    ['Total Records', result.total_records],
    ['Total Calls', calls.length],
    ['Outgoing Calls (MOC)', moc],
    ['Incoming Calls (MTC)', mtc],
    ['Total SMS', sms.length],
    ['Sent SMS (SMSOC)', smsoc],
    ['Received SMS (SMSMT)', smsmt],
    ['Total Call Duration (seconds)', totalDur],
    ['Total Call Duration', fmt(totalDur)],
    ['Unique B-Parties', uniqueB],
    ['Unique IMEIs', result.imei_table.length],
    ['Unique IMSIs', result.imsi_table.length],
  ];
  addSheet(wb, 'Summary', summaryRows);

  // ── Sheet 2: IMEI & IMSI ──────────────────────────────────────────────────
  const imeiRows: (string | number)[][] = [
    ['IMEI & IMSI ANALYSIS'],
    [''],
    ['IMEI', 'Event Count'],
    ...result.imei_table.map(r => [r.imei, r.events]),
    [''],
    ['IMSI', 'Event Count'],
    ...result.imsi_table.map(r => [r.imsi, r.events]),
  ];
  addSheet(wb, 'IMEI_IMSI', imeiRows);

  // ── Sheet 3: Stay Places ──────────────────────────────────────────────────
  const stayRows: (string | number)[][] = [
    ['LOCATION STAY ANALYSIS'],
    [''],
    ['Period', 'Rank', 'Address / Location', 'LAC-CI', 'Event Count'],
    ...result.day_stay.map((r, i) => ['Day (6am–6pm)', i + 1, r.address || 'Unknown', r.lac_ci, r.events]),
    ...result.evening_stay.map((r, i) => ['Evening (6pm–10pm)', i + 1, r.address || 'Unknown', r.lac_ci, r.events]),
    ...result.night_stay.map((r, i) => ['Night (10pm–6am)', i + 1, r.address || 'Unknown', r.lac_ci, r.events]),
  ];
  addSheet(wb, 'Stay_Places', stayRows);

  // ── Sheet 4: Call List ────────────────────────────────────────────────────
  const callRows: (string | number)[][] = [
    ['CALL ANALYSIS — B-PARTY SUMMARY'],
    [''],
    ['#', 'B-Party', 'Total Events', 'Outgoing (MOC)', 'Incoming (MTC)', 'Total Duration (s)', 'Total Duration'],
    ...result.call_list.map((r, i) => [
      i + 1, r.bparty, r.total_events, r.moc, r.mtc,
      r.total_duration_seconds, fmt(r.total_duration_seconds),
    ]),
  ];
  addSheet(wb, 'Call_List', callRows);

  // ── Sheet 5: SMS List ─────────────────────────────────────────────────────
  const smsRows: (string | number)[][] = [
    ['SMS ANALYSIS — B-PARTY SUMMARY'],
    [''],
    ['#', 'B-Party', 'Total Events', 'Sent (SMSOC)', 'Received (SMSMT)'],
    ...result.sms_list.map((r, i) => [i + 1, r.bparty, r.total_events, r.smsoc, r.smsmt]),
  ];
  addSheet(wb, 'SMS_List', smsRows);

  // ── Sheet 6: All Records ──────────────────────────────────────────────────
  const recRows: (string | number)[][] = [
    ['COMPLETE CALL DETAIL RECORDS'],
    [''],
    ['#', 'Start Time', 'Usage Type', 'B-Party', 'Duration (s)', 'Duration', 'Network', 'IMEI', 'IMSI', 'Address'],
    ...result.all_records.map((r, i) => [
      i + 1, r.start, r.usage_type, r.bparty,
      r.call_duration, fmt(r.call_duration),
      r.network_type, r.imei, r.imsi_a, r.address || '—',
    ]),
  ];
  addSheet(wb, 'All_Records', recRows);

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(buf);
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-width columns
  const colWidths: number[] = rows.reduce((acc: number[], row) => {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      acc[i] = Math.min(Math.max(acc[i] ?? 10, len + 2), 60);
    });
    return acc;
  }, []);
  ws['!cols'] = colWidths.map((w: number) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function generateCSV(result: CdrAnalysisResult): Uint8Array {
  const headers = [
    'Start Time', 'Usage Type', 'B-Party', 'A-Party',
    'Call Duration (s)', 'Call Duration', 'Network Type',
    'IMEI', 'IMSI', 'LAC', 'CI', 'MCC', 'MNC', 'Address',
  ];

  const rows: string[][] = result.all_records.map((r: CdrRecord) => [
    r.start,
    r.usage_type,
    r.bparty,
    r.aparty,
    String(r.call_duration),
    fmt(r.call_duration),
    r.network_type,
    r.imei,
    r.imsi_a,
    r.lac_start_a,
    r.ci_start_a,
    r.mcc_start_a,
    r.mnc_start_a,
    r.address || '',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  return new TextEncoder().encode('﻿' + csv); // BOM for Excel compatibility
}

// ─── Save wrapper ─────────────────────────────────────────────────────────────

export async function exportPDF(result: CdrAnalysisResult, originalName: string): Promise<boolean> {
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const data = generatePDF(result, originalName);
  return saveFile(data, `${baseName}_CDR_Report.pdf`, 'pdf', 'PDF Report');
}

export async function exportExcel(result: CdrAnalysisResult, originalName: string): Promise<boolean> {
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const data = generateExcel(result, originalName);
  return saveFile(data, `${baseName}_CDR_Report.xlsx`, 'xlsx', 'Excel Workbook');
}

export async function exportCSV(result: CdrAnalysisResult, originalName: string): Promise<boolean> {
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const data = generateCSV(result);
  return saveFile(data, `${baseName}_CDR_Records.csv`, 'csv', 'CSV File');
}
