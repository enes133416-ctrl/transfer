import * as XLSX from 'xlsx';
import {
  TransferRow,
  RoutePhraseConfig,
  DEFAULT_ROUTE_PHRASES,
  CurrencyCode,
} from '../types/transfer';
import {
  formatDisplayDate,
  generateTransferCopyText,
  inferRouteType,
  normalizeTime,
  toIsoDateString,
  getRouteEndpoints,
} from './formatters';

const ROUTE_LABELS: Record<string, string> = {
  OTEL_SAW: 'Gidiş: Otel ➔ SAW (Sabiha Gökçen)',
  OTEL_IST: 'Gidiş: Otel ➔ IST (İstanbul Havalimanı)',
  SAW_OTEL: 'Geliş: SAW (Sabiha Gökçen) ➔ Otel',
  IST_OTEL: 'Geliş: IST (İstanbul Havalimanı) ➔ Otel',
  DIGER: 'Diğer / Özel Güzergah',
};

export function exportTransfersToExcel(
  rows: TransferRow[],
  phrases: RoutePhraseConfig = DEFAULT_ROUTE_PHRASES
) {
  const worksheetData = rows.map((row, idx) => {
    const { ddmmyyyy, dayNameShort } = formatDisplayDate(row.tarih);
    const copyText = generateTransferCopyText(row, phrases);

    return {
      'SIRA': idx + 1,
      'TARİH': ddmmyyyy,
      'GÜN': dayNameShort,
      'SAAT': normalizeTime(row.saat),
      'ODA NO': row.odaNo,
      'MİSAFİR İSİMLERİ': row.misafirIsmi.replace(/\r?\n/g, ' / '),
      'YÖN / GÜZERGAH': ROUTE_LABELS[row.yon] || `${row.cikis} ➔ ${row.varis}`,
      'ÇIKIŞ': row.cikis,
      'VARIŞ': row.varis,
      'KİŞİ': row.kisiSayisi,
      'UÇUŞ NO': row.ucusNo,
      'CEP NUMARASI': row.cepNumarasi,
      'MİSAFİRDEN ALINACAK TUTAR': row.misafirTutar,
      'MİSAFİR DÖVİZ': row.misafirParaBirimi,
      'MİSAFİR ÖDEME DURUMU': row.misafirOdemeAlindi ? 'ALINDI (YEŞİL)' : 'ALINMADI (KIRMIZI)',
      'TAYFUNA ÖDENECEK TUTAR': row.tayfunTutar,
      'TAYFUN DÖVİZ': row.tayfunParaBirimi,
      'TAYFUN ÖDEME DURUMU': row.tayfunOdemeYapildi ? 'YAPILDI (YEŞİL)' : 'YAPILMADI (KIRMIZI)',
      'KOPYALANACAK TRANSFER DETAYI': copyText,
      'NOT': row.not,
    };
  });

  const ws = XLSX.utils.json_to_sheet(worksheetData);

  // Set generous column widths (especially Misafir İsimleri, Kopyalanacak Metin, and Not)
  ws['!cols'] = [
    { wch: 6 },  // SIRA
    { wch: 13 }, // TARİH
    { wch: 7 },  // GÜN
    { wch: 9 },  // SAAT
    { wch: 9 },  // ODA NO
    { wch: 36 }, // MİSAFİR İSİMLERİ (Geniş)
    { wch: 32 }, // YÖN / GÜZERGAH
    { wch: 10 }, // ÇIKIŞ
    { wch: 10 }, // VARIŞ
    { wch: 7 },  // KİŞİ
    { wch: 12 }, // UÇUŞ NO
    { wch: 20 }, // CEP NUMARASI
    { wch: 18 }, // MİSAFİRDEN ALINACAK
    { wch: 10 }, // DÖVİZ
    { wch: 22 }, // MİSAFİR ÖDEME DURUMU
    { wch: 18 }, // TAYFUNA ÖDENECEK
    { wch: 10 }, // DÖVİZ
    { wch: 22 }, // TAYFUN ÖDEME DURUMU
    { wch: 48 }, // KOPYALANACAK TRANSFER DETAYI
    { wch: 35 }, // NOT
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transfer Takip');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Transfer_Takip_Listesi_${today}.xlsx`);
}

export async function importTransfersFromExcel(file: File): Promise<TransferRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const imported: TransferRow[] = [];

  rawRows.forEach((raw, idx) => {
    // Normalize keys by uppercase trimmed
    const norm: Record<string, string> = {};
    Object.entries(raw).forEach(([k, v]) => {
      const key = k.trim().toUpperCase();
      if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        norm[key] = `${y}-${m}-${d}`;
      } else {
        norm[key] = String(v ?? '').trim();
      }
    });

    const tarihRaw = norm['TARİH'] || norm['TARIH'] || norm['DATE'] || '';
    const misafirRaw =
      norm['MİSAFİR İSİMLERİ'] ||
      norm['MİSAFİR İSMİ'] ||
      norm['İSİM'] ||
      norm['ISIM'] ||
      norm['MISAFIR'] ||
      '';

    if (!tarihRaw && !misafirRaw) return;

    const cikis = norm['ÇIKIŞ'] || norm['CIKIS'] || 'dekalb';
    const varis = norm['VARIŞ'] || norm['VARIS'] || 'saw';
    const yon = inferRouteType(cikis, varis);
    const endpoints = getRouteEndpoints(yon, cikis, varis);

    const saatRaw = norm['SAAT'] || norm['TIME'] || '';
    const ucusNo = norm['UÇUŞ NO'] || norm['UCUS NO'] || norm['UÇUŞ KODU'] || '';
    const cepNumarasi =
      norm['CEP NUMARASI'] || norm['MİSAFİR NUMARASI'] || norm['TELEFON'] || norm['NUMARA'] || '';
    const kisiSayisi = parseInt(norm['KİŞİ'] || norm['KISI'] || '1', 10) || 1;
    const odaNo = norm['ODA NO'] || norm['ODA'] || '';

    const misafirTutar =
      parseFloat(norm['MİSAFİRDEN ALINACAK TUTAR'] || norm['MİSAFİR TUTAR'] || '0') || 0;
    const misafirParaBirimi = ((norm['MİSAFİR DÖVİZ'] || 'EUR').toUpperCase() as CurrencyCode) || 'EUR';
    const misafirDurumStr = (norm['MİSAFİR ÖDEME DURUMU'] || '').toUpperCase();
    const misafirOdemeAlindi =
      misafirDurumStr.includes('ALINDI') && !misafirDurumStr.includes('ALINMADI');

    const tayfunTutar =
      parseFloat(norm['TAYFUNA ÖDENECEK TUTAR'] || norm['TAYFUN TUTAR'] || '0') || 0;
    const tayfunParaBirimi = ((norm['TAYFUN DÖVİZ'] || 'EUR').toUpperCase() as CurrencyCode) || 'EUR';
    const tayfunDurumStr = (norm['TAYFUN ÖDEME DURUMU'] || '').toUpperCase();
    const tayfunOdemeYapildi =
      (tayfunDurumStr.includes('YAPILDI') && !tayfunDurumStr.includes('YAPILMADI')) ||
      (tayfunDurumStr.includes('ÖDENDİ') && !tayfunDurumStr.includes('ÖDENMEDİ'));

    const not = norm['NOT'] || norm['NOTLAR'] || norm['AÇIKLAMA'] || '';

    imported.push({
      id: `imp-${Date.now()}-${idx}`,
      tarih: toIsoDateString(tarihRaw) || new Date().toISOString().slice(0, 10),
      saat: normalizeTime(saatRaw),
      odaNo,
      misafirIsmi: misafirRaw,
      yon,
      cikis: endpoints.cikis,
      varis: endpoints.varis,
      kisiSayisi,
      ucusNo,
      cepNumarasi,
      misafirTutar,
      misafirParaBirimi: ['EUR', 'TRY', 'USD', 'GBP'].includes(misafirParaBirimi)
        ? misafirParaBirimi
        : 'EUR',
      misafirOdemeAlindi,
      tayfunTutar,
      tayfunParaBirimi: ['EUR', 'TRY', 'USD', 'GBP'].includes(tayfunParaBirimi)
        ? tayfunParaBirimi
        : 'EUR',
      tayfunOdemeYapildi,
      not,
    });
  });

  return imported;
}
