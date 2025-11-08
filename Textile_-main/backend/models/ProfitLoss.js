const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProfitLossSchema = new Schema({
  uploadId: { type: Schema.Types.ObjectId, ref: 'UploadedProfitSheet' },
  fileName: { type: String },
  uploadDate: { type: Date, default: Date.now },
  uploadedBy: { type: String, default: 'System' },

  // Row-level fields
  orderId: { type: String, index: true },
  sku: { type: String, index: true },
  comboName: { type: String },
  productNames: { type: String },
  quantity: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  payment: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  status: { type: String, default: 'delivered', index: true },
  paymentDate: { type: Date, index: true },
  
  // Enhanced product details
  productDetails: [{
    name: { type: String },
    barcode: { type: String },
    quantity: { type: Number },
    unitCost: { type: Number },
    totalCost: { type: Number }
  }],

  // reference to original row payload for debugging
  raw: { type: Schema.Types.Mixed }
}, { timestamps: true });

ProfitLossSchema.index({ paymentDate: -1 });
ProfitLossSchema.index({ sku: 1 });

module.exports = mongoose.model('ProfitLoss', ProfitLossSchema);
