# Profit/Loss Enhancement - Combo Processing

## Overview
Enhanced the profit/loss functionality to provide detailed combo processing with explicit product tracking and purchase price calculation.

## Key Features Implemented

### 1. Enhanced Sheet Processing
When uploading a profit/loss sheet, the system now:
- **Fetches details from the sheet** - Extracts SKU, quantity, payment, and other fields
- **Checks comboID (SKU)** - Matches the SKU with combos in the database using multiple criteria:
  - Combo ID
  - Combo name
  - Combo barcode
  - Product barcode (if SKU refers to a product within a combo)

### 2. Combo Matching Process
- **Step 1**: Direct combo lookup by comboId, name, or barcode
- **Step 2**: If not found, search for product by barcode and find associated combo
- **Step 3**: If only product found, create fallback combo structure
- **Step 4**: If nothing found, use fallback pricing from sheet or mark as error

### 3. Product Details Extraction
For each matched combo, the system:
- **Fetches all products** in the combo with their quantities
- **Finds original purchase prices** from purchase records
- **Calculates total cost** per combo (sum of all product costs × quantities)
- **Stores detailed product information** including:
  - Product name
  - Product barcode
  - Quantity in combo
  - Unit cost from purchases
  - Total cost contribution

### 4. Profit Calculation
- **Sold price**: Extracted from sheet (Payment field)
- **Purchase price**: Calculated from combo products or sheet fallback
- **Profit**: Sold price - Purchase price
- **Special handling**: RTO orders have zero profit

### 5. Enhanced UI Features

#### SKU Lookup Tool
- Preview combo details before uploading
- Shows all products in combo with costs
- Validates SKU existence

#### Detailed Results Display
- Upload results modal shows product breakdown
- Permanent entries table displays product details
- Export functions include product information

#### Enhanced Logging
- Console logs show detailed processing steps
- Clear error messages for troubleshooting
- Step-by-step combo matching process

## API Endpoints

### New Endpoint: GET /profit-loss/combo-details/:sku
Returns detailed information about a combo and its products:
```json
{
  "found": true,
  "sku": "COMBO-123",
  "combo": {
    "id": "...",
    "comboId": "COMBO-123",
    "name": "Sample Combo",
    "barcode": "1234567890",
    "price": 100
  },
  "productDetails": [
    {
      "name": "Product A",
      "barcode": "PROD-A-001",
      "quantity": 2,
      "unitCost": 15.50,
      "totalCost": 31.00
    },
    {
      "name": "Product B", 
      "barcode": "PROD-B-002",
      "quantity": 1,
      "unitCost": 25.00,
      "totalCost": 25.00
    }
  ],
  "totalPurchasePrice": 56.00,
  "productCount": 2
}
```

## Database Enhancements

### ProfitLoss Model
Added `productDetails` array to store:
- Product names and barcodes
- Quantities and unit costs
- Individual product cost contributions

### Enhanced Data Flow
1. Sheet upload → Parse and validate
2. SKU lookup → Find combo and products
3. Purchase price calculation → Sum product costs
4. Profit calculation → Sold price - Purchase price
5. Data persistence → Save with full product details
6. UI display → Show detailed breakdown

## Usage Example

1. **Upload Sheet**: Contains SKU "COMBO-ABC-123" with payment $150
2. **System Processing**:
   - Finds combo "Summer Collection" with barcode "COMBO-ABC-123"
   - Combo contains: T-Shirt (qty: 2, cost: $20 each) + Hat (qty: 1, cost: $15)
   - Total purchase cost: (2 × $20) + (1 × $15) = $55
   - Profit: $150 - $55 = $95
3. **Result Display**: Shows combo name, all products with costs, and calculated profit

## Error Handling
- Missing SKU: Clear error message with available headers
- Combo not found: Fallback to sheet purchase price if available
- Missing purchase data: Uses zero cost with warning
- Invalid data: Detailed error messages for troubleshooting

This enhancement provides complete transparency in the profit calculation process, showing exactly which products contribute to costs and how profits are derived.