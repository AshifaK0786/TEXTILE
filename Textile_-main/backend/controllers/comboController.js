const Combo = require('../models/Combo');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

const storage = multer.memoryStorage();

// Get all combos
exports.getAllCombos = async (req, res) => {
  try {
    const combos = await Combo.find({ isActive: true })
      .populate('products.product', 'name price barcode')
      .sort({ createdAt: -1 });
    res.json(combos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get combo by ID
exports.getComboById = async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id)
      .populate('products.product', 'name price barcode');
    if (!combo) {
      return res.status(404).json({ message: 'Combo not found' });
    }
    res.json(combo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get combo by barcode
exports.getComboByBarcode = async (req, res) => {
  try {
    const combo = await Combo.findOne({ barcode: req.params.barcode, isActive: true })
      .populate('products.product', 'name price barcode');
    if (!combo) {
      return res.status(404).json({ message: 'Combo not found' });
    }
    res.json(combo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new combo
exports.createCombo = async (req, res) => {
  try {
    // Check if barcode is provided
    if (!req.body.barcode) {
      return res.status(400).json({ message: 'Barcode is required' });
    }

    // Check if name or barcode already exists
    const existingCombo = await Combo.findOne({ 
      $or: [
        { barcode: req.body.barcode },
        { name: req.body.name }
      ]
    });
    if (existingCombo) {
      return res.status(400).json({ 
        message: `Combo already exists with ${existingCombo.name === req.body.name ? 'name' : 'barcode'}: ${existingCombo.name === req.body.name ? existingCombo.name : existingCombo.barcode}` 
      });
    }

    // Upload image if provided
    let imageUrl = null;
    if (req.file) {
      const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadResponse = await cloudinary.uploader.upload(fileStr, {
        folder: 'inventory-combos',
        transformation: [{ width: 800, height: 600, crop: 'limit' }, { quality: 'auto' }]
      });
      imageUrl = uploadResponse.secure_url;
    }

    const combo = new Combo({
      ...req.body,
      products: JSON.parse(req.body.products),
      imageUrl: imageUrl
    });

    const savedCombo = await combo.save();
    res.status(201).json(savedCombo);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ 
        message: `Combo with ${field} "${value}" already exists. Please use a different ${field}.` 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update combo
exports.updateCombo = async (req, res) => {
  try {
    const existingCombo = await Combo.findById(req.params.id);
    if (!existingCombo) {
      return res.status(404).json({ message: 'Combo not found' });
    }

    let updateData = { ...req.body };
    if (updateData.products) {
      updateData.products = JSON.parse(updateData.products);
    }

    // Handle image deletion
    if (req.body.deleteImage === 'true' && existingCombo.imageUrl) {
      const publicId = `inventory-combos/${existingCombo.imageUrl.split('/').pop().split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
      updateData.imageUrl = null;
    }

    // Upload new image if provided
    if (req.file) {
      if (existingCombo.imageUrl) {
        const publicId = `inventory-combos/${existingCombo.imageUrl.split('/').pop().split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      }
      const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadResponse = await cloudinary.uploader.upload(fileStr, {
        folder: 'inventory-combos',
        transformation: [{ width: 800, height: 600, crop: 'limit' }, { quality: 'auto' }]
      });
      updateData.imageUrl = uploadResponse.secure_url;
    }
    delete updateData.deleteImage;

    const combo = await Combo.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json(combo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete combo (soft delete)
exports.deleteCombo = async (req, res) => {
  try {
    const combo = await Combo.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!combo) {
      return res.status(404).json({ message: 'Combo not found' });
    }
    res.json({ message: 'Combo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Multer upload middleware
exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    if (filetypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpeg, jpg, png files are allowed!'), false);
    }
  }
});