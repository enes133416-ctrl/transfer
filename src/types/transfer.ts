export type RouteType = 'OTEL_SAW' | 'OTEL_IST' | 'SAW_OTEL' | 'IST_OTEL' | 'DIGER';

export type CurrencyCode = 'EUR' | 'TRY' | 'USD' | 'GBP';

export interface TransferRow {
  id: string;
  /** ISO format YYYY-MM-DD */
  tarih: string;
  /** HH:MM format e.g. 18:30 */
  saat: string;
  /** Room number e.g. 401, 504 */
  odaNo: string;
  /** Guest full name(s) - supports multiple guests via newline, slash, comma, or 'and'/'ve' */
  misafirIsmi: string;
  /** Transfer direction/route */
  yon: RouteType;
  /** Departure point (e.g. dekalb, saw, ist) */
  cikis: string;
  /** Arrival point (e.g. saw, ist, dekalb) */
  varis: string;
  /** Number of passengers */
  kisiSayisi: number;
  /** Flight number e.g. PC1280, TK1032 */
  ucusNo: string;
  /** Guest phone number e.g. +46 72 444 73 00 */
  cepNumarasi: string;
  /** Amount to collect from guest */
  misafirTutar: number;
  /** Currency for guest payment */
  misafirParaBirimi: CurrencyCode;
  /** Whether payment was collected from guest (Green if true, Red if false) */
  misafirOdemeAlindi: boolean;
  /** Amount paid / to be paid to Tayfun */
  tayfunTutar: number;
  /** Currency for Tayfun payment */
  tayfunParaBirimi: CurrencyCode;
  /** Whether payment was made to Tayfun (Green if true, Red if false) */
  tayfunOdemeYapildi: boolean;
  /** Extra notes at the far right of the row */
  not: string;
}

export interface RoutePhraseConfig {
  OTEL_SAW: string;
  OTEL_IST: string;
  SAW_OTEL: string;
  IST_OTEL: string;
}

export const DEFAULT_ROUTE_PHRASES: RoutePhraseConfig = {
  OTEL_SAW: 'otelden sabihaya',
  OTEL_IST: 'otelden istanbul havalimanına',
  SAW_OTEL: 'sabihadan otele',
  IST_OTEL: 'istanbul havalimanından otele',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  TRY: '₺',
  USD: '$',
  GBP: '£',
};
