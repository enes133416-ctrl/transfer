import {
  TransferRow,
  RouteType,
  RoutePhraseConfig,
  DEFAULT_ROUTE_PHRASES,
} from '../types/transfer';

const TURKISH_MONTHS_LOWER = [
  'ocak',
  'şubat',
  'mart',
  'nisan',
  'mayıs',
  'haziran',
  'temmuz',
  'ağustos',
  'eylül',
  'ekim',
  'kasım',
  'aralık',
];

const TURKISH_DAYS_LOWER = [
  'pazar',
  'pazartesi',
  'salı',
  'çarşamba',
  'perşembe',
  'cuma',
  'cumartesi',
];

const TURKISH_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/**
 * Parses either YYYY-MM-DD or DD.MM.YYYY into { year, month (1-12), day (1-31), weekday (0-6) }
 */
export function parseTransferDate(dateStr: string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} | null {
  if (!dateStr || !dateStr.trim()) return null;
  const clean = dateStr.trim();

  // YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return { year, month, day, weekday: d.getDay() };
    }
  }

  // DD.MM.YYYY or DD/MM/YYYY
  const trMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (trMatch) {
    const day = parseInt(trMatch[1], 10);
    const month = parseInt(trMatch[2], 10);
    const year = parseInt(trMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return { year, month, day, weekday: d.getDay() };
    }
  }

  return null;
}

/**
 * Converts DD.MM.YYYY to YYYY-MM-DD for HTML date input
 */
export function toIsoDateString(input: string): string {
  const parsed = parseTransferDate(input);
  if (!parsed) return input;
  const mm = String(parsed.month).padStart(2, '0');
  const dd = String(parsed.day).padStart(2, '0');
  return `${parsed.year}-${mm}-${dd}`;
}

/**
 * Formats date for display in table: "05.05.2025 Pzt"
 */
export function formatDisplayDate(dateStr: string): {
  ddmmyyyy: string;
  dayNameShort: string;
  dayAndMonthNoYear: string;
} {
  const parsed = parseTransferDate(dateStr);
  if (!parsed) {
    return {
      ddmmyyyy: dateStr || '-',
      dayNameShort: '',
      dayAndMonthNoYear: dateStr || '',
    };
  }
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  const monthName = TURKISH_MONTHS_LOWER[parsed.month - 1] || '';
  const dayName = TURKISH_DAYS_LOWER[parsed.weekday] || '';
  const dayShort = TURKISH_DAYS_SHORT[parsed.weekday] || '';

  return {
    ddmmyyyy: `${dd}.${mm}.${parsed.year}`,
    dayNameShort: dayShort,
    dayAndMonthNoYear: `${parsed.day} ${monthName} ${dayName}`,
  };
}

/**
 * Normalizes time string: "10:45:00" -> "10:45", "9:5" -> "09:05"
 */
export function normalizeTime(saat: string): string {
  if (!saat || !saat.trim()) return '';
  const clean = saat.trim();
  const match = clean.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
  }
  return clean;
}

/**
 * Splits guest names if more than 1 guest is entered (by newline, slash, comma, semicolon, "and", "ve", "&")
 * and returns an array of individual trimmed guest names.
 */
export function splitGuestNames(rawNames: string): string[] {
  if (!rawNames || !rawNames.trim()) return [];
  return rawNames
    .split(/\r?\n|\/|,|;|\band\b|\bve\b|&/gi)
    .map((name) => name.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
}

/**
 * Joins guest names with "/" separator if more than 1 name exists.
 * Example: ["Graham Philp", "Denise Phil"] -> "Graham Philp/Denise Phil"
 * Example: ["xxxx", "yyyy", "zzzz"] -> "xxxx/yyyy/zzzz"
 */
export function formatGuestNamesForCopy(rawNames: string): string {
  const names = splitGuestNames(rawNames);
  if (names.length === 0) return '';
  return names.join('/');
}

/**
 * Infers RouteType from cikis and varis strings (e.g., from old Excel "dekalb" -> "saw")
 */
export function inferRouteType(cikis: string, varis: string): RouteType {
  const c = (cikis || '').trim().toLowerCase();
  const v = (varis || '').trim().toLowerCase();

  const isHotel = (s: string) =>
    s.includes('dekalb') || s.includes('otel') || s.includes('hotel');
  const isSaw = (s: string) => s.includes('saw') || s.includes('sabiha');
  const isIst = (s: string) => s.includes('ist') || s.includes('istanbul');

  if (isHotel(c) && isSaw(v)) return 'OTEL_SAW';
  if (isHotel(c) && isIst(v)) return 'OTEL_IST';
  if (isSaw(c) && isHotel(v)) return 'SAW_OTEL';
  if (isIst(c) && isHotel(v)) return 'IST_OTEL';
  return 'DIGER';
}

/**
 * Returns default cikis & varis codes for a given RouteType
 */
export function getRouteEndpoints(yon: RouteType, currentCikis = '', currentVaris = ''): {
  cikis: string;
  varis: string;
} {
  switch (yon) {
    case 'OTEL_SAW':
      return { cikis: 'dekalb', varis: 'saw' };
    case 'OTEL_IST':
      return { cikis: 'dekalb', varis: 'ist' };
    case 'SAW_OTEL':
      return { cikis: 'saw', varis: 'dekalb' };
    case 'IST_OTEL':
      return { cikis: 'ist', varis: 'dekalb' };
    case 'DIGER':
    default:
      return {
        cikis: currentCikis || 'dekalb',
        varis: currentVaris || 'saw',
      };
  }
}

/**
 * Returns the route phrase for copy text:
 * e.g. "otelden sabihaya", "otelden istanbul havalimanına", "sabihadan otele", "istanbul havalimanından otele"
 */
export function getRoutePhraseForCopy(
  row: Pick<TransferRow, 'yon' | 'cikis' | 'varis'>,
  phrases: RoutePhraseConfig = DEFAULT_ROUTE_PHRASES
): string {
  if (row.yon && row.yon !== 'DIGER' && phrases[row.yon]) {
    return phrases[row.yon];
  }
  const inferred = inferRouteType(row.cikis, row.varis);
  if (inferred !== 'DIGER') {
    return phrases[inferred];
  }
  const c = (row.cikis || '').trim();
  const v = (row.varis || '').trim();
  if (c && v) return `${c} - ${v}`;
  return c || v || '';
}

/**
 * Generates the exact requested copy text for a transfer row:
 *
 * Format:
 * 25 ekim pazar saat 18:30 xxxx/yyyy/zzzz
 *
 * otelden sabihaya 3 kişi  uçuş kodu crty15
 *
 * numara +9999999999
 *
 * Strictly includes ONLY:
 * 1) Date (day + month + weekday, NO year) + time + guest names separated by "/"
 * 2) Where from/to + passenger count + flight code
 * 3) Phone number
 */
export function generateTransferCopyText(
  row: TransferRow,
  phrases: RoutePhraseConfig = DEFAULT_ROUTE_PHRASES
): string {
  const { dayAndMonthNoYear } = formatDisplayDate(row.tarih);
  const cleanTime = normalizeTime(row.saat);
  const formattedGuests = formatGuestNamesForCopy(row.misafirIsmi);

  // Line 1: "25 ekim pazar saat 18:30 xxxx/yyyy/zzzz"
  const line1Parts: string[] = [];
  if (dayAndMonthNoYear) line1Parts.push(dayAndMonthNoYear);
  if (cleanTime) line1Parts.push(`saat ${cleanTime}`);
  if (formattedGuests) line1Parts.push(formattedGuests);
  const line1 = line1Parts.join(' ');

  // Line 2: "otelden sabihaya 3 kişi  uçuş kodu crty15"
  const routePhrase = getRoutePhraseForCopy(row, phrases);
  const paxText = `${row.kisiSayisi || 1} kişi`;
  const flightClean = (row.ucusNo || '').trim();
  const line2 = flightClean
    ? `${routePhrase} ${paxText}  uçuş kodu ${flightClean}`
    : `${routePhrase} ${paxText}`;

  // Line 3: "numara +9999999999"
  const phoneClean = (row.cepNumarasi || '').trim();
  const line3 = `numara ${phoneClean || '-'}`;

  return `${line1}\n\n${line2}\n\n${line3}`;
}
