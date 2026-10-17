#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generates the advanced Excel (.xlsx) file:
- Dekalb_Transfer_Takip_Gelistirilmis.xlsx
- public/Dekalb_Transfer_Takip_Gelistirilmis.xlsx
with Conditional Formatting (Green for Paid/Received, Red for Unpaid/Not Received),
Data Validation dropdowns, wide Guest Name column, Copy Output column, and Notes column.
"""

import os
from datetime import date
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule

def create_advanced_transfer_excel(output_paths):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transfer Takip"

    # Freeze top header rows
    ws.freeze_panes = "A4"

    # Title Banner (Row 1-2)
    ws.merge_cells("A1:P1")
    title_cell = ws["A1"]
    title_cell.value = "DEKALB HOTEL - GELİŞMİŞ TRANSFER & TAYFUN ÖDEME TAKİP TABLOSU"
    title_cell.font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:P2")
    sub_cell = ws["A2"]
    sub_cell.value = (
        "Misafir & Tayfun Ödeme Durumu: ALINDI / YAPILDI = YEŞİL  |  ALINMADI / YAPILMADI = KIRMIZI   •   "
        "Sağdaki 'KOPYALA KUTUCUĞU' sütunu mesaj formatını otomatik üretir."
    )
    sub_cell.font = Font(name="Calibri", size=10, italic=True, color="334155")
    sub_cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    sub_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    headers = [
        "TARİH",                        # A
        "SAAT",                         # B
        "ODA NO",                       # C
        "MİSAFİR İSİMLERİ (Çoklu İsim: / ile ayırın)", # D (Büyük Sütun)
        "GÜZERGAH / YÖN",               # E
        "ÇIKIŞ",                        # F
        "VARIŞ",                        # G
        "KİŞİ",                         # H
        "UÇUŞ NO",                      # I
        "MİSAFİR CEP NUMARASI",         # J
        "MİSAFİRDEN ALINACAK (€)",      # K
        "MİSAFİR ÖDEME DURUMU",         # L (Yeşil / Kırmızı)
        "TAYFUN'A ÖDENECEK (€)",        # M
        "TAYFUN ÖDEME DURUMU",          # N (Yeşil / Kırmızı)
        "KOPYALA KUTUCUĞU (TRANSFER DETAYI)", # O (Kopyalanacak çıktı)
        "NOT BÖLÜMÜ",                   # P (En sağda not)
    ]

    header_fill = PatternFill(start_color="FACC15", end_color="FACC15", fill_type="solid")
    payment_header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    copy_header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")

    thin_side = Side(border_style="thin", color="CBD5E1")
    med_bottom = Side(border_style="medium", color="0F172A")
    cell_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    header_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=med_bottom)

    ws.row_dimensions[3].height = 30
    for col_idx, text in enumerate(headers, start=1):
        cell = ws.cell(row=3, column=col_idx, value=text)
        if col_idx in (11, 12, 13, 14):
            cell.fill = payment_header_fill
            cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        elif col_idx == 15:
            cell.fill = copy_header_fill
            cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        else:
            cell.fill = header_fill
            cell.font = Font(name="Calibri", size=10, bold=True, color="0F172A")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = header_border

    sample_rows = [
        ("05.05.2025", "10:45", "401", "Mehmet Altundağ", "otelden istanbul havalimanına", "dekalb", "ist", 6, "TK1985", "+90 532 000 00 00", 65, "ALINDI", 50, "YAPILDI", "6 kişilik Vito araç istendi, bagaj fazla"),
        ("05.05.2025", "14:20", "504", "Christian Cucarano", "sabihadan otele", "saw", "dekalb", 2, "PC1280", "+46 72 444 73 00", 55, "ALINDI", 40, "YAPILDI", "Geliş transferi - karşılama tabelası ile"),
        ("08.05.2025", "09:15", "401", "Christian Cucarano", "otelden sabihaya", "dekalb", "saw", 2, "PC1281", "+46 72 444 73 00", 55, "ALINMADI", 40, "YAPILMADI", "Çıkışta resepsiyona nakit ödeyecek"),
        ("10.05.2025", "16:40", "402", "Mehdi Avdi", "istanbul havalimanından otele", "ist", "dekalb", 2, "TK216", "+44 7882 076681", 50, "ALINDI", 38, "YAPILMADI", "Misafirden alındı, Tayfun hesabına eklenecek"),
        ("23.05.2025", "13:10", "501", "Borislav Zlatkov", "istanbul havalimanından otele", "ist", "dekalb", 2, "TK1032", "+359 88 751 0431", 50, "ALINDI", 38, "YAPILDI", ""),
        ("26.05.2025", "11:30", "501", "Borislav Zlatkov", "otelden istanbul havalimanına", "dekalb", "ist", 2, "TK1031", "+359 88 751 0431", 50, "ALINMADI", 38, "YAPILMADI", "Sabah lobide hazır olacaklar"),
        ("29.05.2025", "18:30", "501", "Graham Philp/Denise Phil", "sabihadan otele", "saw", "dekalb", 2, "PC1188", "+44 7741 276481", 55, "ALINMADI", 40, "YAPILMADI", "2 misafir birlikte gelecek, odaya girişte ödeme alınacak"),
    ]

    # Turkish month/day helper for initial static/formula representation
    tr_months = {1: "ocak", 2: "şubat", 3: "mart", 4: "nisan", 5: "mayıs", 6: "haziran",
                 7: "temmuz", 8: "ağustos", 9: "eylül", 10: "ekim", 11: "kasım", 12: "aralık"}
    tr_days = {0: "pazartesi", 1: "salı", 2: "çarşamba", 3: "perşembe", 4: "cuma", 5: "cumartesi", 6: "pazar"}

    green_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    green_font = Font(name="Calibri", size=10, bold=True, color="15803D")
    red_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    red_font = Font(name="Calibri", size=10, bold=True, color="B91C1C")
    copy_fill = PatternFill(start_color="EEF2FF", end_color="EEF2FF", fill_type="solid")

    for idx, r in enumerate(sample_rows, start=4):
        ws.row_dimensions[idx].height = 48
        tarih_s, saat_s, oda_s, isim_s, yon_s, cikis_s, varis_s, kisi_n, ucus_s, tel_s, m_tutar, m_durum, t_tutar, t_durum, not_s = r

        # Parse DD.MM.YYYY for copy preview
        dd, mm, yyyy = [int(x) for x in tarih_s.split(".")]
        d_obj = date(yyyy, mm, dd)
        tarih_no_year = f"{dd} {tr_months[mm]} {tr_days[d_obj.weekday()]}"
        copy_output = (
            f"{tarih_no_year} saat {saat_s} {isim_s}\n\n"
            f"{yon_s} {kisi_n} kişi  uçuş kodu {ucus_s}\n\n"
            f"numara {tel_s}"
        )

        row_vals = [
            tarih_s, saat_s, oda_s, isim_s, yon_s, cikis_s, varis_s,
            kisi_n, ucus_s, tel_s, m_tutar, m_durum, t_tutar, t_durum, copy_output, not_s
        ]

        for col_idx, val in enumerate(row_vals, start=1):
            c = ws.cell(row=idx, column=col_idx, value=val)
            c.border = cell_border
            c.font = Font(name="Calibri", size=10, color="0F172A")
            if col_idx in (1, 2, 3, 6, 7, 8, 9):
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif col_idx == 4:
                c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                c.font = Font(name="Calibri", size=11, bold=True, color="0F172A")
            elif col_idx in (11, 13):
                c.alignment = Alignment(horizontal="right", vertical="center")
                c.number_format = '#,##0 "€"'
            elif col_idx == 12:
                c.alignment = Alignment(horizontal="center", vertical="center")
                if val == "ALINDI":
                    c.fill = green_fill
                    c.font = green_font
                else:
                    c.fill = red_fill
                    c.font = red_font
            elif col_idx == 14:
                c.alignment = Alignment(horizontal="center", vertical="center")
                if val == "YAPILDI":
                    c.fill = green_fill
                    c.font = green_font
                else:
                    c.fill = red_fill
                    c.font = red_font
            elif col_idx == 15:
                c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                c.fill = copy_fill
                c.font = Font(name="Calibri", size=9, color="1E1B4B")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # Data validations for rows 4..200
    dv_yon = DataValidation(
        type="list",
        formula1='"otelden sabihaya,otelden istanbul havalimanına,sabihadan otele,istanbul havalimanından otele"',
        allow_blank=True,
    )
    dv_misafir = DataValidation(type="list", formula1='"ALINDI,ALINMADI"', allow_blank=True)
    dv_tayfun = DataValidation(type="list", formula1='"YAPILDI,YAPILMADI"', allow_blank=True)

    ws.add_data_validation(dv_yon)
    ws.add_data_validation(dv_misafir)
    ws.add_data_validation(dv_tayfun)

    dv_yon.add("E4:E200")
    dv_misafir.add("L4:L200")
    dv_tayfun.add("N4:N200")

    # Conditional formatting rules for L4:L200 and N4:N200
    ws.conditional_formatting.add(
        "L4:L200",
        CellIsRule(operator="equal", formula=['"ALINDI"'], fill=green_fill, font=green_font),
    )
    ws.conditional_formatting.add(
        "L4:L200",
        CellIsRule(operator="equal", formula=['"ALINMADI"'], fill=red_fill, font=red_font),
    )
    ws.conditional_formatting.add(
        "N4:N200",
        CellIsRule(operator="equal", formula=['"YAPILDI"'], fill=green_fill, font=green_font),
    )
    ws.conditional_formatting.add(
        "N4:N200",
        CellIsRule(operator="equal", formula=['"YAPILMADI"'], fill=red_fill, font=red_font),
    )

    col_widths = {
        1: 13,  # TARİH
        2: 9,   # SAAT
        3: 9,   # ODA NO
        4: 40,  # MİSAFİR İSİMLERİ (Büyük bölüm)
        5: 30,  # GÜZERGAH / YÖN
        6: 10,  # ÇIKIŞ
        7: 10,  # VARIŞ
        8: 7,   # KİŞİ
        9: 12,  # UÇUŞ NO
        10: 20, # CEP NUMARASI
        11: 18, # MİSAFİRDEN ALINACAK
        12: 20, # MİSAFİR ÖDEME DURUMU
        13: 18, # TAYFUN'A ÖDENECEK
        14: 20, # TAYFUN ÖDEME DURUMU
        15: 48, # KOPYALA KUTUCUĞU
        16: 36, # NOT BÖLÜMÜ
    }
    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    for path in output_paths:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        wb.save(path)
        print(f"Saved: {path}")

if __name__ == "__main__":
    create_advanced_transfer_excel([
        "Dekalb_Transfer_Takip_Gelistirilmis.xlsx",
        "public/Dekalb_Transfer_Takip_Gelistirilmis.xlsx",
    ])
