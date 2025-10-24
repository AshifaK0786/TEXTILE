# 🚀 Quick Start Guide - Profit & Loss System

## Installation & Setup

### Step 1: Install Frontend Dependencies
```bash
cd "Inventory-Management-dev\frontend"
npm install
```

### Step 2: Start Backend Server
```bash
cd "Inventory-Management-dev\backend"
npm run dev
# Should show: Server is running on port 5000
# Should show: MongoDB Connected: localhost
```

### Step 3: Start Frontend Application
```bash
cd "Inventory-Management-dev\frontend"
npm start
# Should open http://localhost:3000 in browser
```

### Step 4: Navigate to Profit & Loss Page
1. Click on "Reports" in sidebar
2. Click on "Profit & Loss"
3. You should see the page with filters and upload section

---

## 🎯 Testing the System

### Test 1: Database Query (Date Range Filter)

**Step 1**: Make sure you have sales data in the database
- Go to Sales page
- Create a few test sales with:
  - Status: "completed" (it will be treated as "delivered")
  - Some with date in January 2024
  - Some with date in February 2024

**Step 2**: Go to Profit & Loss page
- Select Start Date: 2024-01-01
- Select End Date: 2024-02-28
- Click "Fetch Data"

**Expected Results**:
- ✅ Chart showing monthly profit trend
- ✅ Table showing transactions
- ✅ Summary cards with totals

**If Error**: Check backend logs for database connection issues

---

### Test 2: Excel Upload - Valid Data

**Step 1**: Download Template
- Click "Download Template" button
- Opens `profit_loss_template.xlsx`
- Check that it has "Data Template" and "Instructions" sheets

**Step 2**: Prepare Test Data
- Open the template
- Modify the example data or keep as-is
- Make sure columns are:
  - PaymentDate (date format)
  - ComboID (must exist in your database)
  - SoldPrice (number)
  - Quantity (number)
  - Status (Delivered or RPU)

**Step 3**: Upload File
- Click "Choose Excel File"
- Select the template file
- Wait for upload (should take 2-5 seconds)

**Expected Results**:
- ✅ Modal opens showing results
- ✅ Summary with Total Profit/Loss, Delivered Profit, RPU Loss
- ✅ Table showing each row processed
- ✅ All values properly formatted

**What to Check**:
- ComboID matches your combo
- Profit/Loss calculated correctly
- Status shows as "✅ Delivered" or "🔄 RPU"

---

### Test 3: Excel Upload - Invalid Data

**Step 1**: Create Test File with Errors
- Open template
- Add rows with:
  - Missing ComboID
  - Invalid SoldPrice (negative or text)
  - Non-existent ComboID
  - Quantity = 0

**Step 2**: Upload File
- Click "Choose Excel File"
- Select the test file
- Wait for upload

**Expected Results**:
- ✅ Modal shows both successful and failed rows
- ✅ Error rows clearly marked with ❌
- ✅ Error messages specific to each issue
- ✅ Row numbers shown for easy identification

**What to Check**:
- Error message describes the problem
- Row number helps locate the issue
- Valid rows still processed successfully

---

### Test 4: RPU (Return) Handling

**Step 1**: Upload Excel with RPU Items
- Create file with Status = "RPU" or "returned"
- SoldPrice = $100
- Combo with cost = $60

**Step 2**: Review Results
- Check the modal results

**Expected Results**:
- ✅ RPU shows with 🔄 icon
- ✅ Profit shows as negative (e.g., -$40)
- ✅ RPU Loss summary shows negative value
- ✅ Total Profit/Loss = Delivered Profit + RPU Loss

**Calculation Verification**:
```
Profit Per Item = $100 - $60 = $40
If Quantity = 2: Total = $40 × 2 = $80
For RPU: Shows as -$80 (negative)
```

---

### Test 5: Export to Excel

**Step 1**: After uploading data
- In the modal, click "Export to Excel" button
- File `profit_loss_upload_report.xlsx` downloads

**Step 2**: Open downloaded file
- Should have 2 sheets:
  - "Profit Loss": Detailed transaction data
  - "Summary": Summary statistics

**Expected Contents**:
- ✅ Sheet 1: All transaction rows with proper formatting
- ✅ Sheet 2: Total Profit/Loss, Delivered Profit, RPU Loss, Total Records
- ✅ Currency values properly formatted
- ✅ All dates correct

---

### Test 6: Export to PDF

**Step 1**: In the modal
- Click "Export to PDF" button
- An HTML file downloads

**Step 2**: Open HTML file in browser
- Should show formatted report
- Summary section at top
- Detailed records table below

**Step 3**: Print to PDF
- Right-click → Print (or Ctrl+P)
- Select "Save as PDF"
- Choose location and save

**Expected Results**:
- ✅ Professional looking report
- ✅ Color-coded values (green for profit, red for loss)
- ✅ All information included
- ✅ Proper pagination

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Combo not found" error

**Cause**: ComboID in Excel doesn't match database
**Solution**:
1. Go to Combos page
2. Copy exact ComboID from the list
3. Paste into Excel template
4. Retry upload

**Or**: Use combo name instead of ID

---

### Issue 2: "Invalid SoldPrice" error

**Cause**: Price is negative, zero, or text
**Solution**:
1. Check price value in Excel
2. Make sure it's a positive number
3. Format as "Number" in Excel (not text)
4. Remove any currency symbols ($, €, etc.)
5. Retry upload

---

### Issue 3: "Missing required fields" error

**Cause**: Column is empty or spelled differently
**Solution**:
1. Check Excel column headers are exactly:
   - PaymentDate
   - ComboID
   - SoldPrice
   - Quantity
   - Status
2. Column names are case-sensitive
3. No extra spaces
4. All rows have all values

---

### Issue 4: No data appears after "Fetch Data"

**Cause**: No sales in selected date range
**Solution**:
1. Go to Sales page
2. Create some test sales
3. Make sure sale dates are within your date range
4. Try a wider date range
5. Check database connection in backend logs

---

### Issue 5: Calculation doesn't match expectations

**Cause**: Cost price not found in Purchase records
**Solution**:
1. Go to Purchases page
2. Make sure products have purchase records
3. Check that purchase has "Unit Cost" filled
4. Products in combo must have purchases
5. If missing, profit = selling price (no cost deduction)

---

## 📊 Understanding the Summary

### Delivered Profit ✅
- Sales that are successfully delivered
- Shows as positive number (green)
- Example: $1,500.00

### RPU Loss 🔄
- Returns or replaced units
- Shows as negative number (red)
- Example: -$200.00

### Total Profit/Loss
- Final calculation
- Formula: Delivered + RPU (which is negative)
- Example: $1,500.00 + (-$200.00) = $1,300.00

### Total Records
- How many rows were successfully processed
- Doesn't include error rows

---

## 🔧 Troubleshooting Checklist

Before asking for help, check:

- [ ] Backend server is running (port 5000)
- [ ] Frontend is running (port 3000)
- [ ] MongoDB is running and connected
- [ ] Excel file columns are correctly named
- [ ] Excel file uses .xlsx format (not .xls or .csv)
- [ ] ComboID values exist in database
- [ ] All prices are positive numbers
- [ ] Date format is YYYY-MM-DD
- [ ] Status is "Delivered" or "RPU"
- [ ] No blank rows in Excel (except headers)
- [ ] File size is less than 5MB

---

## 💡 Pro Tips

1. **Batch Upload**: You can upload Excel files multiple times. Each upload is separate.

2. **Template**: Always use the downloaded template to ensure correct format.

3. **Date Range**: Use wider date ranges to see more data.

4. **Error Fixing**: Fix errors in Excel and re-upload. System will process only valid rows.

5. **Export Workflow**: 
   - Get data ready
   - Upload and verify
   - Export to Excel for records
   - Use Excel data for further analysis

6. **Performance**: For large uploads (1000+ rows), may take 10-30 seconds.

7. **Browser Print**: For PDF export, use Chrome/Firefox browser print (Ctrl+P).

---

## 📞 Getting Help

If something doesn't work:

1. Check backend logs (terminal running backend):
   - Look for error messages
   - Check MongoDB connection status

2. Check frontend console (F12 in browser):
   - Look for red error messages
   - Note any specific errors

3. Review error message from system:
   - System provides specific feedback
   - Row numbers help identify issues
   - Field-specific messages guide fixes

4. Check this guide for common issues

---

## 🎉 You're All Set!

Your Profit & Loss system is ready to use. 

**Next Steps**:
1. Test with sample data
2. Try different date ranges
3. Upload Excel files
4. Export reports
5. Check calculations

**Questions?** Refer to the Audit Report or this guide.

Happy analyzing! 📊✨