const express = require('express');
const router = express.Router();
const Return = require('../models/Return');
const ProfitLoss = require('../models/ProfitLoss');
const Product = require('../models/Product');
const RTOProduct = require('../models/RTOProduct');

// GET all RTO/RPU products from returns and uploaded sheets
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching RTO/RPU products with query:', req.query);
    const { category, status, search } = req.query;
    const products = [];

    // Fetch from Returns collection
    console.log('📋 Checking Returns collection...');
    const returnFilter = {};
    if (category) returnFilter.category = category;
    
    const returns = await Return.find(returnFilter)
      .populate('items.product', 'name barcode price')
      .sort({ returnDate: -1 });
    
    console.log(`📊 Found ${returns.length} returns`);

    // Convert returns to RTO/RPU format
    returns.forEach(returnDoc => {
      returnDoc.items.forEach(item => {
        products.push({
          _id: `return_${returnDoc._id}_${item.product?._id || 'unknown'}`,
          rtoId: returnDoc.returnId,
          productName: item.productName || item.product?.name || 'Unknown Product',
          barcode: item.barcode || item.product?.barcode || '',
          category: returnDoc.category,
          quantity: item.quantity,
          price: item.unitPrice || 0,
          totalValue: item.total || 0,
          status: returnDoc.status || 'completed',
          dateAdded: returnDoc.returnDate,
          reason: returnDoc.reason,
          notes: `Customer: ${returnDoc.customerName}`,
          source: 'returns'
        });
      });
    });

    // Fetch from RTOProduct collection (direct entries)
    console.log('📦 Checking RTOProduct collection...');
    const rtoFilter = {};
    if (category) rtoFilter.category = category;
    
    const rtoEntries = await RTOProduct.find(rtoFilter)
      .populate('product', 'name barcode price')
      .sort({ dateAdded: -1 });
    
    console.log(`📝 Found ${rtoEntries.length} direct RTO/RPU entries`);
    
    rtoEntries.forEach(entry => {
      products.push({
        _id: `rto_${entry._id}`,
        rtoId: entry.rtoId,
        productName: entry.productName || entry.product?.name || 'Unknown Product',
        barcode: entry.barcode || entry.product?.barcode || '',
        category: entry.category,
        quantity: entry.quantity,
        price: entry.price || 0,
        totalValue: entry.totalValue || 0,
        status: entry.status || 'completed',
        dateAdded: entry.dateAdded,
        reason: entry.reason,
        notes: entry.notes || '',
        source: 'direct'
      });
    });

    // Fetch from uploaded sheets (ProfitLoss with RTO/RPU status)
    console.log('📊 Checking ProfitLoss collection...');
    const sheetFilter = {
      status: { $in: ['rto', 'rpu'] }
    };
    if (category) sheetFilter.status = category.toLowerCase();

    const sheetEntries = await ProfitLoss.find(sheetFilter).sort({ paymentDate: -1 });
    console.log(`📈 Found ${sheetEntries.length} RTO/RPU sheet entries`);
    
    sheetEntries.forEach(entry => {
      products.push({
        _id: `sheet_${entry._id}`,
        rtoId: entry.orderId || 'N/A',
        productName: entry.comboName || entry.productNames || 'Unknown Product',
        barcode: entry.sku || '',
        category: entry.status.toUpperCase(),
        quantity: entry.quantity || 0,
        price: entry.quantity > 0 ? (entry.purchasePrice / entry.quantity) : 0,
        totalValue: entry.purchasePrice || 0,
        status: 'completed',
        dateAdded: entry.paymentDate || entry.uploadDate,
        reason: 'From uploaded sheet',
        notes: `Upload: ${entry.fileName || 'Unknown'}`,
        source: 'upload'
      });
    });

    // Apply search filter
    let filteredProducts = products;
    if (search) {
      filteredProducts = products.filter(p =>
        p.productName?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
        p.rtoId?.toLowerCase().includes(search.toLowerCase())
      );
    }

    console.log(`✅ Returning ${filteredProducts.length} total products`);
    res.json(filteredProducts);
  } catch (error) {
    console.error('❌ Error fetching RTO/RPU products:', error);
    res.status(500).json({ message: error.message });
  }
});

// CREATE RTO/RPU product
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating RTO/RPU product:', req.body);
    const { productId, category, quantity, reason, notes, dateAdded } = req.body;
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Create RTO/RPU entry
    const rtoData = {
      product: productId,
      productName: product.name,
      barcode: product.barcode || '',
      category: category || 'RTO',
      quantity: quantity || 1,
      price: product.price || 0,
      totalValue: (product.price || 0) * (quantity || 1),
      status: 'completed',
      reason: reason || 'Product return/pickup',
      notes: notes || '',
      addedBy: 'Products Page',
      dateAdded: dateAdded ? new Date(dateAdded) : new Date()
    };
    
    const rtoEntry = await RTOProduct.create(rtoData);
    console.log('✅ RTO/RPU entry created:', rtoEntry._id);
    
    res.status(201).json({
      success: true,
      message: `${category} entry created successfully`,
      data: rtoEntry
    });
  } catch (error) {
    console.error('❌ Error creating RTO/RPU product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Debug route
router.get('/debug/all', async (req, res) => {
  try {
    console.log('🔍 Debug: Checking all collections...');
    
    const returns = await Return.find({});
    const allProfitLoss = await ProfitLoss.find({});
    const rtoRpuEntries = await ProfitLoss.find({ status: { $in: ['rto', 'rpu'] } });
    const directRTOEntries = await RTOProduct.find({});
    
    console.log(`📊 Returns: ${returns.length}`);
    console.log(`📈 All ProfitLoss: ${allProfitLoss.length}`);
    console.log(`🎯 RTO/RPU entries: ${rtoRpuEntries.length}`);
    console.log(`📝 Direct RTO entries: ${directRTOEntries.length}`);
    
    const stats = {
      totalReturns: returns.length,
      rtoReturns: returns.filter(r => r.category === 'RTO').length,
      rpuReturns: returns.filter(r => r.category === 'RPU').length,
      totalProfitLoss: allProfitLoss.length,
      totalSheetEntries: rtoRpuEntries.length,
      rtoSheetEntries: rtoRpuEntries.filter(s => s.status === 'rto').length,
      rpuSheetEntries: rtoRpuEntries.filter(s => s.status === 'rpu').length,
      totalDirectRTO: directRTOEntries.length,
      directRTOEntries: directRTOEntries.filter(r => r.category === 'RTO').length,
      directRPUEntries: directRTOEntries.filter(r => r.category === 'RPU').length,
      allStatuses: [...new Set(allProfitLoss.map(p => p.status))]
    };

    res.json({
      success: true,
      stats,
      sampleReturns: returns.slice(0, 2),
      sampleProfitLoss: rtoRpuEntries.slice(0, 2),
      sampleDirectRTO: directRTOEntries.slice(0, 2),
      message: `Found ${returns.length} returns, ${rtoRpuEntries.length} RTO/RPU sheet entries, and ${directRTOEntries.length} direct RTO/RPU entries`
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE RTO/RPU product
router.delete('/:id', async (req, res) => {
  try {
    console.log(`🗑️ DELETE request received for ID: ${req.params.id}`);
    console.log(`🗑️ Full request URL: ${req.originalUrl}`);
    console.log(`🗑️ Request method: ${req.method}`);
    
    const productId = req.params.id;
    
    // For returns-based products, delete from Returns collection
    if (productId.startsWith('return_')) {
      const returnId = productId.split('_')[1];
      console.log(`🔍 Attempting to delete return with ID: ${returnId}`);
      const deletedReturn = await Return.findByIdAndDelete(returnId);
      if (deletedReturn) {
        console.log(`✅ Successfully deleted return: ${returnId}`);
        return res.json({ message: 'Return deleted successfully', deletedId: returnId });
      } else {
        console.log(`❌ Return not found: ${returnId}`);
      }
    }
    
    // For direct RTO/RPU products, delete from RTOProduct collection
    if (productId.startsWith('rto_')) {
      const entryId = productId.split('_')[1];
      console.log(`🔍 Attempting to delete RTOProduct entry with ID: ${entryId}`);
      const deletedEntry = await RTOProduct.findByIdAndDelete(entryId);
      if (deletedEntry) {
        console.log(`✅ Successfully deleted RTOProduct entry: ${entryId}`);
        return res.json({ message: 'RTO/RPU entry deleted successfully', deletedId: entryId });
      } else {
        console.log(`❌ RTOProduct entry not found: ${entryId}`);
      }
    }
    
    // For sheet-based products, delete from ProfitLoss collection
    if (productId.startsWith('sheet_')) {
      const entryId = productId.split('_')[1];
      console.log(`🔍 Attempting to delete ProfitLoss entry with ID: ${entryId}`);
      const deletedEntry = await ProfitLoss.findByIdAndDelete(entryId);
      if (deletedEntry) {
        console.log(`✅ Successfully deleted ProfitLoss entry: ${entryId}`);
        return res.json({ message: 'Sheet entry deleted successfully', deletedId: entryId });
      } else {
        console.log(`❌ ProfitLoss entry not found: ${entryId}`);
      }
    }
    
    console.log(`❌ No matching product found for ID: ${productId}`);
    res.status(404).json({ message: 'Product not found', receivedId: productId });
  } catch (error) {
    console.error('❌ Error deleting RTO/RPU product:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

module.exports = router;