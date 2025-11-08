// Test script to verify RTO/RPU creation
const mongoose = require('mongoose');
const RTOProduct = require('./models/RTOProduct');
const Product = require('./models/Product');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/textile_inventory', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testRTOCreation() {
  try {
    console.log('🧪 Starting RTO/RPU creation test...');
    
    // Check if we have products
    const products = await Product.find({}).limit(5);
    console.log(`📦 Found ${products.length} products in database`);
    
    if (products.length === 0) {
      console.log('❌ No products found. Please add some products first.');
      return;
    }
    
    // Check existing RTO/RPU products
    const existingRTO = await RTOProduct.find({});
    console.log(`📋 Found ${existingRTO.length} existing RTO/RPU products`);
    
    // Create test RTO entry
    const testProduct = products[0];
    const testRTOData = {
      product: testProduct._id,
      productName: testProduct.name,
      barcode: testProduct.barcode || 'TEST-BARCODE',
      category: 'RTO',
      quantity: 2,
      price: testProduct.price || 100,
      totalValue: (testProduct.price || 100) * 2,
      status: 'completed',
      reason: 'Test creation script',
      notes: 'Created by test script to verify functionality',
      addedBy: 'Test Script'
    };
    
    console.log('📝 Creating test RTO entry with data:', testRTOData);
    const rtoEntry = await RTOProduct.create(testRTOData);
    console.log('✅ Test RTO entry created:', rtoEntry._id);
    
    // Create test RPU entry
    const testRPUData = {
      product: testProduct._id,
      productName: testProduct.name,
      barcode: testProduct.barcode || 'TEST-BARCODE-RPU',
      category: 'RPU',
      quantity: 1,
      price: testProduct.price || 100,
      totalValue: testProduct.price || 100,
      status: 'pending',
      reason: 'Test RPU creation',
      notes: 'Created by test script for RPU verification',
      addedBy: 'Test Script'
    };
    
    console.log('📝 Creating test RPU entry with data:', testRPUData);
    const rpuEntry = await RTOProduct.create(testRPUData);
    console.log('✅ Test RPU entry created:', rpuEntry._id);
    
    // Verify creation
    const allRTOProducts = await RTOProduct.find({}).populate('product');
    console.log(`🔍 Total RTO/RPU products after test: ${allRTOProducts.length}`);
    
    const rtoCount = allRTOProducts.filter(p => p.category === 'RTO').length;
    const rpuCount = allRTOProducts.filter(p => p.category === 'RPU').length;
    
    console.log(`📊 RTO products: ${rtoCount}`);
    console.log(`📊 RPU products: ${rpuCount}`);
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testRTOCreation();