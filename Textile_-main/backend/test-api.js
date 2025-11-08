// Simple test to check if RTO API is working
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/rto-products/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'RTO API is working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/rto-products', (req, res) => {
  res.json([]);
});

app.get('/api/rto-products/debug/all', (req, res) => {
  res.json({
    success: true,
    stats: { total: 0, rto: 0, rpu: 0 },
    products: [],
    message: 'No products found'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/rto-products/test`);
});