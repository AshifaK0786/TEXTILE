const mongoose = require('mongoose');

const permanentComboFix = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/inventory");
    console.log('MongoDB Connected');
    
    const db = mongoose.connection.db;
    
    // Drop combos collection completely
    console.log('Dropping combos collection...');
    await db.collection('combos').drop().catch(() => console.log('Collection already dropped'));
    
    // Drop profitloss collection to avoid orphaned references
    console.log('Dropping profitloss collection...');
    await db.collection('profitlosses').drop().catch(() => console.log('Collection already dropped'));
    
    // Drop uploaded profit sheets
    console.log('Dropping uploaded profit sheets...');
    await db.collection('uploadedprofitsheets').drop().catch(() => console.log('Collection already dropped'));
    
    console.log('✅ All combo-related data cleared permanently');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

permanentComboFix();