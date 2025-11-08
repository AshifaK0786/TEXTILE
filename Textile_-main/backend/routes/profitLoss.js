const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Combo = require('../models/Combo');
const Product = require('../models/Product');
const UploadedProfitSheet = require('../models/UploadedProfitSheet');
const RTOProduct = require('../models/RTOProduct');
const ProfitLoss = require('../models/ProfitLoss');

// Helper: robustly parse various date formats and Excel serial numbers into JS Date
const parseDateValue = (v) => {
  if (v === undefined || v === null || v === '') return null;

  // If already a Date object
  if (v instanceof Date && !isNaN(v)) return v;

  // If value is numeric or numeric-string => treat as Excel serial
  const tryExcelSerial = (num) => {
    const days = Number(num);
    if (isNaN(days)) return null;
    // Excel serial -> JS epoch: days since 1899-12-30 -> convert to ms since 1970-01-01
    // days - 25569 = days since 1970-01-01
    const utcDays = days - 25569;
    const ms = Math.round(utcDays * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  };

  if (typeof v === 'number') {
    const d = tryExcelSerial(v);
    if (d) return d;
  }

  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;

    // If looks like a pure number (maybe an excel serial in string form)
    if (/^\d+(?:\.\d+)?$/.test(s)) {
      const d = tryExcelSerial(Number(s));
      if (d) return d;
    }

    // Try ISO parse first (YYYY-MM-DD, YYYY/MM/DD, full ISO)
    const iso = new Date(s);
    if (!isNaN(iso)) return iso;

    // Try common dd/mm/yyyy or dd-mm-yyyy or mm/dd/yyyy
    const parts = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (parts) {
      const p1 = Number(parts[1]);
      const p2 = Number(parts[2]);
      const p3 = Number(parts[3]);
      const hour = parts[4] ? Number(parts[4]) : 0;
      const minute = parts[5] ? Number(parts[5]) : 0;
      const second = parts[6] ? Number(parts[6]) : 0;
      // Heuristic: if p1 > 12 then assume dd/mm/yyyy, otherwise try dd/mm then mm/dd
      let day = p1;
      let month = p2;
      let year = p3 < 100 ? (p3 > 50 ? 1900 + p3 : 2000 + p3) : p3;
      if (p1 <= 12 && p2 <= 12) {
        // ambiguous: assume dd/mm if common for uploads (India format), but still allow mm/dd fallback
        day = p1; month = p2;
      } else if (p1 > 12) {
        day = p1; month = p2;
      } else {
        // fallback
        day = p1; month = p2;
      }
      const candidate = new Date(year, month - 1, day, hour, minute, second);
      if (!isNaN(candidate)) return candidate;
    }
  }

  // Last resort: try Date.parse on any stringy input
  try {
    const parsed = new Date(String(v));
    if (!isNaN(parsed)) return parsed;
  } catch (e) {
    // ignore
  }

  return null;
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET profit/loss for date range from database
router.get('/', async (req, res) => {
  try {
    console.log('📊 GET /profit-loss endpoint called with query:', req.query);
    const { startDate, endDate } = req.query;
    const includeSales = req.query.includeSales === 'true';

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }

    let profitData = [];
    let totalProfit = 0;
    let deliveredProfit = 0;
    let rpuProfit = 0;
    let monthlyChartData = [];

    if (includeSales) {
      console.log('🔍 Fetching sales data...');
      // Get sales data with status filtering
      const salesData = await Sale.aggregate([
        {
          $match: {
            ...(startDate || endDate
              ? {
                  saleDate: {
                    ...(startDate && { $gte: new Date(startDate) }),
                    ...(endDate && {
                      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                    }),
                  },
                }
              : {}),
          },
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productDetails',
          },
        },
        {
          $lookup: {
            from: 'combos',
            localField: 'items.combo',
            foreignField: '_id',
            as: 'comboDetails',
          },
        },
        {
          $project: {
            _id: 1,
            saleDate: 1,
            status: 1,
            itemType: '$items.type',
            quantity: '$items.quantity',
            unitPrice: '$items.unitPrice',
            total: '$items.total',
            productDetails: { $arrayElemAt: ['$productDetails', 0] },
            comboDetails: { $arrayElemAt: ['$comboDetails', 0] },
          },
        },
      ]);

      // Calculate profit by comparing with purchase cost
      for (const sale of salesData) {
        let costPrice = 0;

        try {
          // Get cost price from purchase data
          if (sale.itemType === 'product' && sale.productDetails) {
            // Find purchase record for this product
            const purchase = await Purchase.findOne(
              { 'items.product': sale.productDetails._id },
              { 'items.$': 1, totalAmount: 1 }
            );

            if (purchase && purchase.items && purchase.items[0]) {
              costPrice = purchase.items[0].unitCost;
            }
          } else if (sale.itemType === 'combo' && sale.comboDetails) {
            // For combos, sum the cost of all products in the combo
            const combo = await Combo.findById(sale.comboDetails._id).populate('products.product');
            if (combo && combo.products && combo.products.length > 0) {
              for (const comboProduct of combo.products) {
                const purchase = await Purchase.findOne(
                  { 'items.product': comboProduct.product._id },
                  { 'items.$': 1 }
                );
                if (purchase && purchase.items && purchase.items[0]) {
                  costPrice += purchase.items[0].unitCost * comboProduct.quantity;
                }
              }
            } else {
              console.warn(`Combo ${sale.comboDetails._id} has no products or not found`);
            }
          }

          const profitPerUnit = sale.unitPrice - costPrice;
          let profitTotal = profitPerUnit * sale.quantity;

          // For RPU items, treat profit as negative
          const isRPU = sale.status === 'rpu' || sale.status === 'returned';
          if (isRPU) {
            profitTotal = -Math.abs(profitTotal);
          }

          const profitRecord = {
            saleId: sale._id,
            date: sale.saleDate,
            status: sale.status || 'delivered',
            itemType: sale.itemType,
            product: sale.productDetails?.name || sale.comboDetails?.name || 'Unknown',
            costPrice: costPrice,
            soldPrice: sale.unitPrice,
            quantity: sale.quantity,
            profitPerUnit: profitPerUnit,
            profitTotal: profitTotal,
          };

          profitData.push(profitRecord);

          if (isRPU) {
            rpuProfit += profitTotal;
          } else {
            deliveredProfit += profitTotal;
          }

          totalProfit += profitTotal;
        } catch (itemError) {
          console.error(`Error processing sale item ${sale._id}:`, itemError);
          // Continue processing other items instead of failing completely
        }
      }

      // Monthly breakdown for sales-derived profitData
      const monthlyProfit = {};
      profitData.forEach(record => {
        const dt = record.date ? new Date(record.date) : null;
        const month = dt ? dt.toISOString().slice(0, 7) : 'unknown';
        if (!monthlyProfit[month]) monthlyProfit[month] = { deliveredProfit: 0, rpuProfit: 0, totalProfit: 0, monthDate: dt ? new Date(dt.getFullYear(), dt.getMonth(), 1) : new Date() };
        if (record.status === 'rpu' || record.status === 'returned') {
          monthlyProfit[month].rpuProfit += record.profitTotal;
        } else {
          monthlyProfit[month].deliveredProfit += record.profitTotal;
        }
        monthlyProfit[month].totalProfit += record.profitTotal;
      });

      monthlyChartData = Object.entries(monthlyProfit)
        .map(([month, data]) => ({
          month,
          label: data.monthDate ? data.monthDate.toLocaleString(undefined, { month: 'short', year: 'numeric' }) : month,
          monthDate: data.monthDate ? data.monthDate.toISOString() : null,
          deliveredProfit: data.deliveredProfit,
          rpuProfit: data.rpuProfit,
          totalProfit: data.totalProfit,
        }))
        .sort((a, b) => (a.month > b.month ? 1 : (a.month < b.month ? -1 : 0)));
    }

    // Also include recent uploaded profit sheets (flatten uploadedData) so uploads are visible in the UI
    let uploadedProfitData = [];
    try {
      const recentUploads = await UploadedProfitSheet.find({}).sort({ uploadDate: -1 }).limit(50).lean();
      for (const up of recentUploads) {
        if (Array.isArray(up.uploadedData)) {
          // Map uploadedData entries into shape similar to profitData
          const mapped = up.uploadedData.map(u => ({
            saleId: null,
            // prefer spreadsheet date; do NOT fallback to uploadDate so charts use paymentDate
            date: u.date || null,
            status: u.status || 'delivered',
            itemType: 'uploaded',
            product: u.comboName || u.productNames || u.comboId || 'Uploaded Item',
            costPrice: u.costPrice || 0,
            soldPrice: u.soldPrice || 0,
            quantity: u.quantity || 0,
            profitPerUnit: u.profitPerUnit || (u.quantity ? (u.profitTotal / u.quantity) : 0),
            profitTotal: u.profitTotal || 0,
            sourceUploadId: up._id,
            // include original sheet identifiers if present
            orderId: u.orderId || '',
            sku: u.sku || u.comboId || '',
            productDetails: u.productDetails || []
          }));
          uploadedProfitData = uploadedProfitData.concat(mapped);
        }
      }
    } catch (uErr) {
      console.error('Error fetching uploaded profit sheets:', uErr);
    }
    // If sales were not included, compute monthlyChartData and summary from uploadedProfitData only
    if (!includeSales) {
      let uploadedTotalProfit = 0;
      let uploadedDeliveredProfit = 0;
      let uploadedRpuProfit = 0;
      const monthAgg = {};
      uploadedProfitData.forEach(rec => {
        const dt = rec.date ? new Date(rec.date) : null;
        const month = dt ? dt.toISOString().slice(0, 7) : 'unknown';
        if (!monthAgg[month]) monthAgg[month] = { totalProfit: 0, deliveredProfit: 0, rpuProfit: 0, monthDate: dt ? new Date(dt.getFullYear(), dt.getMonth(), 1) : new Date() };
        monthAgg[month].totalProfit += Number(rec.profitTotal || 0);
        if (rec.status === 'rpu' || rec.status === 'returned') {
          monthAgg[month].rpuProfit += Number(rec.profitTotal || 0);
          uploadedRpuProfit += Number(rec.profitTotal || 0);
        } else {
          monthAgg[month].deliveredProfit += Number(rec.profitTotal || 0);
          uploadedDeliveredProfit += Number(rec.profitTotal || 0);
        }
        uploadedTotalProfit += Number(rec.profitTotal || 0);
      });

      monthlyChartData = Object.entries(monthAgg)
        .map(([month, data]) => ({
          month,
          label: data.monthDate ? data.monthDate.toLocaleString(undefined, { month: 'short', year: 'numeric' }) : month,
          monthDate: data.monthDate ? data.monthDate.toISOString() : null,
          deliveredProfit: data.deliveredProfit,
          rpuProfit: data.rpuProfit,
          totalProfit: data.totalProfit
        }))
        .sort((a, b) => (a.month > b.month ? 1 : (a.month < b.month ? -1 : 0)));

      let totalPayment = 0, totalPurchase = 0;
      let deliveredPayment = 0, deliveredPurchase = 0, deliveredCount = 0;
      let rpuPayment = 0, rpuPurchase = 0, rpuCount = 0;
      
      uploadedProfitData.forEach(rec => {
        const payment = Number(rec.soldPrice || 0);
        const purchase = Number(rec.costPrice || 0);
        totalPayment += payment;
        totalPurchase += purchase;
        
        if (rec.status === 'rpu' || rec.status === 'returned') {
          rpuPayment += payment;
          rpuPurchase += purchase;
          rpuCount++;
        } else {
          deliveredPayment += payment;
          deliveredPurchase += purchase;
          deliveredCount++;
        }
      });

      const summaryUploaded = {
        totalProfit: Number(uploadedTotalProfit.toFixed(2)),
        deliveredProfit: Number(uploadedDeliveredProfit.toFixed(2)),
        rpuProfit: Number(uploadedRpuProfit.toFixed(2)),
        totalRecords: uploadedProfitData.length,
        totalPayment: Number(totalPayment.toFixed(2)),
        totalPurchase: Number(totalPurchase.toFixed(2)),
        deliveredPayment: Number(deliveredPayment.toFixed(2)),
        deliveredPurchase: Number(deliveredPurchase.toFixed(2)),
        deliveredCount,
        rpuPayment: Number(rpuPayment.toFixed(2)),
        rpuPurchase: Number(rpuPurchase.toFixed(2)),
        rpuCount
      };

      console.log(`✅ Returning uploaded-only profit data: ${uploadedProfitData.length} records`);
      return res.json({
        profitData: [],
        uploadedProfitData,
        monthlyChartData,
        summary: summaryUploaded,
      });
    }

    console.log(`✅ Successfully fetched ${profitData.length} profit records (+ ${uploadedProfitData.length} uploaded)`);
    // Get uploaded summary for breakdown calculation
    let uploadedSummary = { totalPayment: 0, totalPurchase: 0, deliveredPayment: 0, deliveredPurchase: 0, deliveredCount: 0, rpuPayment: 0, rpuPurchase: 0, rpuCount: 0 };
    uploadedProfitData.forEach(rec => {
      const payment = Number(rec.soldPrice || 0);
      const purchase = Number(rec.costPrice || 0);
      uploadedSummary.totalPayment += payment;
      uploadedSummary.totalPurchase += purchase;
      
      if (rec.status === 'rpu' || rec.status === 'returned') {
        uploadedSummary.rpuPayment += payment;
        uploadedSummary.rpuPurchase += purchase;
        uploadedSummary.rpuCount++;
      } else {
        uploadedSummary.deliveredPayment += payment;
        uploadedSummary.deliveredPurchase += purchase;
        uploadedSummary.deliveredCount++;
      }
    });

    // Calculate payment/purchase breakdown for sales data
    let salesPayment = 0, salesPurchase = 0;
    let salesDeliveredPayment = 0, salesDeliveredPurchase = 0, salesDeliveredCount = 0;
    let salesRpuPayment = 0, salesRpuPurchase = 0, salesRpuCount = 0;
    
    profitData.forEach(rec => {
      const payment = Number(rec.soldPrice || 0);
      const purchase = Number(rec.costPrice || 0);
      salesPayment += payment;
      salesPurchase += purchase;
      
      if (rec.status === 'rpu' || rec.status === 'returned') {
        salesRpuPayment += payment;
        salesRpuPurchase += purchase;
        salesRpuCount++;
      } else {
        salesDeliveredPayment += payment;
        salesDeliveredPurchase += purchase;
        salesDeliveredCount++;
      }
    });

    res.json({
      profitData,
      uploadedProfitData,
      monthlyChartData,
      summary: {
        totalProfit: Number(totalProfit.toFixed(2)),
        deliveredProfit: Number(deliveredProfit.toFixed(2)),
        rpuProfit: Number(rpuProfit.toFixed(2)),
        totalRecords: profitData.length + uploadedProfitData.length,
        totalPayment: Number((salesPayment + uploadedSummary.totalPayment).toFixed(2)),
        totalPurchase: Number((salesPurchase + uploadedSummary.totalPurchase).toFixed(2)),
        deliveredPayment: Number((salesDeliveredPayment + uploadedSummary.deliveredPayment).toFixed(2)),
        deliveredPurchase: Number((salesDeliveredPurchase + uploadedSummary.deliveredPurchase).toFixed(2)),
        deliveredCount: salesDeliveredCount + uploadedSummary.deliveredCount,
        rpuPayment: Number((salesRpuPayment + uploadedSummary.rpuPayment).toFixed(2)),
        rpuPurchase: Number((salesRpuPurchase + uploadedSummary.rpuPurchase).toFixed(2)),
        rpuCount: salesRpuCount + uploadedSummary.rpuCount
      },
    });
  } catch (error) {
    console.error('❌ Error calculating profit/loss:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: error.message,
      details: 'Check backend logs for full error',
      error: error.toString()
    });
  }
});

// POST upload (enhanced) - accepts SKU/Combo uploads and returns tabular results
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Read sheet as arrays to detect the actual header row (some sheets include extra title rows)
    const rowsArray = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Helper to normalize cell text the same way as headers
    const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

    // Score each row (0..4) by how many expected header tokens it contains; pick best match
    const headerCandidates = rowsArray.slice(0, 6); // examine first 6 rows for header
    const headerScores = headerCandidates.map((row, idx) => {
      if (!Array.isArray(row)) return 0;
      let score = 0;
      for (const cell of row) {
        const n = norm(cell);
        if (!n) continue;
        if (['sku', 'skuid', 'barcode', 'order', 'orderid', 'orderid', 'quantity', 'qty', 'payment', 'purchaseprice', 'profit'].some(k => n.includes(k))) {
          score++;
        }
      }
      return score;
    });

    const bestIndex = headerScores.indexOf(Math.max(...headerScores));
    let data = [];

    if (bestIndex >= 0 && headerScores[bestIndex] > 0) {
      // Build objects using the detected header row
      const headerRow = headerCandidates[bestIndex].map(h => String(h || '').trim());
      const dataRows = rowsArray.slice(bestIndex + 1);
      data = dataRows.map(r => {
        const obj = {};
        for (let i = 0; i < headerRow.length; i++) {
          const key = headerRow[i] || `col${i}`;
          obj[key] = r[i] !== undefined ? r[i] : '';
        }
        return obj;
      }).filter(row => Object.values(row).some(v => v !== ''));
    } else {
      // Fallback to default behavior: use first row as header
      data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    }

    if (!data || data.length === 0) return res.status(400).json({ message: 'No data found in Excel file' });

    const results = [];
    let totalQuantity = 0;
    let totalPurchasePrice = 0;
    let totalPayment = 0;
    let totalProfit = 0;

    // Helper: normalize header keys for robust lookup (remove all non-alphanumeric, toLowerCase)
    const normalize = (s) => String(s || '')
      .toLowerCase()
      .normalize('NFKD') // decompose unicode accents
      .replace(/[^a-z0-9]/g, '');

    // Helper: parse numeric-like strings, strip commas/currency and coerce to Number
    const parseNumber = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      if (typeof v === 'number' && !isNaN(v)) return v;
      let s = String(v).trim();
      // Remove common currency symbols and whitespace
      s = s.replace(/[,\s]+/g, ''); // remove commas and spaces
      s = s.replace(/[₹£€$]/g, '');
      // Remove any non-digit except dot and minus
      s = s.replace(/[^0-9.\-]/g, '');
      const n = Number(s);
      return isNaN(n) ? 0 : n;
    };

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      try {
        const row = data[rowIndex];
        const rowKeys = Object.keys(row || {});
        const normalizedKeyMap = {};
        for (const k of rowKeys) {
          normalizedKeyMap[normalize(k)] = k;
        }
        
        // Debug: show available headers and ALL data for first few rows
        if (rowIndex < 3) {
          console.log(`📝 Row ${rowIndex + 1} - Available headers:`, rowKeys);
          console.log(`📝 Row ${rowIndex + 1} - Normalized key map:`, normalizedKeyMap);
          console.log(`📝 Row ${rowIndex + 1} - ALL ROW DATA:`, row);
        }

        const findColumn = (patterns) => {
          for (const p of patterns) {
            const nk = normalize(p);
            // direct normalized match
            if (normalizedKeyMap[nk]) {
              const val = row[normalizedKeyMap[nk]];
              if (val !== undefined && val !== null && val !== '') return val;
            }
            // fallback: contains match on normalized keys
            const found = Object.keys(normalizedKeyMap).find(k => k.includes(nk));
            if (found) {
              const val = row[normalizedKeyMap[found]];
              if (val !== undefined && val !== null && val !== '') return val;
            }
          }
          return null;
        };

        // Look for SKU and order id using patterns including the exact Velpaari headers
        const skuId = findColumn(['SKU', 'sku', 'skuid', 'barcode', 'product', 'product(s)']);
        const orderId = findColumn(['Orderid', 'order id', 'order', 'invoice']) || `ORD-${Date.now()}-${rowIndex}`;
        const quantity = parseNumber(findColumn(['Quantity', 'Qty', 'quantity', 'qty'])) || 1;
        const payment = parseNumber(findColumn(['Payment', 'payment', 'amount', 'total', 'price', 'sold', 'sold price'])) || 0;
        // Try to extract a payment/date field from the row for use in persisted uploadedData
  // Simple approach: find ANY date value in the row
  let paymentDateRaw = null;
  let paymentDate = null;
  
  // Check every cell in the row for a date
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined && value !== null && value !== '') {
      const testDate = parseDateValue(value);
      if (testDate) {
        paymentDateRaw = value;
        paymentDate = testDate;
        console.log(`📅 Row ${rowIndex + 1}: Found date in column '${key}': ${value} -> ${testDate}`);
        break;
      }
    }
  }
  
  if (!paymentDate) {
    console.log(`❌ Row ${rowIndex + 1}: No date found in any column`);
  }
        const purchasePriceField = parseNumber(findColumn(['PurchasePrice', 'purchaseprice', 'original cost', 'purchase price', 'cost'])) || 0;
        const profitField = parseNumber(findColumn(['Profit', 'profit', 'profit/loss', 'profitloss'])) || null;
  // Read status field from sheet (Delivered / RPU / RTO etc.)
  const statusField = findColumn(['Status', 'status', 'orderstatus', 'paymentstatus', 'statusofproduct']) || '';
  const statusNorm = String(statusField || '').toLowerCase().trim();
  const isRTO = statusNorm.includes('rto');
  const isRPU = statusNorm.includes('rpu') || statusNorm.includes('returned') || statusNorm.includes('return');

        // If SKU column not found, try a few fallbacks: look for keys that include 'sku', or pick any cell value
        // that looks like a SKU/barcode (alphanumeric, dashes/underscores, not a date/number).
        let finalSku = skuId;
        if (!finalSku) {
          // 1) try to find a header key that contains 'sku'
          const skuKey = Object.keys(normalizedKeyMap).find(k => k.includes('sku'));
          if (skuKey) {
            finalSku = row[normalizedKeyMap[skuKey]];
          }
        }

        if (!finalSku) {
          // 2) try to find a value that looks like a SKU/barcode (alphanumeric, may include - _ )
          const possibleVal = Object.values(row).find(v => {
            if (v === undefined || v === null) return false;
            const s = String(v).trim();
            if (s.length < 3) return false;
            // skip pure numbers that look like quantities or amounts
            if (/^[0-9]+$/.test(s)) return false;
            // skip values that look like dates (simple ISO or dd/mm)
            if (/\d{4}-\d{2}-\d{2}/.test(s) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return false;
            // accept alphanumeric with - and _ and / and @ and .
            return /[A-Za-z0-9\-_@\.\/]{3,}/.test(s);
          });
          if (possibleVal) finalSku = possibleVal;
        }

        if (!finalSku) {
          // Last-ditch: take first non-numeric, non-date string cell (excluding orderId) as candidate SKU
          const candidate = Object.entries(row).map(([k, v]) => ({ k, v }))
            .filter(({ k, v }) => {
              if (v === undefined || v === null) return false;
              const s = String(v).trim();
              if (!s) return false;
              if (s === orderId) return false;
              if (/^[0-9]+$/.test(s)) return false;
              if (/\d{4}-\d{2}-\d{2}/.test(s) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return false;
              return s.length >= 2;
            })[0];

          if (candidate) {
            finalSku = candidate.v;
            // we'll attempt to use this candidate and continue processing; include a warning message later if not found
          } else {
            // include available headers to help diagnose mapping issues
            const headersList = Object.keys(normalizedKeyMap).map(k => normalizedKeyMap[k]).join(', ');
            results.push({
              sNo: rowIndex + 1,
              orderId: orderId,
              skuId: 'Missing',
              quantity: quantity,
              purchasePrice: Number((purchasePriceField * quantity).toFixed(2)),
              payment: Number(payment.toFixed(2)),
              profit: 0,
              status: 'Error',
              message: `SKU ID is required. Available headers: ${headersList}`,
              paymentDateRaw: paymentDateRaw || null
            });
            continue;
          }
        }

        const skuStr = String(finalSku).trim();

        // Step 1: Check comboID (SKU) and match with combo from combo page
        console.log(`🔍 Processing row ${rowIndex + 1}: Looking for combo/product with SKU: ${skuStr}`);
        
        let combo = await Combo.findOne({
          $or: [
            { comboId: skuStr },
            { name: skuStr },
            { barcode: skuStr },
            { comboId: { $regex: skuStr, $options: 'i' } },
            { name: { $regex: skuStr, $options: 'i' } },
            { barcode: { $regex: skuStr, $options: 'i' } }
          ]
        }).populate('products.product');

        // If not found by combo identifiers, try finding product by barcode and then combo containing it
        let product = null;
        if (!combo) {
          product = await Product.findOne({ 
            $or: [
              { barcode: skuStr },
              { barcode: { $regex: skuStr, $options: 'i' } }
            ]
          });
          if (product) {
            combo = await Combo.findOne({ 'products.product': product._id }).populate('products.product');
            console.log(`📦 Found product ${product.name} and associated combo: ${combo?.name || 'none'}`);
          }
        }

        // If still no combo, but a product was found, create a fallback combo-like object
        if (!combo && product) {
          combo = {
            name: product.name || skuStr,
            products: [ { product: product, quantity: 1 } ]
          };
          console.log(`⚠️ Using single product as fallback combo: ${product.name}`);
        }

        if (!combo) {
          console.log(`❌ No combo or product found for SKU: ${skuStr}`);
          // If combo/product not found, but the sheet provided a PurchasePrice, use it as fallback
          const fallbackPurchaseTotal = purchasePriceField ? (purchasePriceField * quantity) : 0;
          const fallbackProfit = (profitField !== null && !isNaN(profitField)) ? profitField : (payment - fallbackPurchaseTotal);

          results.push({
            sNo: rowIndex + 1,
            orderId: orderId,
            skuId: skuStr,
            date: paymentDate || null,
            paymentDateRaw: paymentDateRaw || null,
            quantity: quantity,
            purchasePrice: Number(fallbackPurchaseTotal.toFixed(2)),
            payment: Number(payment.toFixed(2)),
            profit: Number((isRTO ? 0 : fallbackProfit).toFixed(2)),
            status: statusNorm || 'Error',
            message: `Combo or product for "${skuStr}" not found`,
            comboName: '',
            productDetails: []
          });
          continue;
        }

        // Step 2: Fetch the products in the combo and their details
        console.log(`✅ Found combo: ${combo.name} with ${combo.products?.length || 0} products`);
        const productDetails = [];
        let purchasePricePerCombo = 0;
        
        for (const comboProduct of combo.products) {
          if (!comboProduct.product) continue;
          
          // Step 3: Find the original purchase price of each product
          const purchase = await Purchase.findOne(
            { 'items.product': comboProduct.product._id }, 
            { 'items.$': 1 }
          );
          
          let unitCost = 0;
          if (purchase && purchase.items && purchase.items[0]) {
            unitCost = purchase.items[0].unitCost;
          } else {
            // Fallback: use combo price divided by total products
            unitCost = combo.price ? (combo.price / combo.products.length) : 0;
          }
          
          const productCost = unitCost * comboProduct.quantity;
          purchasePricePerCombo += productCost;
          
          productDetails.push({
            name: comboProduct.product.name,
            barcode: comboProduct.product.barcode,
            quantity: comboProduct.quantity,
            unitCost: unitCost,
            totalCost: productCost
          });
          
          console.log(`  📋 Product: ${comboProduct.product.name}, Qty: ${comboProduct.quantity}, Unit Cost: $${unitCost}, Total: $${productCost}`);
        console.log(`  💰 Combo price: ${combo.price}, Products count: ${combo.products.length}, Calculated unit cost: ${combo.price ? (combo.price / combo.products.length) : 0}`);
        } 
          const totalPurchasePriceForOrder = (purchasePriceField && purchasePriceField > 0)
          ? (purchasePriceField * quantity)
          : (purchasePricePerCombo * quantity);

        // Calculate profit based on status
        let profit;
        if (profitField !== null && !isNaN(profitField)) {
          profit = profitField; // Use sheet value if provided
        } else {
          // Calculate based on status
          if (isRTO) {
            profit = -totalPurchasePriceForOrder; // RTO: -original_cost
          } else if (isRPU) {
            profit = -(payment - totalPurchasePriceForOrder); // RPU: -(sold_price - original_cost)
          } else {
            profit = payment - totalPurchasePriceForOrder; // DELIVERED: sold_price - original_cost
          }
        }

        // Prefer spreadsheet status (delivered/rpu/rto) for successful rows
        const rowStatus = statusNorm || 'delivered';
        // Step 4: Calculate final profit with all details
        console.log(`💰 Combo: ${combo.name}, Purchase Cost: $${totalPurchasePriceForOrder}, Sold Price: $${payment}, Profit: $${profit}`);
        
        const calculationDetails = {
          comboName: combo.name,
          soldPrice: payment,
          originalPrice: totalPurchasePriceForOrder,
          profit: profit,
          calculation: `$${payment} - $${totalPurchasePriceForOrder} = $${profit}`
        };
        
        const resultRow = {
          sNo: rowIndex + 1,
          orderId: orderId,
          skuId: skuStr,
          date: paymentDate,
          paymentDateRaw: paymentDateRaw,
          quantity: quantity,
          purchasePrice: Number(totalPurchasePriceForOrder.toFixed(2)),
          payment: Number(payment.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          status: rowStatus,
          comboName: combo.name,
          productDetails: productDetails,
          calculationDetails: calculationDetails,
          message: `Found combo "${combo.name}" with ${productDetails.length} products. Calculation: ${calculationDetails.calculation}`
        };
        
        results.push(resultRow);
        
        // Create RTO/RPU entries for tracking
        if (isRTO || isRPU) {
          try {
            console.log(`📦 Creating ${isRTO ? 'RTO' : 'RPU'} entries for ${productDetails.length} products`);
            for (const productDetail of productDetails) {
              const product = await Product.findOne({ name: productDetail.name });
              if (product) {
                const rtoData = {
                  product: product._id,
                  productName: product.name,
                  barcode: product.barcode || '',
                  category: isRTO ? 'RTO' : 'RPU',
                  quantity: productDetail.quantity * quantity,
                  price: productDetail.unitCost,
                  totalValue: productDetail.totalCost * quantity,
                  status: 'completed',
                  reason: `From uploaded sheet: ${orderId}`,
                  notes: `Combo: ${combo.name}, Payment: $${payment}`,
                  addedBy: 'Excel Upload',
                  dateAdded: paymentDate || new Date()
                };
                console.log(`📝 Creating RTO/RPU entry with payment date:`, { ...rtoData, paymentDate });
                const rtoEntry = await RTOProduct.create(rtoData);
                console.log(`✅ Created RTO/RPU entry with ID: ${rtoEntry._id}`);
              } else {
                console.log(`❌ Product not found for RTO/RPU entry: ${productDetail.name}`);
              }
            }
          } catch (rtoError) {
            console.error('❌ Error creating RTO/RPU entry:', rtoError);
          }
        }
        totalQuantity += quantity;
        totalPurchasePrice += totalPurchasePriceForOrder;
        totalPayment += payment;
        totalProfit += profit;
        
        console.log(`📊 Row ${rowIndex + 1} processed: SKU=${skuStr}, Status=${rowStatus}, Profit=${profit}`);

      } catch (error) {
        console.error(`❌ Error processing row ${rowIndex + 1}:`, error);
        results.push({
          sNo: rowIndex + 1,
          orderId: `ORD-${Date.now()}-${rowIndex}`,
          skuId: 'Error',
          date: null,
          paymentDateRaw: null,
          quantity: 0,
          purchasePrice: 0,
          payment: 0,
          profit: 0,
          status: 'Error',
          message: error.message
        });
      }
    }
    const totals = {
      totalQuantity,
      totalPurchasePrice: Number(totalPurchasePrice.toFixed(2)),
      totalPayment: Number(totalPayment.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2))
    };
    try {
      const uploadedDoc = new UploadedProfitSheet({
        fileName: req.file.originalname || `upload_${Date.now()}`,
        uploadDate: new Date(),
        uploadedBy: req.user?.username || 'System',
        totalRecords: results.length,
        successRecords: results.filter(r => r.status === 'Success').length,
        errorRecords: results.filter(r => r.status === 'Error').length,
        profitSummary: {
          totalProfit: Number(totalProfit.toFixed(2)),
          deliveredProfit: Number(totalProfit.toFixed(2)),
          rpuProfit: 0,
          rtoProfit: 0,
          netProfit: Number(totalProfit.toFixed(2))
        },
        uploadedData: results.map(r => {
          // Normalize saved status to allowed enum: delivered, rpu, rto
          let savedStatus = 'delivered';
          if (r.status && typeof r.status === 'string') {
            const s = r.status.toLowerCase();
            if (s.includes('rpu')) savedStatus = 'rpu';
            else if (s.includes('rto')) savedStatus = 'rto';
            else savedStatus = 'delivered';
          }
          const profitTotalRaw = Number(r.profit || 0);
          const profitTotal = savedStatus === 'rto' ? 0 : profitTotalRaw;
          // Prefer sheet payment date (parsed) and do NOT default to uploadDate here
          const parsedDate = parseDateValue(r.paymentDateRaw || r.date);
          return {
            comboId: r.skuId || r.comboId || '',
            // preserve original identifiers from the sheet for frontend display
            orderId: r.orderId || r.order || '',
            sku: r.skuId || r.sku || r.comboId || '',
            comboName: r.comboName || '',
            productNames: r.productDetails ? r.productDetails.map(p => p.name).join(', ') : (r.productNames || ''),
            quantity: Number(r.quantity) || 0,
            costPrice: Number((r.purchasePrice || r.costPrice || 0)),
            soldPrice: Number(r.payment || r.soldPrice || 0),
            profitPerUnit: r.quantity ? Number((profitTotal / r.quantity).toFixed(2)) : 0,
            profitTotal: profitTotal,
            status: savedStatus,
            date: parsedDate
          };
        }),
        status: 'completed',
        notes: ''
      });
      await uploadedDoc.save();

      // Persist each row as a permanent ProfitLoss document for easier querying
      try {
        const plEntries = results.map(r => ({
          uploadId: uploadedDoc._id,
          fileName: uploadedDoc.fileName,
          uploadDate: uploadedDoc.uploadDate,
          uploadedBy: uploadedDoc.uploadedBy,
          orderId: r.orderId || r.order || '',
          sku: r.skuId || r.sku || r.comboId || '',
          comboName: r.comboName || '',
          productNames: r.productDetails ? r.productDetails.map(p => p.name).join(', ') : (r.productNames || ''),
          productDetails: r.productDetails || [],
          quantity: Number(r.quantity || r.qty || 0),
          purchasePrice: Number(r.purchasePrice || r.costPrice || 0),
          payment: Number(r.payment || r.soldPrice || 0),
          profit: Number(r.profit || r.profitTotal || 0),
          status: r.status || 'delivered',
          // Use the payment date from the Excel sheet
          paymentDate: r.date,
          raw: r
        }));

        if (plEntries.length > 0) {
          await ProfitLoss.insertMany(plEntries);
          console.log(`💾 Persisted ${plEntries.length} ProfitLoss entries to DB`);
        }
      } catch (plErr) {
        console.error('Error persisting ProfitLoss entries:', plErr);
      }
    } catch (persistErr) {
      console.error('Error saving uploaded profit sheet:', persistErr);
    }

    res.json({ results, totals, summary: { totalRecords: results.length, successRecords: results.filter(r => r.status === 'Success').length, errorRecords: results.filter(r => r.status === 'Error').length } });

  } catch (error) {
    console.error('❌ Error processing Excel file:', error);
    res.status(500).json({ message: error.message || 'Internal error' });
  }
});
// TEST endpoint for RTO/RPU creation
router.post('/test-rto', async (req, res) => {
  try {
    console.log('🧪 TEST: Creating RTO/RPU entry with data:', req.body);
    
    // Find a test product
    const testProduct = await Product.findOne({});
    if (!testProduct) {
      return res.status(404).json({ message: 'No products found for testing' });
    }
    
    const testRTOData = {
      product: testProduct._id,
      productName: testProduct.name,
      barcode: testProduct.barcode || 'TEST-BARCODE',
      category: 'RTO',
      quantity: 1,
      price: testProduct.price || 100,
      totalValue: testProduct.price || 100,
      status: 'completed',
      reason: 'Test creation from API',
      notes: 'This is a test RTO entry',
      addedBy: 'Test API'
    };
    
    const rtoEntry = await RTOProduct.create(testRTOData);
    console.log('✅ Test RTO entry created:', rtoEntry);
    
    res.json({
      success: true,
      message: 'Test RTO entry created successfully',
      rtoEntry,
      testProduct: {
        id: testProduct._id,
        name: testProduct.name,
        barcode: testProduct.barcode
      }
    });
  } catch (error) {
    console.error('❌ Test RTO creation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Test RTO creation failed',
      error: error.message 
    });
  }
});

module.exports = router;

// Debug endpoint: list latest uploaded profit sheets (for verification)
// GET /profit-loss/uploads/latest?limit=10
router.get('/uploads/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const docs = await UploadedProfitSheet.find({}).sort({ uploadDate: -1 }).limit(limit).lean();
    return res.json({ count: docs.length, uploads: docs });
  } catch (err) {
    console.error('Error fetching latest uploads:', err);
    return res.status(500).json({ message: 'Failed to fetch latest uploads', error: err.toString() });
  }
});

// GET /profit-loss/entries - query persisted ProfitLoss entries
router.get('/entries', async (req, res) => {
  try {
    const { startDate, endDate, sku, orderId, limit } = req.query;
    const q = {};
    if (startDate || endDate) {
      q.paymentDate = {};
      if (startDate) q.paymentDate.$gte = new Date(startDate);
      if (endDate) q.paymentDate.$lte = new Date(new Date(endDate).setHours(23,59,59,999));
    }
    if (sku) q.sku = sku;
    if (orderId) q.orderId = orderId;
    const docs = await ProfitLoss.find(q).sort({ paymentDate: -1 }).limit(parseInt(limit,10) || 200).lean();
    return res.json({ count: docs.length, entries: docs });
  } catch (err) {
    console.error('Error fetching ProfitLoss entries:', err);
    return res.status(500).json({ message: 'Failed to fetch ProfitLoss entries', error: err.toString() });
  }
});

// DELETE /profit-loss/uploads/:id - delete uploaded sheet and all related records
router.delete('/uploads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Attempting to delete upload: ${id}`);
    
    // Convert to ObjectId if needed
    const uploadId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    
    // Delete the sheet completely
    const deletedSheet = await UploadedProfitSheet.findByIdAndDelete(uploadId);
    
    if (!deletedSheet) {
      console.log(`❌ Upload not found: ${id}`);
      return res.status(404).json({ message: 'Upload not found' });
    }
    
    // First check what entries exist
    const existingEntries = await ProfitLoss.find({ 
      $or: [
        { uploadId: id },
        { uploadId: uploadId }
      ]
    });
    console.log(`Found ${existingEntries.length} entries to delete for upload ${id}`);
    
    // Delete all related ProfitLoss entries using both string and ObjectId
    const deletedEntries = await ProfitLoss.deleteMany({ 
      $or: [
        { uploadId: id },
        { uploadId: uploadId }
      ]
    });
    
    console.log(`✅ Deleted upload ${id}: ${deletedEntries.deletedCount} profit/loss entries removed`);
    
    return res.json({ 
      message: 'Upload and all related records deleted successfully',
      deletedSheet: deletedSheet.fileName,
      deletedEntries: deletedEntries.deletedCount
    });
  } catch (err) {
    console.error('❌ Error deleting upload:', err);
    return res.status(500).json({ message: 'Failed to delete upload', error: err.toString() });
  }
});

// GET /debug-combos - show all combos for debugging (moved to top)
router.get('/debug-combos', async (req, res) => {
  console.log('🔍 Debug combos endpoint called');
  try {
    const allCombos = await Combo.find({});
    console.log(`📊 Found ${allCombos.length} combos in database`);
    
    res.json({ 
      success: true,
      count: allCombos.length,
      combos: allCombos,
      message: `Found ${allCombos.length} combos in database`
    });
  } catch (err) {
    console.error('❌ Debug combos error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// GET /profit-loss/combo-details/:sku - get detailed combo and product information for a SKU
router.get('/combo-details/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    console.log(`🔍 Looking up combo details for SKU: ${sku}`);
    
    // Get all combos for debugging
    const allCombos = await Combo.find({}, { comboId: 1, name: 1, barcode: 1 });
    console.log('📋 All combos in DB:', allCombos);
    
    // Get first combo if search fails (for testing)
    const searchSku = sku.trim();
    let combo = await Combo.findOne().populate('products.product');
    
    if (!combo) {
      // If no combos exist at all, try to find by search
      combo = await Combo.findOne({
        $or: [
          { comboId: { $regex: searchSku, $options: 'i' } },
          { name: { $regex: searchSku, $options: 'i' } },
          { barcode: { $regex: searchSku, $options: 'i' } }
        ]
      }).populate('products.product');
    }
    
    console.log(`🎯 Combo search result for "${searchSku}":`, combo ? `Found: ${combo.name} (ID: ${combo.comboId}, Barcode: ${combo.barcode})` : 'Not found');

    // Try finding product by barcode
    let product = null;
    if (!combo) {
      product = await Product.findOne({ 
        $or: [
          { barcode: sku },
          { barcode: { $regex: sku, $options: 'i' } }
        ]
      });
      
      if (product) {
        combo = await Combo.findOne({ 'products.product': product._id }).populate('products.product');
      }
    }

    // Always return 200 with found status
    if (!combo && !product) {
      return res.json({ 
        found: false,
        sku: sku,
        message: `No combo or product found for SKU: ${sku}`,
        totalCombos: allCombos.length,
        allCombos: allCombos,
        suggestion: `Check if combo exists with different identifier. Available combos: ${allCombos.map(c => c.name || c.comboId).join(', ')}`
      });
    }

    // Step 2: Fetch the products in the combo and their details
    const productDetails = [];
    let totalPurchasePrice = 0;
    
    if (combo && combo.products) {
      for (const comboProduct of combo.products) {
        if (!comboProduct.product) continue;
        
        // Step 3: Find the original purchase price of each product
        const purchase = await Purchase.findOne(
          { 'items.product': comboProduct.product._id }, 
          { 'items.$': 1 }
        );
        
        let unitCost = 0;
        if (purchase && purchase.items && purchase.items[0]) {
          unitCost = purchase.items[0].unitCost;
        } else {
          // Fallback: use individual product price from product database
          unitCost = comboProduct.product.price || 0;
          console.log(`  🔄 Using product price: ${comboProduct.product.name} = $${unitCost}`);
        }
        
        const productCost = unitCost * comboProduct.quantity;
        totalPurchasePrice += productCost;
        
        productDetails.push({
          name: comboProduct.product.name,
          barcode: comboProduct.product.barcode,
          quantity: comboProduct.quantity,
          unitCost: unitCost,
          totalCost: productCost
        });
      }
    } else if (product) {
      // Single product case
      const purchase = await Purchase.findOne(
        { 'items.product': product._id }, 
        { 'items.$': 1 }
      );
      
      let unitCost = 0;
      if (purchase && purchase.items && purchase.items[0]) {
        unitCost = purchase.items[0].unitCost;
      } else {
        // Fallback: use individual product price
        unitCost = product.price || 0;
        console.log(`  🔄 Using individual product price: ${product.name} = $${unitCost}`);
      }
      
      totalPurchasePrice = unitCost;
      productDetails.push({
        name: product.name,
        barcode: product.barcode,
        quantity: 1,
        unitCost: unitCost,
        totalCost: unitCost
      });
    }

    // Get all profit/loss records for this combo
    const profitRecords = await ProfitLoss.find({
      $or: [
        { sku: sku },
        { sku: combo?.name },
        { sku: combo?.comboId },
        { sku: combo?.barcode }
      ]
    }).sort({ paymentDate: -1 }).limit(50);

    return res.json({
      found: true,
      sku: sku,
      combo: combo ? {
        id: combo._id,
        comboId: combo.comboId,
        name: combo.name,
        barcode: combo.barcode,
        price: combo.price
      } : null,
      productDetails: productDetails,
      totalPurchasePrice: Number(totalPurchasePrice.toFixed(2)),
      productCount: productDetails.length,
      profitRecords: profitRecords,
      recordsCount: profitRecords.length
    });
  } catch (err) {
    console.error('Error fetching combo details:', err);
    return res.status(500).json({ 
      message: 'Failed to fetch combo details', 
      error: err.toString() 
    });
  }
});