// Intelligent column detection + phone normalization + duplicate grouping

const NAME_HEADER_PATTERNS = [
  'name', 'customer name', 'owner name', 'full name', 'client name',
  'contact name', 'person name', 'cust name', 'customer', 'owner',
  'client', 'contact', 'person', 'applicant name', 'applicant',
];

const PHONE_HEADER_PATTERNS = [
  'phone', 'phone number', 'number', 'mobile', 'mobile number',
  'contact number', 'cell', 'cell number', 'tel', 'telephone',
  'phone no', 'mob', 'mob no', 'whatsapp', 'whatsapp number',
];

export interface ExtractedContact {
  name: string;
  phone: string;
  normalizedPhone: string;
  normalizedName: string;
  rowIndex: number;
}

export interface ContactGroup {
  key: string;
  matchType: 'phone' | 'name';
  contacts: ExtractedContact[];
}

export interface ExtractionResult {
  nameColumn: string | null;
  phoneColumn: string | null;
  totalRows: number;
  uniqueContacts: ExtractedContact[];
  duplicateGroups: ContactGroup[];
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_\-.]/g, ' ').replace(/\s+/g, ' ');
}

function scoreHeaderMatch(header: string, patterns: string[]): number {
  const normalized = normalizeHeader(header);
  let best = 0;
  for (const pattern of patterns) {
    if (normalized === pattern) return 100;
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      best = Math.max(best, 70);
    }
    // word-level overlap
    const headerWords = normalized.split(' ');
    const patternWords = pattern.split(' ');
    const overlap = headerWords.filter(w => patternWords.includes(w)).length;
    if (overlap > 0) best = Math.max(best, 40 + overlap * 10);
  }
  return best;
}

function detectColumn(headers: string[], patterns: string[]): { index: number; name: string } | null {
  let bestIdx = -1;
  let bestScore = 0;
  headers.forEach((h, i) => {
    const score = scoreHeaderMatch(h, patterns);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });
  if (bestIdx === -1 || bestScore < 30) return null;
  return { index: bestIdx, name: headers[bestIdx] };
}

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  // strip everything except digits
  let digits = raw.replace(/\D/g, '');
  // remove leading country code variants for Bangladesh/India/generic +XX
  if (digits.length > 10) {
    // common case: 880XXXXXXXXXX (BD) or 91XXXXXXXXXX (IN) etc.
    // keep last 10 digits as the canonical comparable number
    digits = digits.slice(-10);
  }
  return digits;
}

export function normalizeName(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function extractContacts(rows: string[][]): ExtractionResult {
  if (rows.length === 0) {
    return {
      nameColumn: null,
      phoneColumn: null,
      totalRows: 0,
      uniqueContacts: [],
      duplicateGroups: [],
    };
  }

  const headers = rows[0].map(h => (h ?? '').toString());
  const dataRows = rows.slice(1);

  const nameMatch = detectColumn(headers, NAME_HEADER_PATTERNS);
  const phoneMatch = detectColumn(headers, PHONE_HEADER_PATTERNS);

  const contacts: ExtractedContact[] = dataRows
    .map((row, idx) => {
      const name = nameMatch ? (row[nameMatch.index] ?? '').toString().trim() : '';
      const phone = phoneMatch ? (row[phoneMatch.index] ?? '').toString().trim() : '';
      return {
        name,
        phone,
        normalizedName: normalizeName(name),
        normalizedPhone: normalizePhone(phone),
        rowIndex: idx,
      };
    })
    .filter(c => c.name || c.phone); // skip fully empty rows

  // Group by normalized phone first, then by normalized name for rows with no phone
  const phoneGroups = new Map<string, ExtractedContact[]>();
  const nameGroups = new Map<string, ExtractedContact[]>();
  const seen = new Set<number>(); // rowIndex already placed in a phone group

  contacts.forEach(c => {
    if (c.normalizedPhone && c.normalizedPhone.length >= 6) {
      const list = phoneGroups.get(c.normalizedPhone) || [];
      list.push(c);
      phoneGroups.set(c.normalizedPhone, list);
      seen.add(c.rowIndex);
    }
  });

  contacts.forEach(c => {
    if (!seen.has(c.rowIndex) && c.normalizedName) {
      const list = nameGroups.get(c.normalizedName) || [];
      list.push(c);
      nameGroups.set(c.normalizedName, list);
    }
  });

  const duplicateGroups: ContactGroup[] = [];
  const uniqueContacts: ExtractedContact[] = [];

  phoneGroups.forEach((list, key) => {
    if (list.length > 1) {
      duplicateGroups.push({ key, matchType: 'phone', contacts: list });
    } else {
      uniqueContacts.push(list[0]);
    }
  });

  nameGroups.forEach((list, key) => {
    if (list.length > 1) {
      duplicateGroups.push({ key, matchType: 'name', contacts: list });
    } else {
      uniqueContacts.push(list[0]);
    }
  });

  // sort duplicate groups by size desc
  duplicateGroups.sort((a, b) => b.contacts.length - a.contacts.length);

  return {
    nameColumn: nameMatch?.name ?? null,
    phoneColumn: phoneMatch?.name ?? null,
    totalRows: dataRows.length,
    uniqueContacts,
    duplicateGroups,
  };
}