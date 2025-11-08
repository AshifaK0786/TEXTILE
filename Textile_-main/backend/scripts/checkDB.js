const mongoose = require('mongoose');

const checkDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/inventory");
    console.log('MongoDB Connected');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check combos collection
    const combosCount = await db.collection('combos').countDocuments();
    console.log('Combos count:', combosCount);
    
    if (combosCount > 0) {
      const combos = await db.collection('combos').find({}).toArray();
      console.log('Combos:', combos);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkDB();