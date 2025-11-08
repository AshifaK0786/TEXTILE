/**
 * One-off migration script to fix ProfitLoss.paymentDate using UploadedProfitSheet.uploadedData dates
 * Usage:
 *   cd backend
 *   node scripts/fixPaymentDates.js
 *
 * The script will:
 * - find ProfitLoss documents where paymentDate is null or equals uploadDate
 * - attempt to look up the parent UploadedProfitSheet by uploadId
 * - match a row from uploadedData by orderId or sku and copy its date into ProfitLoss.paymentDate
 * - print a summary of changes
 */

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const ProfitLoss = require('../models/ProfitLoss');
const UploadedProfitSheet = require('../models/UploadedProfitSheet');

const parseDateValue = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === 'number') {
    const days = Number(v);
    if (!isNaN(days)) {
      const utcDays = days - 25569;
      const ms = Math.round(utcDays * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d)) return d;
    }
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const asNum = Number(s);
    if (!isNaN(asNum)) {
      const days = asNum;
      const utcDays = days - 25569;
      const ms = Math.round(utcDays * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d)) return d;
    }
    const iso = new Date(s);
    if (!isNaN(iso)) return iso;
    const parts = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
      const p1 = Number(parts[1]);
      const p2 = Number(parts[2]);
      const p3 = Number(parts[3]);
      const year = p3 < 100 ? (p3 > 50 ? 1900 + p3 : 2000 + p3) : p3;
      const candidate = new Date(year, p2 - 1, p1);
      if (!isNaN(candidate)) return candidate;
    }
  }
  return null;
};

const run = async () => {
  await connectDB();

  console.log('Searching for ProfitLoss docs with missing or upload-date paymentDate...');

  // Find ProfitLoss where paymentDate is null or equals uploadDate (within small tolerance)
  const all = await ProfitLoss.find({}).lean();
  let candidates = [];
  for (const doc of all) {
    const pd = doc.paymentDate ? new Date(doc.paymentDate) : null;
    const ud = doc.uploadDate ? new Date(doc.uploadDate) : null;
    let isProblem = false;
    if (!pd) isProblem = true;
    else if (ud && Math.abs(pd.getTime() - ud.getTime()) < 1000 * 60) isProblem = true; // within 1 minute
    if (isProblem) candidates.push(doc);
  }

  console.log(`Found ${candidates.length} candidate ProfitLoss docs to examine.`);

  let updated = 0;
  for (const pl of candidates) {
    if (!pl.uploadId) continue;
    const up = await UploadedProfitSheet.findById(pl.uploadId).lean();
    if (!up || !Array.isArray(up.uploadedData)) continue;

    // Try to match by orderId then sku then fallback to first uploadedData
    const match = up.uploadedData.find(u => (u.orderId && pl.orderId && u.orderId === pl.orderId) || (u.sku && pl.sku && String(u.sku) === String(pl.sku)));
    const candidate = match || up.uploadedData[0];
    if (!candidate) continue;
    const parsed = parseDateValue(candidate.date || candidate.paymentDateRaw || candidate.paymentDate || null);
    if (parsed) {
      await ProfitLoss.updateOne({ _id: pl._id }, { $set: { paymentDate: parsed } });
      updated++;
      console.log(`Updated ProfitLoss ${pl._id} paymentDate -> ${parsed.toISOString()}`);
    }
  }

  console.log(`Migration complete. Updated ${updated} documents.`);
  process.exit(0);
};

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
