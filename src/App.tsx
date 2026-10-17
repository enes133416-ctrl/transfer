import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PlaneTakeoff,
  PlaneLanding,
  Copy,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Wallet,
  Users,
  FileSpreadsheet,
  RotateCcw,
  Eye,
  Settings2,
  CopyPlus,
  StickyNote,
  Phone,
  DoorOpen,
  Calendar,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import {
  TransferRow,
  RouteType,
  CurrencyCode,
  CURRENCY_SYMBOLS,
  RoutePhraseConfig,
  DEFAULT_ROUTE_PHRASES,
} from './types/transfer';
import { INITIAL_TRANSFERS } from './data/initialTransfers';
import {
  formatDisplayDate,
  formatGuestNamesForCopy,
  generateTransferCopyText,
  getRouteEndpoints,
  splitGuestNames,
} from './utils/formatters';
import {
  exportTransfersToExcel,
  importTransfersFromExcel,
} from './utils/excelService';

const STORAGE_KEY = 'dekalb_transfer_rows_v2';
const PHRASE_STORAGE_KEY = 'dekalb_transfer_phrases_v2';

type PaymentFilter = 'ALL' | 'MISAFIR_UNPAID' | 'MISAFIR_PAID' | 'TAYFUN_UNPAID' | 'TAYFUN_PAID';
type RouteFilter = 'ALL' | 'OTEL_SAW' | 'OTEL_IST' | 'SAW_OTEL' | 'IST_OTEL';

export function App() {
  const [rows, setRows] = useState<TransferRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_TRANSFERS;
  });

  const [routePhrases, setRoutePhrases] = useState<RoutePhraseConfig>(() => {
    try {
      const saved = localStorage.getItem(PHRASE_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_ROUTE_PHRASES, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_ROUTE_PHRASES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('ALL');
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [lastCopiedText, setLastCopiedText] = useState<string | null>(null);
  const [lastCopiedGuest, setLastCopiedGuest] = useState<string>('');
  const [previewRowId, setPreviewRowId] = useState<string | null>(null);
  const [showPhraseSettings, setShowPhraseSettings] = useState(false);
  const [rowTintEnabled, setRowTintEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // ignore
    }
  }, [rows]);

  useEffect(() => {
    try {
      localStorage.setItem(PHRASE_STORAGE_KEY, JSON.stringify(routePhrases));
    } catch {
      // ignore
    }
  }, [routePhrases]);

  const updateRow = <K extends keyof TransferRow>(
    id: string,
    field: K,
    value: TransferRow[K]
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === 'yon') {
          const endpoints = getRouteEndpoints(value as RouteType, row.cikis, row.varis);
          updated.cikis = endpoints.cikis;
          updated.varis = endpoints.varis;
        }
        return updated;
      })
    );
  };

  const addNewRow = (position: 'top' | 'bottom' = 'bottom') => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const newRow: TransferRow = {
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tarih: todayIso,
      saat: '14:00',
      odaNo: '',
      misafirIsmi: '',
      yon: 'OTEL_SAW',
      cikis: 'dekalb',
      varis: 'saw',
      kisiSayisi: 2,
      ucusNo: '',
      cepNumarasi: '+',
      misafirTutar: 55,
      misafirParaBirimi: 'EUR',
      misafirOdemeAlindi: false,
      tayfunTutar: 40,
      tayfunParaBirimi: 'EUR',
      tayfunOdemeYapildi: false,
      not: '',
    };

    setRows((prev) => (position === 'top' ? [newRow, ...prev] : [...prev, newRow]));
  };

  const duplicateRow = (row: TransferRow) => {
    const copy: TransferRow = {
      ...row,
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx === -1) return [...prev, copy];
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (previewRowId === id) setPreviewRowId(null);
  };

  const handleCopyTransfer = async (row: TransferRow) => {
    const text = generateTransferCopyText(row, routePhrases);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedRowId(row.id);
    setLastCopiedText(text);
    setLastCopiedGuest(formatGuestNamesForCopy(row.misafirIsmi) || 'Misafir');
    setTimeout(() => {
      setCopiedRowId((prev) => (prev === row.id ? null : prev));
    }, 2800);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importTransfersFromExcel(file);
      if (imported.length > 0) {
        setRows((prev) => [...prev, ...imported]);
      }
    } catch (err) {
      console.error('Excel içe aktarma hatası:', err);
      alert('Excel dosyası okunurken bir hata oluştu. Lütfen geçerli bir .xlsx veya .csv dosyası seçin.');
    } finally {
      e.target.value = '';
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('Tabloyu ilk örnek verilere (görseldeki 7 transfere) sıfırlamak istiyor musunuz?')) {
      setRows(INITIAL_TRANSFERS);
      setLastCopiedText(null);
    }
  };

  const handleMarkAllTayfunPaid = () => {
    setRows((prev) => prev.map((r) => ({ ...r, tayfunOdemeYapildi: true })));
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (paymentFilter === 'MISAFIR_UNPAID' && row.misafirOdemeAlindi) return false;
      if (paymentFilter === 'MISAFIR_PAID' && !row.misafirOdemeAlindi) return false;
      if (paymentFilter === 'TAYFUN_UNPAID' && row.tayfunOdemeYapildi) return false;
      if (paymentFilter === 'TAYFUN_PAID' && !row.tayfunOdemeYapildi) return false;

      if (routeFilter !== 'ALL' && row.yon !== routeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const { ddmmyyyy, dayAndMonthNoYear } = formatDisplayDate(row.tarih);
        const haystack = [
          row.misafirIsmi,
          row.odaNo,
          row.ucusNo,
          row.cepNumarasi,
          row.not,
          row.cikis,
          row.varis,
          ddmmyyyy,
          dayAndMonthNoYear,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [rows, paymentFilter, routeFilter, searchQuery]);

  // Financial & Operational Summary (grouped by currency)
  const stats = useMemo(() => {
    const byCurrency: Record<
      CurrencyCode,
      {
        misafirAlindi: number;
        misafirBekleyen: number;
        misafirToplam: number;
        tayfunOdendi: number;
        tayfunBekleyen: number;
        tayfunToplam: number;
      }
    > = {
      EUR: { misafirAlindi: 0, misafirBekleyen: 0, misafirToplam: 0, tayfunOdendi: 0, tayfunBekleyen: 0, tayfunToplam: 0 },
      TRY: { misafirAlindi: 0, misafirBekleyen: 0, misafirToplam: 0, tayfunOdendi: 0, tayfunBekleyen: 0, tayfunToplam: 0 },
      USD: { misafirAlindi: 0, misafirBekleyen: 0, misafirToplam: 0, tayfunOdendi: 0, tayfunBekleyen: 0, tayfunToplam: 0 },
      GBP: { misafirAlindi: 0, misafirBekleyen: 0, misafirToplam: 0, tayfunOdendi: 0, tayfunBekleyen: 0, tayfunToplam: 0 },
    };

    let misafirUnpaidCount = 0;
    let misafirPaidCount = 0;
    let tayfunUnpaidCount = 0;
    let tayfunPaidCount = 0;
    let totalPax = 0;

    rows.forEach((r) => {
      totalPax += Number(r.kisiSayisi) || 0;
      const mAmt = Number(r.misafirTutar) || 0;
      const mCurr = r.misafirParaBirimi || 'EUR';
      byCurrency[mCurr].misafirToplam += mAmt;
      if (r.misafirOdemeAlindi) {
        byCurrency[mCurr].misafirAlindi += mAmt;
        misafirPaidCount++;
      } else {
        byCurrency[mCurr].misafirBekleyen += mAmt;
        misafirUnpaidCount++;
      }

      const tAmt = Number(r.tayfunTutar) || 0;
      const tCurr = r.tayfunParaBirimi || 'EUR';
      byCurrency[tCurr].tayfunToplam += tAmt;
      if (r.tayfunOdemeYapildi) {
        byCurrency[tCurr].tayfunOdendi += tAmt;
        tayfunPaidCount++;
      } else {
        byCurrency[tCurr].tayfunBekleyen += tAmt;
        tayfunUnpaidCount++;
      }
    });

    // Active currencies (default at least EUR)
    const activeCurrencies = (Object.keys(byCurrency) as CurrencyCode[]).filter(
      (c) => c === 'EUR' || byCurrency[c].misafirToplam > 0 || byCurrency[c].tayfunToplam > 0
    );

    return {
      byCurrency,
      activeCurrencies,
      misafirUnpaidCount,
      misafirPaidCount,
      tayfunUnpaidCount,
      tayfunPaidCount,
      totalPax,
      totalTransfers: rows.length,
    };
  }, [rows]);

  const previewRow = useMemo(
    () => rows.find((r) => r.id === previewRowId) || null,
    [rows, previewRowId]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Otel Transfer & Tayfun Hesap Takip Tablosu
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Gelişmiş Excel v2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Otel ⇄ SAW / IST Güzergah • Misafir & Tayfun Ödeme Durumu (Yeşil/Kırmızı) • Tek Tıkla WhatsApp/Mesaj Kopyalama
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => addNewRow('bottom')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Transfer Satırı Ekle
            </button>

            <button
              onClick={() => exportTransfersToExcel(rows, routePhrases)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
              title="Mevcut tabloyu Excel (.xlsx) olarak bilgisayara indir"
            >
              <Download className="w-4 h-4" />
              Excel İndir (.xlsx)
            </button>

            <a
              href="./Dekalb_Transfer_Takip_Gelistirilmis.xlsx"
              download="Dekalb_Transfer_Takip_Gelistirilmis.xlsx"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
              title="Renkli koşullu biçimlendirmeli ve formüllü hazır Excel şablonunu indir"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Hazır Renkli Excel Şablonu
            </a>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition cursor-pointer"
              title="Eski veya yeni Excel (.xlsx / .csv) dosyasını tabloya yükle"
            >
              <Upload className="w-4 h-4" />
              Excel Yükle
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              className="hidden"
            />

            <button
              onClick={() => setShowPhraseSettings((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
              title="Kopyalama Metni Güzergah İfadeleri Ayarları"
            >
              <Settings2 className="w-4 h-4" />
              Kopya Formatı
            </button>

            <button
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs transition cursor-pointer"
              title="Görseldeki 7 örnek satıra sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Optional Route Phrase Customization Drawer */}
      {showPhraseSettings && (
        <div className="bg-indigo-950 text-white border-b border-indigo-800 px-4 py-3">
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Kopyalama Kutucuğu Güzergah İfadeleri:</strong> Sağdaki kopyala kutucuğuna basıldığında 2. satırda yazacak güzergah metinlerini buradan özelleştirebilirsiniz.
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:w-auto flex-1">
              {(
                [
                  ['OTEL_SAW', 'Otel ➔ SAW (Gidiş)'],
                  ['OTEL_IST', 'Otel ➔ IST (Gidiş)'],
                  ['SAW_OTEL', 'SAW ➔ Otel (Geliş)'],
                  ['IST_OTEL', 'IST ➔ Otel (Geliş)'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="bg-indigo-900/60 border border-indigo-700/70 rounded-lg px-2.5 py-1.5">
                  <label className="block text-[10px] font-semibold uppercase text-indigo-300 mb-0.5">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={routePhrases[key]}
                    onChange={(e) =>
                      setRoutePhrases((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full bg-indigo-950/90 border border-indigo-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setRoutePhrases(DEFAULT_ROUTE_PHRASES)}
              className="text-xs text-indigo-300 hover:text-white underline cursor-pointer"
            >
              Varsayılana Dön
            </button>
          </div>
        </div>
      )}

      {/* Top Financial & Status Summary Cards */}
      <section className="max-w-[1920px] w-full mx-auto px-4 pt-4 pb-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1: Misafir Ödeme Durumu */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Misafirden Ödeme Durumu
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {stats.misafirPaidCount} Alındı
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                {stats.misafirUnpaidCount} Alınmadı
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() =>
                setPaymentFilter((f) => (f === 'MISAFIR_PAID' ? 'ALL' : 'MISAFIR_PAID'))
              }
              className={`rounded-lg p-2.5 border transition cursor-pointer ${
                paymentFilter === 'MISAFIR_PAID'
                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 hover:bg-emerald-100/80'
              }`}
            >
              <div className="text-[11px] font-semibold opacity-85 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Alınan (Yeşil)
              </div>
              <div className="text-base font-extrabold font-mono-num mt-0.5">
                {stats.activeCurrencies
                  .map(
                    (c) =>
                      `${stats.byCurrency[c].misafirAlindi.toLocaleString('tr-TR')} ${CURRENCY_SYMBOLS[c]}`
                  )
                  .join(' + ')}
              </div>
            </div>

            <div
              onClick={() =>
                setPaymentFilter((f) => (f === 'MISAFIR_UNPAID' ? 'ALL' : 'MISAFIR_UNPAID'))
              }
              className={`rounded-lg p-2.5 border transition cursor-pointer ${
                paymentFilter === 'MISAFIR_UNPAID'
                  ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400'
                  : 'bg-red-50/90 border-red-300 text-red-950 hover:bg-red-100/80'
              }`}
            >
              <div className="text-[11px] font-semibold opacity-85 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Alınacak (Kırmızı)
              </div>
              <div className="text-base font-extrabold font-mono-num mt-0.5">
                {stats.activeCurrencies
                  .map(
                    (c) =>
                      `${stats.byCurrency[c].misafirBekleyen.toLocaleString('tr-TR')} ${CURRENCY_SYMBOLS[c]}`
                  )
                  .join(' + ')}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Tayfun'a Ödeme Durumu */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-indigo-600" />
              Tayfun&apos;a Ödeme Durumu
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {stats.tayfunPaidCount} Yapıldı
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                {stats.tayfunUnpaidCount} Yapılmadı
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() =>
                setPaymentFilter((f) => (f === 'TAYFUN_PAID' ? 'ALL' : 'TAYFUN_PAID'))
              }
              className={`rounded-lg p-2.5 border transition cursor-pointer ${
                paymentFilter === 'TAYFUN_PAID'
                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 hover:bg-emerald-100/80'
              }`}
            >
              <div className="text-[11px] font-semibold opacity-85 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tayfun&apos;a Ödenen
              </div>
              <div className="text-base font-extrabold font-mono-num mt-0.5">
                {stats.activeCurrencies
                  .map(
                    (c) =>
                      `${stats.byCurrency[c].tayfunOdendi.toLocaleString('tr-TR')} ${CURRENCY_SYMBOLS[c]}`
                  )
                  .join(' + ')}
              </div>
            </div>

            <div
              onClick={() =>
                setPaymentFilter((f) => (f === 'TAYFUN_UNPAID' ? 'ALL' : 'TAYFUN_UNPAID'))
              }
              className={`rounded-lg p-2.5 border transition cursor-pointer ${
                paymentFilter === 'TAYFUN_UNPAID'
                  ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400'
                  : 'bg-red-50/90 border-red-300 text-red-950 hover:bg-red-100/80'
              }`}
            >
              <div className="text-[11px] font-semibold opacity-85 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Tayfun&apos;a Kalan Borç
              </div>
              <div className="text-base font-extrabold font-mono-num mt-0.5">
                {stats.activeCurrencies
                  .map(
                    (c) =>
                      `${stats.byCurrency[c].tayfunBekleyen.toLocaleString('tr-TR')} ${CURRENCY_SYMBOLS[c]}`
                  )
                  .join(' + ')}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Toplam Hesap & Otel Farkı */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Toplam Ciro & Tayfun Hesap Özeti
            </span>
            {stats.tayfunUnpaidCount > 0 && (
              <button
                onClick={handleMarkAllTayfunPaid}
                className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                title="Tayfun ile hesap kapandığında bekleyen tüm ödemeleri Yapıldı (Yeşil) olarak işaretle"
              >
                Tayfun Hesabını Kapat ✓
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">
                Misafir Toplam
              </div>
              <div className="text-sm font-bold font-mono-num text-slate-900 mt-0.5">
                {stats.activeCurrencies
                  .map(
                    (c) =>
                      `${stats.byCurrency[c].misafirToplam.toLocaleString('tr-TR')} ${CURRENCY_SYMBOLS[c]}`
                  )
                  .join(' / ')}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">
                Tayfun Toplam
              </div>
              <div className="text-sm font-bold font-mono-num text-slate-900 mt-0.5">
                {stats.activeCurrencies
                  .map(
                    (c) =>
                      `${stats.byCurrency[c].tayfunToplam.toLocaleString('tr-TR')} ${CURRENCY_SYMBOLS[c]}`
                  )
                  .join(' / ')}
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
              <div className="text-[10px] font-semibold uppercase text-indigo-700">
                Net Fark (Otel)
              </div>
              <div className="text-sm font-extrabold font-mono-num text-indigo-900 mt-0.5">
                {stats.activeCurrencies
                  .map((c) => {
                    const diff =
                      stats.byCurrency[c].misafirToplam - stats.byCurrency[c].tayfunToplam;
                    return `${diff >= 0 ? '+' : ''}${diff.toLocaleString('tr-TR')} ${CURRENCY_SYMBOLS[c]}`;
                  })
                  .join(' / ')}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Son Kopyalanan Mesaj Önizlemesi */}
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 shadow-xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              {lastCopiedText
                ? `Kopyalandı: ${lastCopiedGuest}`
                : 'Sağdaki Kutucuk Çıktı Formatı'}
            </span>
            {lastCopiedText && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Panoda Hazır ✓
              </span>
            )}
          </div>
          <pre className="text-[11px] leading-snug font-mono-num text-slate-200 bg-slate-950/90 border border-slate-800 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-20">
            {lastCopiedText ||
              `25 ekim pazar saat 18:30 xxxx/yyyy/zzzz\n\notelden sabihaya 3 kişi  uçuş kodu crty15\n\nnumara +9999999999`}
          </pre>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="max-w-[1920px] w-full mx-auto px-4 py-2">
        <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Misafir adı, oda no, uçuş kodu, telefon veya not ara..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Route Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Yön:
            </span>
            {(
              [
                ['ALL', 'Tümü'],
                ['OTEL_SAW', 'Otel ➔ SAW'],
                ['OTEL_IST', 'Otel ➔ IST'],
                ['SAW_OTEL', 'SAW ➔ Otel'],
                ['IST_OTEL', 'IST ➔ Otel'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setRouteFilter(val)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  routeFilter === val
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Payment Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setPaymentFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                paymentFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tüm Ödemeler ({rows.length})
            </button>
            <button
              onClick={() =>
                setPaymentFilter((f) => (f === 'MISAFIR_UNPAID' ? 'ALL' : 'MISAFIR_UNPAID'))
              }
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${
                paymentFilter === 'MISAFIR_UNPAID'
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              Misafir Alınmadı ({stats.misafirUnpaidCount})
            </button>
            <button
              onClick={() =>
                setPaymentFilter((f) => (f === 'TAYFUN_UNPAID' ? 'ALL' : 'TAYFUN_UNPAID'))
              }
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${
                paymentFilter === 'TAYFUN_UNPAID'
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              Tayfun Ödenmedi ({stats.tayfunUnpaidCount})
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 ml-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rowTintEnabled}
                onChange={(e) => setRowTintEnabled(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tüm Satırı Renklendir</span>
            </label>
          </div>
        </div>
      </section>

      {/* Main Excel-Style Spreadsheet Table */}
      <main className="max-w-[1920px] w-full mx-auto px-4 pb-8 flex-1 flex flex-col">
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-amber-300/95 text-slate-950 border-b-2 border-slate-900 text-[11px] font-extrabold uppercase tracking-wider select-none">
                  <th className="py-2.5 px-2 text-center border-r border-slate-400/70 w-9">#</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-400/70 min-w-[138px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      TARİH
                    </div>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400/70 min-w-[92px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      SAAT
                    </div>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400/70 w-[76px] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <DoorOpen className="w-3.5 h-3.5" />
                      ODA
                    </div>
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-400/70 min-w-[310px] bg-amber-200">
                    <div className="flex items-center justify-between">
                      <span>MİSAFİR İSİMLERİ (GENİŞ ALAN)</span>
                      <span className="text-[10px] font-semibold text-slate-700 normal-case">
                        Çoklu isimde / veya alt satır
                      </span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-400/70 min-w-[225px]">
                    GÜZERGAH (OTEL ⇄ SAW / IST)
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400/70 w-[72px] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      KİŞİ
                    </div>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400/70 min-w-[105px]">
                    UÇUŞ NO
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-400/70 min-w-[155px]">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      MİSAFİR NUMARASI
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-700 min-w-[195px] bg-slate-900 text-white">
                    <div className="flex items-center justify-between">
                      <span>MİSAFİRDEN ALINACAK</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Alındı / Alınmadı
                      </span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-700 min-w-[195px] bg-slate-900 text-white">
                    <div className="flex items-center justify-between">
                      <span>TAYFUN&apos;A ÖDEME</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Yapıldı / Yapılmadı
                      </span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-400/70 min-w-[165px] bg-indigo-700 text-white text-center">
                    TRANSFER DETAYI KOPYALA
                  </th>
                  <th className="py-2.5 px-3 min-w-[230px] bg-amber-300/95 text-slate-950">
                    <div className="flex items-center gap-1">
                      <StickyNote className="w-3.5 h-3.5" />
                      NOT BÖLÜMÜ (EN SAĞ)
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-500">
                      Arama veya filtre kriterlerine uygun transfer kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    const { dayNameShort, dayAndMonthNoYear } = formatDisplayDate(row.tarih);
                    const guestList = splitGuestNames(row.misafirIsmi);
                    const isCopied = copiedRowId === row.id;
                    const isDeparture = row.yon === 'OTEL_SAW' || row.yon === 'OTEL_IST';

                    const rowBgClass = rowTintEnabled
                      ? row.misafirOdemeAlindi && row.tayfunOdemeYapildi
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                        : !row.misafirOdemeAlindi
                        ? 'bg-red-50/35 hover:bg-red-50/60'
                        : 'bg-amber-50/30 hover:bg-amber-50/50'
                      : 'hover:bg-slate-50/90';

                    return (
                      <tr
                        key={row.id}
                        className={`group transition-colors align-top ${rowBgClass}`}
                      >
                        {/* 1. Sıra No */}
                        <td className="py-2.5 px-1.5 text-center font-mono-num font-bold text-slate-400 border-r border-slate-200 select-none">
                          <div className="pt-1">{index + 1}</div>
                        </td>

                        {/* 2. Tarih */}
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="date"
                            value={row.tarih}
                            onChange={(e) => updateRow(row.id, 'tarih', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 focus:bg-white"
                          />
                          <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-500 font-medium">
                            <span className="truncate" title={dayAndMonthNoYear}>
                              {dayAndMonthNoYear || '-'}
                            </span>
                            {dayNameShort && (
                              <span className="px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded font-bold">
                                {dayNameShort}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Saat */}
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="time"
                            value={row.saat}
                            onChange={(e) => updateRow(row.id, 'saat', e.target.value)}
                            className="w-full px-1.5 py-1 text-xs font-mono-num font-bold bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 focus:bg-white text-center"
                          />
                          <div className="mt-1 text-[10px] text-center text-slate-400">
                            {row.saat ? `saat ${row.saat}` : 'Saat girin'}
                          </div>
                        </td>

                        {/* 4. Oda Numarası */}
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.odaNo}
                            onChange={(e) => updateRow(row.id, 'odaNo', e.target.value)}
                            placeholder="Oda"
                            className="w-full px-1.5 py-1 text-xs font-mono-num font-extrabold text-center bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-900"
                          />
                          {row.odaNo && (
                            <div className="mt-1 text-[10px] text-center font-semibold text-slate-500">
                              Oda {row.odaNo}
                            </div>
                          )}
                        </td>

                        {/* 5. Misafir İsimleri (BÜYÜK ALAN - Çoklu Misafir Destekli) */}
                        <td className="p-1.5 border-r border-slate-200 bg-amber-50/20">
                          <textarea
                            rows={Math.max(2, Math.min(5, row.misafirIsmi.split('\n').length))}
                            value={row.misafirIsmi}
                            onChange={(e) => updateRow(row.id, 'misafirIsmi', e.target.value)}
                            placeholder="Misafir ad soyad (Birden fazla kişi varsa alt alta yazın veya / ile ayırın)"
                            className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 resize-y leading-relaxed"
                          />
                          <div className="mt-1 flex items-center justify-between gap-1 px-0.5">
                            {guestList.length > 1 ? (
                              <span
                                className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded truncate max-w-[230px]"
                                title={`Kopya çıktısı: ${guestList.join('/')}`}
                              >
                                {guestList.length} İsim: {guestList.join('/')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {guestList.length === 1
                                  ? '1 isim girildi'
                                  : 'Çoklu isimde / ile ayrılır'}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const current = row.misafirIsmi.trim();
                                updateRow(
                                  row.id,
                                  'misafirIsmi',
                                  current ? `${current} / ` : ''
                                );
                              }}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition cursor-pointer shrink-0"
                              title="İkinci/üçüncü misafir ismi eklemek için / ayıracı ekle"
                            >
                              + İsim Ekle (/)
                            </button>
                          </div>
                        </td>

                        {/* 6. Güzergah / Yön (Gidiş mi Otelden SAW/IST mi yoksa Havalimanından Otele mi) */}
                        <td className="p-1.5 border-r border-slate-200">
                          <select
                            value={row.yon}
                            onChange={(e) =>
                              updateRow(row.id, 'yon', e.target.value as RouteType)
                            }
                            className={`w-full px-2 py-1.5 text-xs font-bold rounded-md border focus:outline-none cursor-pointer ${
                              isDeparture
                                ? 'bg-sky-50 border-sky-300 text-sky-950'
                                : 'bg-purple-50 border-purple-300 text-purple-950'
                            }`}
                          >
                            <optgroup label="GİDİŞ (Otelden Havalimanına)">
                              <option value="OTEL_SAW">
                                🛫 Gidiş: Otel ➔ SAW (Sabiha)
                              </option>
                              <option value="OTEL_IST">
                                🛫 Gidiş: Otel ➔ IST (İstanbul Hvl.)
                              </option>
                            </optgroup>
                            <optgroup label="GELİŞ (Havalimanından Otele)">
                              <option value="SAW_OTEL">
                                🛬 Geliş: SAW (Sabiha) ➔ Otel
                              </option>
                              <option value="IST_OTEL">
                                🛬 Geliş: IST (İstanbul Hvl.) ➔ Otel
                              </option>
                            </optgroup>
                            <optgroup label="Özel">
                              <option value="DIGER">Diğer / Özel Güzergah</option>
                            </optgroup>
                          </select>

                          {/* Çıkış & Varış Alt Bilgisi */}
                          <div className="mt-1 flex items-center justify-between gap-1 px-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isDeparture
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {isDeparture ? (
                                <PlaneTakeoff className="w-3 h-3" />
                              ) : (
                                <PlaneLanding className="w-3 h-3" />
                              )}
                              {isDeparture ? 'GİDİŞ' : 'GELİŞ'}
                            </span>
                            <span className="text-[10px] font-mono-num font-semibold text-slate-600">
                              {row.cikis.toUpperCase()} ➔ {row.varis.toUpperCase()}
                            </span>
                          </div>
                        </td>

                        {/* 7. Kişi Sayısı */}
                        <td className="p-1.5 border-r border-slate-200 text-center">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={row.kisiSayisi}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                'kisiSayisi',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-full px-1.5 py-1 text-xs font-mono-num font-extrabold text-center bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 focus:bg-white"
                          />
                          <div className="mt-1 text-[10px] font-semibold text-slate-500">
                            {row.kisiSayisi} kişi
                          </div>
                        </td>

                        {/* 8. Uçuş No */}
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.ucusNo}
                            onChange={(e) => updateRow(row.id, 'ucusNo', e.target.value)}
                            placeholder="Örn: PC1280"
                            className="w-full px-2 py-1 text-xs font-mono-num font-bold uppercase bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 focus:bg-white"
                          />
                          <div className="mt-1 text-[10px] text-slate-400 truncate">
                            {row.ucusNo ? `Kod: ${row.ucusNo}` : 'Uçuş kodu'}
                          </div>
                        </td>

                        {/* 9. Misafir Cep Numarası */}
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.cepNumarasi}
                            onChange={(e) => updateRow(row.id, 'cepNumarasi', e.target.value)}
                            placeholder="+90 5xx..."
                            className="w-full px-2 py-1 text-xs font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 focus:bg-white"
                          />
                          <div className="mt-1 text-[10px] text-slate-400 truncate">
                            {row.cepNumarasi && row.cepNumarasi !== '+'
                              ? row.cepNumarasi
                              : 'Telefon no'}
                          </div>
                        </td>

                        {/* 10. MİSAFİRDEN ALINACAK & ÖDEME DURUMU (YEŞİL / KIRMIZI) */}
                        <td
                          className={`p-1.5 border-r-2 transition-colors ${
                            row.misafirOdemeAlindi
                              ? 'bg-emerald-100/90 border-emerald-400'
                              : 'bg-red-100/90 border-red-400'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              step="1"
                              value={row.misafirTutar}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  'misafirTutar',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-xs font-mono-num font-extrabold bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900 text-right"
                            />
                            <select
                              value={row.misafirParaBirimi}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  'misafirParaBirimi',
                                  e.target.value as CurrencyCode
                                )
                              }
                              className="px-1 py-1 text-xs font-bold bg-white border border-slate-300 rounded focus:outline-none cursor-pointer"
                            >
                              <option value="EUR">€</option>
                              <option value="TRY">₺</option>
                              <option value="USD">$</option>
                              <option value="GBP">£</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateRow(
                                row.id,
                                'misafirOdemeAlindi',
                                !row.misafirOdemeAlindi
                              )
                            }
                            className={`mt-1.5 w-full py-1 px-2 rounded-md font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer ${
                              row.misafirOdemeAlindi
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {row.misafirOdemeAlindi ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                ÖDEME ALINDI
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                ALINMADI
                              </>
                            )}
                          </button>
                        </td>

                        {/* 11. TAYFUN'A ÖDEME & DURUMU (YEŞİL / KIRMIZI) */}
                        <td
                          className={`p-1.5 border-r-2 transition-colors ${
                            row.tayfunOdemeYapildi
                              ? 'bg-emerald-100/90 border-emerald-400'
                              : 'bg-red-100/90 border-red-400'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              step="1"
                              value={row.tayfunTutar}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  'tayfunTutar',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-xs font-mono-num font-extrabold bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900 text-right"
                            />
                            <select
                              value={row.tayfunParaBirimi}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  'tayfunParaBirimi',
                                  e.target.value as CurrencyCode
                                )
                              }
                              className="px-1 py-1 text-xs font-bold bg-white border border-slate-300 rounded focus:outline-none cursor-pointer"
                            >
                              <option value="EUR">€</option>
                              <option value="TRY">₺</option>
                              <option value="USD">$</option>
                              <option value="GBP">£</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateRow(
                                row.id,
                                'tayfunOdemeYapildi',
                                !row.tayfunOdemeYapildi
                              )
                            }
                            className={`mt-1.5 w-full py-1 px-2 rounded-md font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer ${
                              row.tayfunOdemeYapildi
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {row.tayfunOdemeYapildi ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                TAYFUN&apos;A ÖDENDİ
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                ÖDENMEDİ
                              </>
                            )}
                          </button>
                        </td>

                        {/* 12. SAĞDAKİ KOPYALA KUTUCUĞU */}
                        <td className="p-1.5 border-r border-slate-200 bg-indigo-50/40 text-center align-middle">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyTransfer(row)}
                              className={`w-full py-2 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer border ${
                                isCopied
                                  ? 'bg-emerald-600 text-white border-emerald-700 scale-[1.02]'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
                              }`}
                              title="Bu satırdaki transfer detaylarını istenen formatta kopyala"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-4 h-4 shrink-0" />
                                  Kopyalandı!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 shrink-0" />
                                  Detayı Kopyala
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setPreviewRowId((prev) =>
                                  prev === row.id ? null : row.id
                                )
                              }
                              className="w-full py-0.5 px-1.5 rounded text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1 transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Çıktıyı Gör
                            </button>
                          </div>
                        </td>

                        {/* 13. EN SAĞDA NOT BÖLÜMÜ + Satır İşlemleri */}
                        <td className="p-1.5">
                          <div className="flex items-start gap-1">
                            <textarea
                              rows={2}
                              value={row.not}
                              onChange={(e) => updateRow(row.id, 'not', e.target.value)}
                              placeholder="Kişiyle ilgili not yazın..."
                              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 focus:bg-white resize-y"
                            />
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => duplicateRow(row)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="Bu satırı çoğalt (Örn: Dönüş transferi için)"
                              >
                                <CopyPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRow(row.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Satırı sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Add Row Bar */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => addNewRow('bottom')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Yeni Satır Ekle
            </button>
            <div className="text-xs text-slate-500">
              Toplam <strong>{rows.length}</strong> transfer kaydı ({stats.totalPax} yolcu) • Değişiklikler tarayıcıya otomatik kaydedilir.
            </div>
          </div>
        </div>
      </main>

      {/* Modal Preview for Copy Output of a Specific Row */}
      {previewRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">
                  Transfer Kopyalama Çıktısı (Oda {previewRow.odaNo || '-'})
                </h3>
              </div>
              <button
                onClick={() => setPreviewRowId(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500 mb-2">
                Kutucuğa bastığınızda tam olarak aşağıdaki format panoya kopyalanır (ekstra hiçbir bilgi eklenmez):
              </p>
              <pre className="bg-slate-950 text-emerald-300 font-mono-num text-xs p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                {generateTransferCopyText(previewRow, routePhrases)}
              </pre>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setPreviewRowId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  onClick={() => handleCopyTransfer(previewRow)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedRowId === previewRow.id ? 'Panoya Kopyalandı ✓' : 'Metni Kopyala'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
