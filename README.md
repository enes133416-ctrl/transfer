# 🚐 Gelişmiş Otel Transfer & Tayfun Ödeme Takip Sistemi

Otel resepsiyonu için hazırlanan, hem **Web Tabanlı Canlı Excel Tablosu** hem de **Koşullu Biçimlendirmeli `.xlsx` Excel Dosyası** içeren gelişmiş transfer yönetim sistemi.

## ✨ Özellikler

- **Misafir & Tayfun Ödeme Takibi (Yeşil / Kırmızı Gösterim):**
  - **Misafirden Alınacak Tutar & Ödeme Durumu:** Ödeme alındıysa **YEŞİL (`ÖDEME ALINDI`)**, alınmadıysa **KIRMIZI (`ALINMADI`)** olarak görünür.
  - **Tayfun'a Ödenecek Tutar & Ödeme Durumu:** Tayfun'a ödeme yapıldıysa **YEŞİL (`TAYFUN'A ÖDENDİ`)**, yapılmadıysa **KIRMIZI (`ÖDENMEDİ`)** olarak görünür.
  - Üst panelde otomatik olarak **Alınan / Bekleyen Misafir Ödemeleri**, **Tayfun'a Ödenen / Kalan Borç** ve **Otel Net Farkı** hesaplanır.
- **Gidiş / Geliş ve Havalimanı Yön Seçimi (Otel ⇄ SAW / IST):**
  - 🛫 **Gidiş: Otel ➔ SAW (Sabiha Gökçen)** (`otelden sabihaya`)
  - 🛫 **Gidiş: Otel ➔ IST (İstanbul Havalimanı)** (`otelden istanbul havalimanına`)
  - 🛬 **Geliş: SAW (Sabiha Gökçen) ➔ Otel** (`sabihadan otele`)
  - 🛬 **Geliş: IST (İstanbul Havalimanı) ➔ Otel** (`istanbul havalimanından otele`)
- **Geniş Misafir İsim Bölümü (Çoklu İsim Desteği):**
  - Gelecek tüm kişilerin isimlerinin rahatça yazılabilmesi için geniş ve çok satırlı alan.
  - Birden fazla isim alt alta, `/`, `,`, `and` veya `ve` ile girildiğinde kopyalama çıktısında otomatik olarak `/` işareti ile ayrılır (`xxxx/yyyy/zzzz`).
- **Tek Tıkla Transfer Detayı Kopyalama Kutucuğu:**
  - Her satırın sağında bulunan **Detayı Kopyala** kutucuğuna basıldığında ekstra hiçbir bilgi eklemeden tam olarak istenen formatta panoya kopyalar:

```text
25 ekim pazar saat 18:30 xxxx/yyyy/zzzz

otelden sabihaya 3 kişi  uçuş kodu crty15

numara +9999999999
```

- **En Sağda Not Bölümü:**
  - Her satırın en sağında misafir veya transferle ilgili ekstra notların yazılabileceği özel sütun.
- **Gerçek Excel (`.xlsx`) İndirme / Yükleme & Hazır Şablon:**
  - Mevcut eski Excel dosyanızı tek tıkla içe aktarabilir veya güncel tabloyu `.xlsx` olarak indirebilirsiniz.
  - Depoda ayrıca Microsoft Excel için koşullu biçimlendirmeli `Dekalb_Transfer_Takip_Gelistirilmis.xlsx` dosyası yer alır.

## 🚀 Çalıştırma & Derleme

```bash
npm install
npm run dev      # Geliştirme sunucusu
npm run build    # Production derlemesi (dist/)
python3 scripts/generate_excel_template.py # Excel (.xlsx) şablon üretimi
```
