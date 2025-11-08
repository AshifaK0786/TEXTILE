const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/inventory");
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const fixComboIndexes = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('combos');
    
    // Drop all existing indexes except _id
    console.log('Dropping existing indexes...');
    await collection.dropIndexes();
    
    // Clear any remaining documents
    console.log('Clearing collection...');
    await collection.deleteMany({});
    
    // Recreate necessary indexes
    console.log('Creating new indexes...');
    await collection.createIndex({ name: 1 }, { unique: true });
    await collection.createIndex({ barcode: 1 }, { unique: true });
    await collection.createIndex({ comboId: 1 }, { unique: true });
    
    console.log('✅ Combo indexes fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
};

fixComboIndexes();