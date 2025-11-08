const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Routes
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/buyers', require('./routes/buyers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/barcodes', require('./routes/barcodes'));
app.use('/api/barcode', require('./routes/barcode'));
app.use('/api/combos', require('./routes/combos'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/profit-loss', require('./routes/profitLoss'));
app.use('/api/rto-products', require('./routes/rtoProducts'));
app.use('/api/uploaded-profit-sheets', require('./routes/uploadedProfitSheets'));

// Debug: Log all routes
console.log('✓ Routes registered successfully');
console.log('✓ /api/rto-products endpoint available');
console.log('✓ /api/uploaded-profit-sheets endpoint available');

// Add a test route to verify RTO products endpoint
app.get('/api/rto-products/test', (req, res) => {
  res.json({ message: 'RTO Products endpoint is working', timestamp: new Date().toISOString() });
});

// PDF generation endpoints
app.get('/api/purchases/:id/invoice', async (req, res) => {
  try {
    const Purchase = require('./models/Purchase');
    const { generatePurchaseInvoice } = require('./utils/pdfGenerator');
    
    const purchase = await Purchase.findById(req.params.id)
      .populate('vendor', 'name contactPerson')
      .populate('items.product', 'name');
    
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    const pdfBuffer = await generatePurchaseInvoice(purchase);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=purchase-${purchase.purchaseId}.pdf`
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/sales/:id/invoice', async (req, res) => {
  try {
    const Sale = require('./models/Sale');
    const { generateSaleInvoice } = require('./utils/pdfGenerator');
    
    const sale = await Sale.findById(req.params.id)
      .populate('buyer', 'name phone')
      .populate('items.product', 'name barcode');
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    const pdfBuffer = await generateSaleInvoice(sale);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=sale-${sale.saleId}.pdf`
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});