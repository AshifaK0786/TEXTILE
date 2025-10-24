# File Upload Testing Guide - Profit & Loss System

## ✅ FIXES APPLIED

### 1. **Critical Calculation Bug Fixed**
**Problem:** Profit calculations were incorrect when uploading Excel files
- **Was:** `profitPerUnit = soldPrice - (costPrice / quantity)` ❌
- **Now:** `profitPerUnit = soldPrice - costPrice` ✅

**Impact:** All uploaded data will now show correct profit calculations

### 2. **Case-Insensitive Header Support**
Added support for Excel files with column names in different cases:
- `ComboID`, `comboID`, `COMBOID` - all work now ✅
- `SoldPrice`, `soldprice`, `SOLDPRICE` - all work now ✅
- Same for: Quantity, Status, PaymentDate

### 3. **Enhanced Error Logging**
- Server now logs all errors with row numbers
- Better error messages returned to frontend
- Debugging information for developers

### 4. **Added Missing npm Scripts**
- Added `start` script to backend package.json
- Can now run: `npm start` in backend directory

---

## 📋 REQUIRED EXCEL COLUMNS

Your Excel file MUST have these columns (case-insensitive):

| Column | Format | Example | Required |
|--------|--------|---------|----------|
| **PaymentDate** | YYYY-MM-DD | 2024-01-15 | Yes |
| **ComboID** | Text (exact ID) | COMBO-001 | Yes |
| **SoldPrice** | Number (positive) | 150.00 | Yes |
| **Quantity** | Number (positive) | 2 | Yes |
| **Status** | "Delivered" or "RPU" | Delivered | Yes |

---

## 🧪 STEP-BY-STEP TEST

### Step 1: Prepare Test Data
Create an Excel file (.xlsx) with this sample data:

```
PaymentDate    ComboID      SoldPrice    Quantity    Status
2024-01-15     COMBO-001    150.00       2           Delivered
2024-01-16     COMBO-002    200.00       1           RPU
2024-01-17     COMBO-003    180.00       3           Delivered
```

### Step 2: Start the Servers
```bash
# Terminal 1 - Backend
cd backend
npm start
# Should show: "Server running on port 5000"
# Should show: "MongoDB Connected: localhost"

# Terminal 2 - Frontend
cd frontend
npm start
# Should show: "Compiled successfully!"
```

### Step 3: Navigate to Profit & Loss Page
1. Open browser: http://localhost:3000
2. Navigate to "Profit & Loss" section
3. You should see:
   - 📁 Upload Excel File section
   - 🔍 Date Range Filter section
   - 📥 Download Template button

### Step 4: Test Template Download
1. Click "📥 Download Template" button
2. Save the file as `profit_loss_template.xlsx`
3. Verify it has:
   - ✅ "Data Template" sheet with example data
   - ✅ "Instructions" sheet with column descriptions
   - ✅ Properly formatted columns

### Step 5: Upload Your Test File
1. Click "Choose Excel File" input
2. Select your test Excel file
3. You should see:
   - ✅ Modal opens with results
   - ✅ Data displayed in table
   - ✅ Summary statistics showing:
     - 💰 Total Profit/Loss
     - ✅ Delivered Profit
     - 🔄 RPU Loss
     - 📊 Total Records

### Step 6: Verify Calculations
Example: If you uploaded:
- ComboID: COMBO-001
- Sold Price: $150
- Quantity: 2
- Status: Delivered

**Expected Result:**
- If combo cost is $100 total:
  - Profit per unit = $150 - $100 = $50
  - Total profit = $50 × 2 = $100 ✅

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### Issue: "No file uploaded"
**Solution:** 
- Make sure you selected a file
- File must be .xlsx, .xls, or .csv format
- File size must be less than 5MB

### Issue: "No data found in Excel file"
**Solution:**
- Make sure your Excel has at least one row of data
- Check that data starts in row 2 (row 1 is headers)
- Don't leave empty rows between data

### Issue: "Combo not found" error
**Solution:**
- Verify the ComboID exactly matches a combo in the system
- ComboID is case-sensitive for lookup
- You can also use the combo's name instead of ID

### Issue: "Invalid or missing SoldPrice"
**Solution:**
- SoldPrice must be a number (not text)
- Must be greater than 0
- Format: 150.50 (not "$150.50" or "150,50")

### Issue: "Invalid or missing Quantity"
**Solution:**
- Quantity must be a number
- Must be greater than 0
- Must be whole number (1, 2, 3, not 1.5)

### Issue: Modal not showing after upload
**Solution:**
1. Check browser console (F12) for errors
2. Look at server logs for error messages
3. Verify backend is running: http://localhost:5000
4. Try uploading a simpler test file

### Issue: Calculations look wrong
**Solution:**
- This was the main bug that's now fixed!
- Restart backend server (npm start)
- Clear browser cache (Ctrl+F5)
- Try uploading again

---

## 🔍 DEBUGGING TIPS

### Check Backend Logs
Look for messages like:
```
Available columns in Excel: [ 'PaymentDate', 'ComboID', 'SoldPrice', 'Quantity', 'Status' ]
Upload processing complete: 3 success, 0 errors
```

### Check Frontend Console
Press F12 in browser, go to Console tab:
```javascript
// You should see the upload response with results
```

### Test Backend Directly
Use Postman or curl to test:
```bash
curl -F "file=@your_file.xlsx" http://localhost:5000/api/profit-loss/upload
```

---

## ✨ FEATURES TO TEST

After upload, test:

1. **✅ Results Modal**
   - [ ] Modal displays with title "📊 Upload Results & Export"
   - [ ] Summary shows 4 metrics (Total, Delivered, RPU, Records)
   - [ ] Data table shows all columns

2. **✅ Error Handling**
   - [ ] Rows with errors show error messages
   - [ ] Error rows show row number reference
   - [ ] Success rows show calculations

3. **✅ Export Options**
   - [ ] "Export to Excel" button works
   - [ ] Creates file with summary + data sheets
   - [ ] "Export to PDF" creates HTML file

4. **✅ Color Coding**
   - [ ] Profit rows: GREEN background
   - [ ] Loss rows: RED background
   - [ ] RPU status: Red text with 🔄 icon
   - [ ] Delivered status: Green text with ✅ icon

---

## 📞 SUPPORT

If you encounter issues:

1. **Check the error message** - It now has:
   - Row number where error occurred
   - Specific field that failed
   - What the correct format should be

2. **Review server logs** - Run backend with:
   ```bash
   npm run dev
   ```
   This will show detailed logs of each row processed

3. **Verify test data** - Use the template file as reference
   - Download template
   - Edit it with your data
   - Upload it back

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Template download works
- [ ] Can upload test Excel file
- [ ] Results modal appears
- [ ] Calculations are correct (verified with manual math)
- [ ] Error rows show helpful messages
- [ ] Export to Excel works
- [ ] All data displays properly formatted

---

**All issues have been fixed. System is ready for testing!** 🚀