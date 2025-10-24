# 📋 Profit & Loss System - Quick Reference Card

## 🎯 Two Ways to Calculate Profit/Loss

### Method 1: Database Query (Historical Data)
```
START → Select Date Range → Click Fetch Data → View Results → Export
```

### Method 2: Excel Upload (New Data)
```
DOWNLOAD TEMPLATE → Fill Data → Upload File → Review Results → Export
```

---

## 📅 Database Query Steps

| Step | Action | Notes |
|------|--------|-------|
| 1 | Select **Start Date** | Format: YYYY-MM-DD (e.g., 2024-01-01) |
| 2 | Select **End Date** | Must be after Start Date |
| 3 | Click **"Fetch Data"** | System queries database |
| 4 | View **Chart** | Monthly profit trend |
| 5 | View **Table** | All transactions in range |
| 6 | Export **Excel/PDF** | Save for records |

**Example**: From 2024-01-01 to 2024-12-31

---

## 📤 Excel Upload Steps

| Step | Action | Format |
|------|--------|--------|
| 1 | Click **"Download Template"** | Gets profit_loss_template.xlsx |
| 2 | Open Template in Excel | Already has examples |
| 3 | Edit **Data Template** sheet | Keep columns as-is |
| 4 | Fill in **Your Data**: | |
|    | - PaymentDate | YYYY-MM-DD |
|    | - ComboID | Exact ID from system |
|    | - SoldPrice | Positive number |
|    | - Quantity | Positive number |
|    | - Status | "Delivered" or "RPU" |
| 5 | Save File | Excel format |
| 6 | Click **"Choose Excel File"** | Select your file |
| 7 | Wait for Upload | 2-5 seconds per 100 rows |
| 8 | Review **Results Modal** | Check for errors |
| 9 | **Export Results** | Excel or PDF |

---

## 📊 Understanding Results

### Summary Statistics
```
💰 Total Profit/Loss: Final calculation (green if +, red if -)
✅ Delivered Profit: Money from successful sales (green)
🔄 RPU Loss: Money lost from returns (red/negative)
📊 Total Records: Count of successfully processed items
```

### Results Table Columns
```
Combo ID          → Item identifier
Product(s)        → Products in combo
Original Cost     → Sum of product costs
Sold Price        → Price customer paid
Qty               → Quantity sold
Profit/Loss       → Calculation result (color-coded)
Status            → ✅ Delivered or 🔄 RPU
Date              → Transaction date (if from database)
```

### Color Coding
```
🟢 GREEN = Profit (positive number)
🔴 RED = Loss (negative number)
⚫ GRAY = Error row
```

---

## ✅ Excel Template Format

### Required Columns
```
| PaymentDate | ComboID    | SoldPrice | Quantity | Status    |
|-------------|------------|-----------|----------|-----------|
| 2024-01-15  | COMBO-001  | 150       | 2        | Delivered |
| 2024-01-20  | COMBO-002  | 200       | 1        | RPU       |
| 2024-01-25  | COMBO-003  | 180       | 3        | Delivered |
```

### Column Rules
```
PaymentDate:  YYYY-MM-DD format (e.g., 2024-01-15)
ComboID:      Must exist in your system
SoldPrice:    Must be positive number (no $, €)
Quantity:     Must be positive number
Status:       "Delivered" or "RPU" (case-insensitive)
```

### Common Mistakes ❌
```
❌ Date format wrong: 01/15/2024 → Use: 2024-01-15
❌ ComboID doesn't exist → Check Combos page for exact ID
❌ Negative price: -150 → Must be: 150
❌ Zero quantity: 0 → Must be: 1 or more
❌ Status misspelled: "delivery" → Use: "Delivered"
❌ Currency symbol: $150 → Use: 150
❌ Text instead of number → Must be numeric
```

---

## 🎯 Profit Calculation Example

### Setup
```
ComboID: COMBO-001
Products in Combo:
  - Product A (cost $50, qty 1)
  - Product B (cost $30, qty 2)
  Total Cost: $50 + $60 = $110

From Excel:
  SoldPrice: $200
  Quantity: 2
  Status: Delivered
```

### Calculation
```
1. Profit Per Item = $200 - ($110 ÷ 2) = $200 - $55 = $145
2. Total Profit = $145 × 2 = $290
3. Because Status="Delivered" → Profit stays +$290

Result: Profit = +$290 ✅
```

### If Status Was RPU
```
Same calculation but with negative result:
Result: Loss = -$290 🔄
```

---

## 🔍 Troubleshooting

### Problem: "No data appears"
**Solution**: 
- Check date range includes your sales
- Go to Sales page to verify data exists
- Try wider date range

### Problem: "Combo not found" error
**Solution**:
- Go to Combos page
- Find exact ComboID
- Copy and paste into Excel

### Problem: "Invalid SoldPrice" error
**Solution**:
- Remove $ or currency symbols
- Make sure value is numeric
- Make sure value is positive

### Problem: Upload takes long time
**Solution**:
- Normal for large files (1000+ rows = 10-30 sec)
- Wait for completion
- Check file size (max 5MB)

---

## 📥 Export Options

### Export to Excel
```
✅ Creates .xlsx file
✅ Multi-sheet workbook
✅ Sheet 1: All transactions
✅ Sheet 2: Summary stats
✅ Professional formatting
✅ Reusable in Excel/Sheets
```

### Export to PDF
```
✅ Creates .html file
✅ Download and print
✅ Professional styling
✅ Color-coded values
✅ Portable format
→ Use Browser Print (Ctrl+P) → Save as PDF
```

---

## 🎮 Button Guide

| Button | Location | Action |
|--------|----------|--------|
| 📅 Fetch Data | Date Filter Section | Query database |
| 🗑️ Clear | Date Filter Section | Reset all filters |
| 📥 Download Template | Upload Section | Get Excel template |
| 📁 Choose Excel File | Upload Section | Select file to upload |
| 📊 Excel | Chart/Table Header | Export to Excel |
| 📄 PDF | Chart/Table Header | Export to PDF |

---

## 💡 Pro Tips

1. **Use Template**: Always download template first for correct format
2. **Batch Upload**: Upload multiple files separately if needed
3. **Error Fixing**: Fix rows and re-upload (system processes both)
4. **Date Range**: Use narrow ranges for faster database queries
5. **Combo Names**: Use exact combo names if ID lookup fails
6. **Backups**: Export data regularly for records
7. **Print to PDF**: Use browser Print → Save as PDF for reports
8. **Performance**: Keep Excel files under 1000 rows for speed

---

## 📞 Help Quick Links

| Topic | Reference |
|-------|-----------|
| Full Installation | QUICK_START_GUIDE.md |
| Detailed Troubleshooting | QUICK_START_GUIDE.md |
| API Details | API_REFERENCE.md |
| Complete Changes | CHANGES_SUMMARY.md |
| Full Audit Report | PROFIT_LOSS_AUDIT_REPORT.md |

---

## ✅ Checklist for Excel Upload

Before uploading, verify:
- [ ] Template format downloaded
- [ ] All required columns present
- [ ] PaymentDate in YYYY-MM-DD format
- [ ] ComboID values exist in system
- [ ] SoldPrice values are positive numbers
- [ ] Quantity values are positive numbers
- [ ] Status is "Delivered" or "RPU"
- [ ] No empty rows (except header)
- [ ] File is .xlsx format
- [ ] File size under 5MB

---

## 📊 Status Symbols

| Symbol | Meaning | Description |
|--------|---------|-------------|
| ✅ | Delivered | Successful sale |
| 🔄 | RPU | Return/Replace Unit (loss) |
| ❌ | Error | Row failed processing |
| 💹 | Dashboard | Analytics page |
| 📈 | Chart | Monthly trend view |
| 📊 | Table | Detailed records view |

---

## 💰 Summary Cards Explained

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  💰 TOTAL PROFIT/LOSS                              │
│  $1,340.00  (or -$500.00 if loss)                  │
│                                                     │
│  ✅ DELIVERED PROFIT                               │
│  $1,500.00  (money from successful sales)          │
│                                                     │
│  🔄 RPU LOSS                                       │
│  -$160.00  (money lost from returns)               │
│                                                     │
│  📊 TOTAL RECORDS                                  │
│  127  (successfully processed items)               │
│                                                     │
└─────────────────────────────────────────────────────┘

Calculation: $1,500.00 + (-$160.00) = $1,340.00
```

---

## 🎓 Learning Path

1. **Start**: Read README_IMPLEMENTATION.md
2. **Setup**: Follow QUICK_START_GUIDE.md
3. **Practice**: Test with sample data
4. **Reference**: Use this QUICK_REFERENCE.md
5. **Details**: Dive into PROFIT_LOSS_AUDIT_REPORT.md
6. **API**: Refer to API_REFERENCE.md for development

---

## 🚀 You're Ready!

You now have everything needed to:
- ✅ Query profit/loss data
- ✅ Upload Excel files
- ✅ Analyze transactions
- ✅ Export reports
- ✅ Track Delivered vs RPU
- ✅ Get clear results

**Start using the Profit & Loss system today! 📊**

---

**Remember**: When in doubt, refer to the documentation. Everything is covered! 📚