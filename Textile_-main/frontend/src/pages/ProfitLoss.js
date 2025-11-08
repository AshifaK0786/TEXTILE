import React, { useState, useEffect } from 'react';
import { Table, Alert, Form, Button, Row, Col, Card, Spinner, Modal } from 'react-bootstrap';
import { profitLossAPI } from '../services/api';
import styled, { keyframes } from 'styled-components';
import { FaUpload, FaDownload, FaChartLine, FaCheck, FaTimes, FaFileExcel, FaFilePdf } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { transform: translateX(-30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Styled Components
const Container = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
`;

const AnimatedContainer = styled.div`
  animation: ${fadeIn} 0.6s ease-out;
`;

const HeaderSection = styled.div`
  background: white;
  height: 100px;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  animation: ${slideIn} 0.5s ease-out;
`;

const FilterCard = styled(Card)`
  border: none;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  
  .card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 15px 15px 0 0;
    border: none;
    font-weight: 600;
  }
`;

const GraphCard = styled(Card)`
  border: none;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  
  .card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 15px 15px 0 0;
    border: none;
    font-weight: 600;
  }
`;

const StyledTable = styled(Table)`
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  
  thead {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    th {
      border: none;
      padding: 1.2rem;
      font-weight: 500;
    }
  }
  
  tbody tr {
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(102, 126, 234, 0.1);
      transform: translateY(-2px);
    }
    
    td {
      padding: 1.2rem;
      border-color: #e9ecef;
    }
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 25px;
  padding: 0.8rem 2rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  }
`;

const SecondaryButton = styled(Button)`
  border-radius: 20px;
  padding: 0.5rem 1.2rem;
  transition: all 0.3s ease;
  border: 2px solid #667eea;
  color: #667eea;
  background: transparent;
  
  &:hover {
    background: #667eea;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
`;

const FormGroup = styled(Form.Group)`
  margin-bottom: 1rem;
  
  .form-label {
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 0.5rem;
  }
  
  .form-control {
    border-radius: 10px;
    border: 2px solid #e2e8f0;
    padding: 0.8rem;
    transition: all 0.3s ease;
    
    &:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }
  }
`;

const StatCard = styled(Card)`
  border: none;
  border-radius: 15px;
  text-align: center;
  padding: 1.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0,0,0,0.15);
  }
  
  .card-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #4a5568;
  }
  
  .card-text {
    font-size: 1.8rem;
    font-weight: 700;
    color: #667eea;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const LoadingSpinner = styled(Spinner)`
  color: #667eea;
  width: 3rem;
  height: 3rem;
`;

const IconWrapper = styled.span`
  margin-right: 0.5rem;
`;

const ProfitBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'profit'
})`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  color: ${props => props.profit >= 0 ? '#fff' : '#fff'};
  background: ${props => props.profit >= 0 ? '#48bb78' : '#e53e3e'};
`;

const ProfitLoss = () => {
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [profitData, setProfitData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [uploadResults, setUploadResults] = useState([]);
  const [uploadTotals, setUploadTotals] = useState(null);
  const [uploadedRows, setUploadedRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploadedMonthlyData, setUploadedMonthlyData] = useState([]);
  const [skuLookup, setSkuLookup] = useState('');
  const [comboDetails, setComboDetails] = useState(null);
  const [allCombosDetails, setAllCombosDetails] = useState([]);
  const [processedData, setProcessedData] = useState({ delivered: [], rpu: [], totals: null });

  const fmt = (v) => {
    if (v === undefined || v === null) return '0.00';
    const n = Number(v);
    return isNaN(n) ? '0.00' : n.toFixed(2);
  };

  // Helper: parse dates coming from uploaded rows.
  // Prioritize payment date fields (PaymentDate, paymentDate, etc.).
  // Accepts JS Date, ISO strings, or Excel serial numbers.
  const excelSerialToDate = (serial) => {
    // Excel's epoch: 1899-12-30 (serial 1 = 1899-12-31) but there is a leap bug for 1900.
    // Use standard conversion: days from 1899-12-30
    const days = Number(serial);
    if (isNaN(days)) return null;
    const utcDays = days - 25569; // days since 1970-01-01
    const ms = Math.round(utcDays * 86400 * 1000);
    return new Date(ms);
  };

  const parseRowDate = (row) => {
    if (!row) return null;
    // Preference order: PaymentDate, paymentDate, Payment_Date, PaymentDateString, OrderDate, date
  const paymentCandidates = ['PaymentDate', 'Payment Date', 'payment date', 'paymentDate', 'Payment_Date', 'PaymentDateString', 'paymentDateString', 'PaymentDateRaw', 'paymentDateRaw'];
    const generalCandidates = ['date', 'OrderDate', 'orderDate', 'Orderdate', 'order_date'];

    const tryParse = (v) => {
      if (v === undefined || v === null || v === '') return null;
      // If already a Date
      if (v instanceof Date && !isNaN(v)) return v;
      // If number (possible Excel serial)
      if (typeof v === 'number') {
        const d = excelSerialToDate(v);
        if (d && !isNaN(d)) return d;
      }
      // If string, try to extract numeric then Date
      if (typeof v === 'string') {
        // strip non-digit except -/: space
        const trimmed = v.trim();
        // If looks like a plain number (excel serial in string)
        const asNum = Number(trimmed);
        if (!isNaN(asNum)) {
          const dnum = excelSerialToDate(asNum);
          if (dnum && !isNaN(dnum)) return dnum;
        }
        const parsed = new Date(trimmed);
        if (!isNaN(parsed)) return parsed;
        // try common dd/mm/yyyy or dd-mm-yyyy
        const parts = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (parts) {
          const p1 = Number(parts[1]);
          const p2 = Number(parts[2]);
          const p3 = Number(parts[3]);
          // assume dd/mm/yyyy
          const year = p3 < 100 ? (p3 > 50 ? 1900 + p3 : 2000 + p3) : p3;
          const candidate = new Date(year, p2 - 1, p1);
          if (!isNaN(candidate)) return candidate;
        }
      }
      return null;
    };

    // check payment candidates first
    for (const key of paymentCandidates) {
      const v = row[key] ?? row[key.toLowerCase()];
      const d = tryParse(v);
      if (d) return d;
    }

    // then general candidates
    for (const key of generalCandidates) {
      const v = row[key] ?? row[key.toLowerCase()];
      const d = tryParse(v);
      if (d) return d;
    }

    // as last resort check any 'date'/'payment' like keys
    for (const k of Object.keys(row)) {
      if (/date/i.test(k) || /payment/i.test(k)) {
        const d = tryParse(row[k]);
        if (d) return d;
      }
    }

    return null;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const fetchProfitLoss = async () => {
    // If both dates are provided validate the range; otherwise allow fetching (will include uploaded entries)
    if (filter.startDate && filter.endDate && new Date(filter.startDate) > new Date(filter.endDate)) {
      setError('Start Date must be before End Date');
      return;
    }
    setLoading(true);
    try {
      // 1) fetch monthly aggregation and summary from backend (uploaded-only)
      const resp = await profitLossAPI.getProfitLoss(filter.startDate, filter.endDate, false);
      setMonthlyData(resp.data.monthlyChartData || []);
      setSummary(resp.data.summary || null);

      // 2) fetch persisted ProfitLoss entries (permanent rows)
      const entriesResp = await profitLossAPI.getEntries(filter.startDate, filter.endDate, 1000);
      const entries = entriesResp.data.entries || [];
      // Map server entries into the shape expected by the UI (compatible with previous uploadedRows)
      const mapped = entries.map(e => {
        // ONLY use paymentDate from spreadsheet, do NOT fallback to uploadDate
        let paymentDate = e.paymentDate || null;
        
        // If paymentDate is a string, try to parse it
        if (paymentDate && typeof paymentDate === 'string') {
          const parsed = new Date(paymentDate);
          paymentDate = isNaN(parsed) ? null : parsed;
        }
        
        return {
          sNo: '',
          orderId: e.orderId || '',
          sku: e.sku || '',
          skuId: e.sku || '',
          quantity: e.quantity || 0,
          purchasePrice: e.purchasePrice || 0,
          payment: e.payment || 0,
          profit: e.profit || 0,
          profitTotal: e.profit || 0,
          status: e.status || 'delivered',
          date: paymentDate,
          comboName: e.comboName || e.productNames || '',
          message: ''
        };
      });
      setUploadedRows(mapped);
      setError('');
    } catch (error) {
      setError('Failed to fetch profit/loss data: ' + (error.response?.data?.message || error.message));
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['.xlsx', '.xls', '.csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (!allowedTypes.includes(file.type) && !allowedTypes.includes(`.${fileExtension}`)) {
      setError('Invalid file format. Please upload an Excel file (.xlsx, .xls) or CSV file.');
      e.target.value = ''; // Clear input
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size too large. Maximum allowed size is 5MB.');
      e.target.value = ''; // Clear input
      return;
    }

    setLoading(true);
    try {
      const response = await profitLossAPI.uploadExcel(file);
      setUploadResults(response.data.results || []);
      setUploadTotals(response.data.totals || null);
      
      // Process data for delivered/RPU separation
      const delivered = response.data.results.filter(r => r.status !== 'rpu' && r.status !== 'Error');
      const rpu = response.data.results.filter(r => r.status === 'rpu');
      
      const deliveredTotal = delivered.reduce((sum, r) => sum + (r.profit || 0), 0);
      const rpuTotal = rpu.reduce((sum, r) => sum + (r.profit || 0), 0);
      
      setProcessedData({
        delivered,
        rpu,
        totals: {
          deliveredTotal: Number(deliveredTotal.toFixed(2)),
          rpuTotal: Number(rpuTotal.toFixed(2)),
          grandTotal: Number((deliveredTotal + rpuTotal).toFixed(2))
        }
      });
      
      await fetchProfitLoss();
      setSummary(response.data.summary || null);
      setShowModal(true);
      setError('');
      e.target.value = '';
    } catch (error) {
      setError('Failed to upload file: ' + (error.response?.data?.message || error.message));
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilter({
      startDate: '',
      endDate: ''
    });
    setProfitData([]);
    setMonthlyData([]);
    setSummary(null);
  };

  const handleSkuLookup = async () => {
    if (!skuLookup.trim()) return;
    
    setLoading(true);
    try {
      const response = await profitLossAPI.getComboDetails(skuLookup.trim());
      setComboDetails(response.data);
      setError('');
    } catch (error) {
      setError('Failed to lookup SKU: ' + (error.response?.data?.message || error.message));
      setComboDetails({ found: false, sku: skuLookup.trim() });
    } finally {
      setLoading(false);
    }
  };

  const handleShowAllCombos = async () => {
    setLoading(true);
    try {
      const response = await profitLossAPI.getDebugCombos();
      setComboDetails({
        found: false,
        sku: 'ALL_COMBOS',
        message: response.data.message || `Found ${response.data.count} combos in database`,
        allCombos: response.data.combos || [],
        totalCombos: response.data.count || 0
      });
      setError('');
    } catch (error) {
      console.error('Debug combos error:', error);
      setComboDetails({
        found: false,
        sku: 'ALL_COMBOS',
        message: 'Database is empty - no combos found. Create some combos first.',
        allCombos: [],
        totalCombos: 0
      });
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCombosDetails = async () => {
    setLoading(true);
    try {
      const debugResponse = await profitLossAPI.getDebugCombos();
      const combos = debugResponse.data.combos || [];
      
      const comboDetailsPromises = combos.map(async (combo) => {
        try {
          const detailResponse = await profitLossAPI.getComboDetails(combo.comboId || combo.name || combo.barcode);
          return detailResponse.data;
        } catch (err) {
          return { found: false, sku: combo.comboId || combo.name };
        }
      });
      
      const allDetails = await Promise.all(comboDetailsPromises);
      setAllCombosDetails(allDetails.filter(detail => detail.found));
      setError('');
    } catch (error) {
      setError('Failed to fetch combo details: ' + error.message);
      setAllCombosDetails([]);
    } finally {
      setLoading(false);
    }
  };

  // Load profit data (including uploaded entries) on page mount
  useEffect(() => {
    fetchProfitLoss();
    
    // Listen for data deletion events from other pages
    const handleDataDeleted = () => {
      fetchProfitLoss();
      // Clear processed data to refresh combo-wise analysis
      setProcessedData({ delivered: [], rpu: [], totals: null });
      setUploadedRows([]);
    };
    
    window.addEventListener('profitDataDeleted', handleDataDeleted);
    
    return () => {
      window.removeEventListener('profitDataDeleted', handleDataDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh data when uploads are deleted
  const refreshData = async () => {
    await fetchProfitLoss();
  };

  // Build monthly aggregates for uploaded rows (month-wise counts and profit)
  useEffect(() => {
    if (!uploadedRows || uploadedRows.length === 0) {
      setUploadedMonthlyData([]);
      return;
    }

    const byMonth = new Map();

    const getDateFromRow = (row) => {
      return parseRowDate(row);
    };

    uploadedRows.forEach(r => {
      const d = getDateFromRow(r);
      if (!d) return;
      // normalize to first of month for sorting
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthDate = new Date(d.getFullYear(), d.getMonth(), 1);

      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, { month: monthKey, monthDate, label: monthDate.toLocaleString(undefined, { month: 'short', year: 'numeric' }), totalEntries: 0, totalProfit: 0, totalPayment: 0 });
      }

      const entry = byMonth.get(monthKey);
      entry.totalEntries += 1;
      const profit = (r.profit !== undefined && r.profit !== null) ? Number(r.profit) : (r.profitTotal !== undefined && r.profitTotal !== null ? Number(r.profitTotal) : 0);
      const payment = (r.payment !== undefined && r.payment !== null) ? Number(r.payment) : (r.soldPrice !== undefined && r.soldPrice !== null ? Number(r.soldPrice) : 0);
      entry.totalProfit += isNaN(profit) ? 0 : profit;
      entry.totalPayment += isNaN(payment) ? 0 : payment;
    });

    // convert to array and sort by monthDate asc
    const arr = Array.from(byMonth.values()).sort((a, b) => a.monthDate - b.monthDate);
    setUploadedMonthlyData(arr);
  }, [uploadedRows]);

  const downloadExcelTemplate = () => {
    try {
      // Create template data matching the exact header row provided by the user
      const templateData = [
        {
          'Month': '2024-01',
          'S.No.': 1,
          'OrderDate': '2024-01-15',
          'Orderid': 'ORD-1001',
          'SKU': 'SKU-12345',
          'Quantity': 2,
          'Status': 'Delivered',
          'Payment': 300,
          'PaymentDate': '2024-01-16',
          'PaymentStatus': 'Paid',
          'PurchasePrice': 80,
          'Profit': 140,
          'Re-use/Claim': '',
          'ReusedDate': '',
          'StatusofProduct': 'Good',
          'Remarks': 'Sample row'
        },
        {
          'Month': '2024-01',
          'S.No.': 2,
          'OrderDate': '2024-01-20',
          'Orderid': 'ORD-1002',
          'SKU': 'SKU-98765',
          'Quantity': 1,
          'Status': 'RPU',
          'Payment': 220,
          'PaymentDate': '2024-01-21',
          'PaymentStatus': 'Paid',
          'PurchasePrice': 120,
          'Profit': 100,
          'Re-use/Claim': 'No',
          'ReusedDate': '',
          'StatusofProduct': 'Returned',
          'Remarks': ''
        }
      ];

      // Create instructions sheet tailored to the exact headers
      const instructionsData = [
        { 'Field': 'Month', 'Format': 'YYYY-MM', 'Example': '2024-01', 'Required': 'No' },
        { 'Field': 'S.No.', 'Format': 'Integer', 'Example': '1', 'Required': 'No' },
        { 'Field': 'OrderDate', 'Format': 'YYYY-MM-DD', 'Example': '2024-01-15', 'Required': 'No' },
        { 'Field': 'Orderid', 'Format': 'Text (order id)', 'Example': 'ORD-1001', 'Required': 'Yes' },
        { 'Field': 'SKU', 'Format': 'Text (SKU or barcode)', 'Example': 'SKU-12345', 'Required': 'Yes' },
        { 'Field': 'Quantity', 'Format': 'Number', 'Example': '2', 'Required': 'Yes' },
        { 'Field': 'Status', 'Format': 'Text (Delivered/RPU)', 'Example': 'Delivered', 'Required': 'Yes' },
        { 'Field': 'Payment', 'Format': 'Number (total received)', 'Example': '300', 'Required': 'Yes' },
        { 'Field': 'PaymentDate', 'Format': 'YYYY-MM-DD', 'Example': '2024-01-16', 'Required': 'No' },
        { 'Field': 'PaymentStatus', 'Format': 'Text (Paid/Unpaid)', 'Example': 'Paid', 'Required': 'No' },
        { 'Field': 'PurchasePrice', 'Format': 'Number (purchase cost per unit or combo)', 'Example': '80', 'Required': 'No' },
        { 'Field': 'Profit', 'Format': 'Number (optional - system will compute if omitted)', 'Example': '140', 'Required': 'No' },
        { 'Field': 'Re-use/Claim', 'Format': 'Text (Yes/No)', 'Example': 'No', 'Required': 'No' },
        { 'Field': 'ReusedDate', 'Format': 'YYYY-MM-DD', 'Example': '', 'Required': 'No' },
        { 'Field': 'StatusofProduct', 'Format': 'Text (Good/Returned/Damaged)', 'Example': 'Good', 'Required': 'No' },
        { 'Field': 'Remarks', 'Format': 'Text', 'Example': 'Optional notes', 'Required': 'No' }
      ];

      // Create workbook with multiple sheets
      const worksheet1 = XLSX.utils.json_to_sheet(templateData);
      const worksheet2 = XLSX.utils.json_to_sheet(instructionsData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet1, 'Data Template');
      XLSX.utils.book_append_sheet(workbook, worksheet2, 'Instructions');

      // Auto-adjust column widths
      // Suggested column widths for the exact header template
      const colWidths = [
        { wch: 10 }, // Month
        { wch: 6 },  // S.No.
        { wch: 14 }, // OrderDate
        { wch: 14 }, // Orderid
        { wch: 16 }, // SKU
        { wch: 10 }, // Quantity
        { wch: 12 }, // Status
        { wch: 12 }, // Payment
        { wch: 14 }, // PaymentDate
        { wch: 14 }, // PaymentStatus
        { wch: 14 }, // PurchasePrice
        { wch: 12 }, // Profit
        { wch: 14 }, // Re-use/Claim
        { wch: 14 }, // ReusedDate
        { wch: 16 }, // StatusofProduct
        { wch: 24 }  // Remarks
      ];
      worksheet1['!cols'] = colWidths;

      XLSX.writeFile(workbook, 'profit_loss_template.xlsx');
      setError('');
    } catch (error) {
      setError('Failed to download template: ' + error.message);
    }
  };

  const exportToExcel = (data, filename = 'profit_loss_report.xlsx') => {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }

    try {
      // Transform data for export
  const exportData = data.map(item => ({
        'Combo ID': item.comboId || '',
        'Products': item.productNames || item.comboName || '',
        'Original Cost Price': item.costPrice !== undefined && item.costPrice !== null ? fmt(item.costPrice) : '',
        'Sold Price': item.soldPrice !== undefined && item.soldPrice !== null ? fmt(item.soldPrice) : '',
        'Quantity': item.quantity || '',
        'Profit/Loss': item.profitTotal !== undefined && item.profitTotal !== null ? fmt(item.profitTotal) : '',
        'Status': item.status?.toUpperCase() || 'ERROR',
        'Date': item.date ? new Date(item.date).toLocaleDateString() : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Profit Loss');

      // Add summary sheet if available
      if (summary) {
        const summaryData = [
          { Metric: 'Total Profit/Loss', Amount: fmt(summary.totalProfit) },
          { Metric: 'Delivered Profit', Amount: fmt(summary.deliveredProfit) },
          { Metric: 'RPU Loss', Amount: fmt(summary.rpuProfit) },
          { Metric: 'Total Records', Amount: summary.totalRecords || 0 },
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }

      XLSX.writeFile(workbook, filename);
      setError('');
    } catch (error) {
      setError('Failed to export to Excel: ' + error.message);
    }
  };

  const exportUploadResultsToExcel = (data, totals, filename = 'profit_loss_upload_report.xlsx') => {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }
    try {
      const exportData = data.map(item => ({
        'S.No': item.sNo || item.sno || '',
        'Order ID': item.orderId || item.order || '',
        'SKU': item.sku || item.sku || item.comboId || '',
        'Quantity': item.quantity || item.qty || '',
        'Purchase Price': item.purchasePrice !== undefined && item.purchasePrice !== null ? fmt(item.purchasePrice) : (item.costPrice ? fmt(item.costPrice) : ''),
        'Payment': item.payment !== undefined && item.payment !== null ? fmt(item.payment) : (item.soldPrice ? fmt(item.soldPrice) : ''),
        'Profit': item.profit !== undefined && item.profit !== null ? fmt(item.profit) : (item.profitTotal !== undefined && item.profitTotal !== null ? fmt(item.profitTotal) : ''),
        'Message': item.message || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Upload Results');

      if (totals) {
        const totalsData = [
          { Metric: 'Total Quantity', Amount: totals.totalQuantity },
          { Metric: 'Total Purchase Price', Amount: fmt(totals.totalPurchasePrice) },
          { Metric: 'Total Payment', Amount: fmt(totals.totalPayment) },
          { Metric: 'Total Profit', Amount: fmt(totals.totalProfit) }
        ];
        const totalsSheet = XLSX.utils.json_to_sheet(totalsData);
        XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Totals');
      }

      XLSX.writeFile(workbook, filename);
      setError('');
    } catch (err) {
      setError('Failed to export upload results: ' + err.message);
    }
  };

  const exportUploadResultsToPDF = (data, totals, filename = 'profit_loss_upload_report.pdf') => {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }
    try {
      let html = `
        <html><head><title>Upload Results</title><style>body{font-family:Arial;}table{width:100%;border-collapse:collapse;}th{background:#667eea;color:#fff;padding:8px;text-align:left;}td{padding:6px;border-bottom:1px solid #eee;}</style></head><body>`;
      html += `<h2>Upload Results</h2><table><tr><th>S.No</th><th>Order ID</th><th>SKU  </th><th>Quantity</th><th>Purchase Price</th><th>Payment</th><th>Profit</th></tr>`;
        data.forEach(item => {
        const sNo = item.sNo || item.sno || '';
        const orderId = item.orderId || item.order || '';
        const sku = item.skuId || item.sku || item.comboId || '';
        const qty = item.quantity || item.qty || '';
        const purchasePrice = item.purchasePrice !== undefined && item.purchasePrice !== null ? fmt(item.purchasePrice) : (item.costPrice ? fmt(item.costPrice) : '');
        const payment = item.payment !== undefined && item.payment !== null ? fmt(item.payment) : (item.soldPrice ? fmt(item.soldPrice) : '');
        const profit = item.profit !== undefined && item.profit !== null ? fmt(item.profit) : (item.profitTotal !== undefined && item.profitTotal !== null ? fmt(item.profitTotal) : '');
        html += `<tr><td>${sNo}</td><td>${orderId}</td><td>${sku}</td><td>${qty}</td><td>${purchasePrice}</td><td>${payment}</td><td>${profit}</td></tr>`;
      });
      html += `</table>`;
        if (totals) {
        html += `<h3>Totals</h3><table>`;
        html += `<tr><td>Total Quantity</td><td>${totals.totalQuantity}</td></tr>`;
        html += `<tr><td>Total Purchase Price</td><td>$${fmt(totals.totalPurchasePrice)}</td></tr>`;
        html += `<tr><td>Total Payment</td><td>$${fmt(totals.totalPayment)}</td></tr>`;
        html += `<tr><td>Total Profit</td><td>$${fmt(totals.totalProfit)}</td></tr>`;
        html += `</table>`;
      }
      html += `</body></html>`;

      const element = document.createElement('a');
      const file = new Blob([html], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = filename.replace('.pdf', '.html');
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      setError('PDF exported as HTML. Use browser Print to PDF to save as PDF.');
    } catch (err) {
      setError('Failed to export upload results to PDF: ' + err.message);
    }
  };

  const exportToPDF = (data, filename = 'profit_loss_report.pdf') => {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }

    try {
      // Create a table HTML
      let html = `
        <html>
          <head>
            <title>Profit & Loss Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #667eea; color: white; padding: 10px; text-align: left; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              tr:hover { background-color: #f5f5f5; }
              .summary { margin-top: 30px; }
              .profit { color: #48bb78; font-weight: bold; }
              .loss { color: #e53e3e; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Profit & Loss Analysis Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
      `;

      // Add summary
      if (summary) {
        html += `
          <div class="summary">
            <h2>Summary</h2>
            <table>
              <tr>
                <th>Metric</th>
                <th>Amount</th>
              </tr>
              <tr>
                <td>Total Profit/Loss</td>
                <td class="${summary.totalProfit >= 0 ? 'profit' : 'loss'}">$${fmt(summary.totalProfit)}</td>
              </tr>
              <tr>
                <td>Delivered Profit</td>
                <td class="profit">$${fmt(summary.deliveredProfit)}</td>
              </tr>
              <tr>
                <td>RPU Loss</td>
                <td class="loss">$${fmt(summary.rpuProfit)}</td>
              </tr>
              <tr>
                <td>Total Records</td>
                <td>${summary.totalRecords || 0}</td>
              </tr>
            </table>
          </div>
        `;
      }

      // Add data table
      html += `
        <h2>Detailed Records</h2>
        <table>
          <tr>
            <th>Combo ID</th>
            <th>Products</th>
            <th>Original Cost Price</th>
            <th>Sold Price</th>
            <th>Quantity</th>
            <th>Profit/Loss</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
      `;

      data.forEach(item => {
        const profitClass = item.profitTotal >= 0 ? 'profit' : 'loss';
        html += `
          <tr>
            <td>${item.comboId || ''}</td>
            <td>${item.productNames || item.comboName || ''}</td>
            <td>$${item.costPrice !== undefined && item.costPrice !== null ? fmt(item.costPrice) : ''}</td>
            <td>$${item.soldPrice !== undefined && item.soldPrice !== null ? fmt(item.soldPrice) : ''}</td>
            <td>${item.quantity || ''}</td>
            <td class="${profitClass}">$${item.profitTotal !== undefined && item.profitTotal !== null ? fmt(item.profitTotal) : ''}</td>
            <td>${item.status?.toUpperCase() || 'ERROR'}</td>
            <td>${item.date ? new Date(item.date).toLocaleDateString() : ''}</td>
          </tr>
        `;
      });

      html += `
          </table>
          </body>
        </html>
      `;

      // Create a blob and download
      const element = document.createElement('a');
      const file = new Blob([html], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = filename.replace('.pdf', '.html');
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      setError('PDF exported as HTML file. To save as PDF, use your browser\'s Print to PDF feature.');
    } catch (error) {
      setError('Failed to export to PDF: ' + error.message);
    }
  };

  return (
    <Container>
      <AnimatedContainer>
        <HeaderSection>
          <Row>
            <Col>
              <h4 className="mb-0 d-flex align-items-center">
                <IconWrapper style={{ fontSize: "1.3rem", marginRight: "0.6rem" }}>💹</IconWrapper>
                Profit & Loss Analysis
              </h4>
            </Col>
          </Row>
        </HeaderSection>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Statistics */}
        {summary && (
          <StatsGrid>
            <StatCard>
              <Card.Title>💰 Total Profit/Loss</Card.Title>
              <Card.Text style={{ color: (summary?.totalProfit || 0) >= 0 ? '#48bb78' : '#e53e3e' }}>
                ${fmt(summary?.totalProfit)}
              </Card.Text>
            </StatCard>
            <StatCard>
              <Card.Title>✅ Delivered Profit</Card.Title>
              <Card.Text style={{ color: '#48bb78' }}>
                ${fmt(summary?.deliveredProfit)}
              </Card.Text>
            </StatCard>
            <StatCard>
              <Card.Title>🔄 RPU Loss</Card.Title>
              <Card.Text style={{ color: '#e53e3e' }}>
                ${fmt(summary?.rpuProfit)}
              </Card.Text>
            </StatCard>
            <StatCard>
              <Card.Title>📊 Total Records</Card.Title>
              <Card.Text>{summary.totalRecords}</Card.Text>
            </StatCard>
          </StatsGrid>
        )}

        {/* Filter Section */}
        <FilterCard>
          <Card.Header>
            <IconWrapper>🔍</IconWrapper>
            Date Range Filter
          </Card.Header>
          <Card.Body>
            <Form>
              <Row>
                <Col md={3}>
                  <FormGroup>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={filter.startDate}
                      onChange={handleFilterChange}
                    />
                  </FormGroup>
                </Col>
                <Col md={3}>
                  <FormGroup>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={filter.endDate}
                      onChange={handleFilterChange}
                    />
                  </FormGroup>
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <PrimaryButton onClick={fetchProfitLoss} className="w-100">
                    <FaChartLine /> Fetch Data
                  </PrimaryButton>
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <SecondaryButton onClick={clearFilters} className="w-100">
                    🗑️ Clear
                  </SecondaryButton>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </FilterCard>

        {/* SKU Lookup Section */}
        <FilterCard>
          <Card.Header>
            <IconWrapper>🔍</IconWrapper>
            SKU Lookup & Combo Details
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Form.Label>Enter SKU/Barcode to Preview Combo Details</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter SKU, Combo ID, or Product Barcode"
                    value={skuLookup}
                    onChange={(e) => setSkuLookup(e.target.value)}
                  />
                </FormGroup>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <PrimaryButton onClick={handleSkuLookup} className="w-100" disabled={!skuLookup.trim()}>
                  <IconWrapper>🔍</IconWrapper>
                  Lookup
                </PrimaryButton>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <PrimaryButton onClick={fetchAllCombosDetails} className="w-100" style={{ background: '#28a745' }}>
                  <IconWrapper>📋</IconWrapper>
                  Load All Combos
                </PrimaryButton>
              </Col>
            </Row>
            {comboDetails && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <h6>Combo Details for SKU: {comboDetails.sku}</h6>
                {comboDetails.found ? (
                  <div>
                    <p><strong>Combo:</strong> {comboDetails.combo?.name || 'N/A'}</p>
                    <p><strong>Combo ID:</strong> {comboDetails.combo?.comboId || 'N/A'}</p>
                    <p><strong>Barcode:</strong> {comboDetails.combo?.barcode || 'N/A'}</p>
                    <p><strong>Total Purchase Price:</strong> <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>${fmt(comboDetails.totalPurchasePrice)}</span></p>
                    <p><strong>Products ({comboDetails.productCount}):</strong></p>
                    <ul style={{ marginBottom: 0 }}>
                      {comboDetails.productDetails.map((product, idx) => (
                        <li key={idx}>
                          {product.name} - Qty: {product.quantity}, Unit Cost: ${fmt(product.unitCost)}, Total: ${fmt(product.totalCost)}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#e7f3ff', borderRadius: '5px' }}>
                      <strong>💰 Profit Calculation:</strong><br/>
                      • DELIVERED: Payment - Purchase Price = Profit<br/>
                      • RPU: -(Payment - Purchase Price) = Loss<br/>
                      • RTO: -Purchase Price = Loss<br/>
                      <span style={{ color: '#007bff' }}>Example: $500 (Payment) - ${fmt(comboDetails.totalPurchasePrice)} = ${fmt(500 - comboDetails.totalPurchasePrice)} profit</span>
                    </div>
                    {comboDetails.profitRecords && comboDetails.profitRecords.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>📊 Real Calculations from Uploaded Sheets ({comboDetails.recordsCount}):</strong>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}>
                          <table style={{ width: '100%', fontSize: '0.8rem' }}>
                            <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                              <tr>
                                <th style={{ padding: '0.3rem' }}>Date</th>
                                <th style={{ padding: '0.3rem' }}>Order ID</th>
                                <th style={{ padding: '0.3rem' }}>Payment</th>
                                <th style={{ padding: '0.3rem' }}>Purchase Price</th>
                                <th style={{ padding: '0.3rem' }}>Calculation</th>
                                <th style={{ padding: '0.3rem' }}>Profit</th>
                                <th style={{ padding: '0.3rem' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comboDetails.profitRecords.map((record, idx) => {
                                const payment = record.payment || 0;
                                const purchasePrice = record.purchasePrice || 0;
                                const profit = record.profit || 0;
                                const status = record.status || 'delivered';
                                
                                let calculation = '';
                                if (status.toLowerCase().includes('rto')) {
                                  calculation = `-$${fmt(purchasePrice)} = $${fmt(profit)}`;
                                } else if (status.toLowerCase().includes('rpu')) {
                                  calculation = `-($${fmt(payment)} - $${fmt(purchasePrice)}) = $${fmt(profit)}`;
                                } else {
                                  calculation = `$${fmt(payment)} - $${fmt(purchasePrice)} = $${fmt(profit)}`;
                                }
                                
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '0.3rem' }}>
                                      {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '0.3rem' }}>{record.orderId || 'N/A'}</td>
                                    <td style={{ padding: '0.3rem' }}>${fmt(payment)}</td>
                                    <td style={{ padding: '0.3rem' }}>${fmt(purchasePrice)}</td>
                                    <td style={{ padding: '0.3rem', fontSize: '0.7rem', color: '#007bff' }}>{calculation}</td>
                                    <td style={{ padding: '0.3rem', color: profit >= 0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                                      ${fmt(profit)}
                                    </td>
                                    <td style={{ padding: '0.3rem' }}>
                                      <span style={{ 
                                        padding: '2px 6px', 
                                        borderRadius: '3px', 
                                        fontSize: '0.7rem',
                                        background: status.toLowerCase().includes('rto') ? '#dc3545' : 
                                                   status.toLowerCase().includes('rpu') ? '#ffc107' : '#28a745',
                                        color: 'white'
                                      }}>
                                        {status.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {comboDetails.sku === 'ALL_COMBOS' ? (
                      <div>
                        <p style={{ color: '#007bff' }}>{comboDetails.message}</p>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '1rem', borderRadius: '5px' }}>
                          <strong>All Available Combos:</strong>
                          {comboDetails.allCombos && comboDetails.allCombos.length > 0 ? (
                            <table style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #ddd' }}>
                                  <th>Combo ID</th>
                                  <th>Name</th>
                                  <th>Barcode</th>
                                  <th>Products</th>
                                </tr>
                              </thead>
                              <tbody>
                                {comboDetails.allCombos.map((combo, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '0.3rem' }}>{combo.comboId || 'N/A'}</td>
                                    <td style={{ padding: '0.3rem' }}>{combo.name || 'N/A'}</td>
                                    <td style={{ padding: '0.3rem' }}>{combo.barcode || 'N/A'}</td>
                                    <td style={{ padding: '0.3rem' }}>{combo.products?.length || 0} products</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p>No combos found in database</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: '#e53e3e' }}>No combo or product found for this SKU</p>
                        {comboDetails.allCombos && (
                          <div style={{ marginTop: '1rem' }}>
                            <strong>Available Combos:</strong>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.5rem' }}>
                              {comboDetails.allCombos.map((combo, idx) => (
                                <div key={idx} style={{ padding: '0.2rem', borderBottom: '1px solid #eee' }}>
                                  <strong>ID:</strong> {combo.comboId || 'N/A'}, <strong>Name:</strong> {combo.name || 'N/A'}, <strong>Barcode:</strong> {combo.barcode || 'N/A'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </FilterCard>

        {/* All Combos Details Section */}
        {allCombosDetails && allCombosDetails.length > 0 && (
          <FilterCard>
            <Card.Header>
              <IconWrapper>📊</IconWrapper>
              All Combos Details & Profit Calculations
            </Card.Header>
            <Card.Body>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {allCombosDetails.map((comboDetail, index) => (
                  <div key={index} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                    <h6 style={{ color: '#007bff', marginBottom: '1rem' }}>Combo Details for SKU: {comboDetail.sku}</h6>
                    {comboDetail.found ? (
                      <div>
                        <Row>
                          <Col md={6}>
                            <p><strong>Combo:</strong> {comboDetail.combo?.name || 'N/A'}</p>
                            <p><strong>Combo ID:</strong> {comboDetail.combo?.comboId || 'N/A'}</p>
                            <p><strong>Barcode:</strong> {comboDetail.combo?.barcode || 'N/A'}</p>
                            <p><strong>Total Purchase Price:</strong> <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>${fmt(comboDetail.totalPurchasePrice)}</span></p>
                          </Col>
                          <Col md={6}>
                            <div style={{ padding: '0.5rem', background: '#e7f3ff', borderRadius: '5px' }}>
                              <strong>💰 Profit Calculation:</strong><br/>
                              • DELIVERED: Payment - Purchase Price = Profit<br/>
                              • RPU: -(Payment - Purchase Price) = Loss<br/>
                              • RTO: -Purchase Price = Loss<br/>
                              <span style={{ color: '#007bff' }}>Example: $500 (Payment) - ${fmt(comboDetail.totalPurchasePrice)} = ${fmt(500 - comboDetail.totalPurchasePrice)} profit</span>
                            </div>
                          </Col>
                        </Row>
                        <p><strong>Products ({comboDetail.productCount}):</strong></p>
                        <div style={{ marginLeft: '1rem' }}>
                          {comboDetail.productDetails.map((product, idx) => (
                            <div key={idx} style={{ padding: '0.3rem', borderBottom: '1px solid #eee' }}>
                              {product.name} - Qty: {product.quantity}, Unit Cost: ${fmt(product.unitCost)}, Total: ${fmt(product.totalCost)}
                            </div>
                          ))}
                        </div>
                        {comboDetail.profitRecords && comboDetail.profitRecords.length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <strong>📊 Real Calculations from Uploaded Sheets ({comboDetail.recordsCount}):</strong>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}>
                              <table style={{ width: '100%', fontSize: '0.8rem' }}>
                                <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                                  <tr>
                                    <th style={{ padding: '0.3rem' }}>Date</th>
                                    <th style={{ padding: '0.3rem' }}>Order ID</th>
                                    <th style={{ padding: '0.3rem' }}>Payment</th>
                                    <th style={{ padding: '0.3rem' }}>Purchase</th>
                                    <th style={{ padding: '0.3rem' }}>Calculation</th>
                                    <th style={{ padding: '0.3rem' }}>Profit</th>
                                    <th style={{ padding: '0.3rem' }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {comboDetail.profitRecords.map((record, idx) => {
                                    const payment = record.payment || 0;
                                    const purchasePrice = record.purchasePrice || 0;
                                    const profit = record.profit || 0;
                                    const status = record.status || 'delivered';
                                    
                                    let calculation = '';
                                    if (status.toLowerCase().includes('rto')) {
                                      calculation = `-$${fmt(purchasePrice)} = $${fmt(profit)}`;
                                    } else if (status.toLowerCase().includes('rpu')) {
                                      calculation = `-($${fmt(payment)} - $${fmt(purchasePrice)}) = $${fmt(profit)}`;
                                    } else {
                                      calculation = `$${fmt(payment)} - $${fmt(purchasePrice)} = $${fmt(profit)}`;
                                    }
                                    
                                    return (
                                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '0.3rem' }}>
                                          {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td style={{ padding: '0.3rem' }}>{record.orderId || 'N/A'}</td>
                                        <td style={{ padding: '0.3rem' }}>${fmt(payment)}</td>
                                        <td style={{ padding: '0.3rem' }}>${fmt(purchasePrice)}</td>
                                        <td style={{ padding: '0.3rem', fontSize: '0.7rem', color: '#007bff' }}>{calculation}</td>
                                        <td style={{ padding: '0.3rem', color: profit >= 0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                                          ${fmt(profit)}
                                        </td>
                                        <td style={{ padding: '0.3rem' }}>
                                          <span style={{ 
                                            padding: '2px 6px', 
                                            borderRadius: '3px', 
                                            fontSize: '0.7rem',
                                            background: status.toLowerCase().includes('rto') ? '#dc3545' : 
                                                       status.toLowerCase().includes('rpu') ? '#ffc107' : '#28a745',
                                            color: 'white'
                                          }}>
                                            {status.toUpperCase()}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: '#e53e3e' }}>No details found for this combo</p>
                    )}
                  </div>
                ))}
              </div>
            </Card.Body>
          </FilterCard>
        )}



        {/* Delivered and RPU Results Tables */}
        {processedData.delivered.length > 0 || processedData.rpu.length > 0 ? (
          <>
            {/* Delivered Results */}
            {processedData.delivered.length > 0 && (
              <FilterCard>
                <Card.Header style={{ background: '#28a745' }}>
                  <IconWrapper>✅</IconWrapper>
                  Delivered Orders - Profit Analysis
                </Card.Header>
                <Card.Body>
                  <StyledTable responsive striped size="sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order ID</th>
                        <th>Combo ID</th>
                        <th>Sold Price</th>
                        <th>Original Cost</th>
                        <th>Quantity</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.delivered.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</td>
                          <td>{item.orderId}</td>
                          <td>{item.skuId}</td>
                          <td>${fmt(item.payment)}</td>
                          <td>${fmt(item.purchasePrice)}</td>
                          <td>{item.quantity}</td>
                          <td style={{ color: '#28a745', fontWeight: 'bold' }}>${fmt(item.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </StyledTable>
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#d4edda', borderRadius: '5px' }}>
                    <strong>Delivered Total Profit: ${fmt(processedData.totals?.deliveredTotal || 0)}</strong>
                  </div>
                </Card.Body>
              </FilterCard>
            )}

            {/* RPU Results */}
            {processedData.rpu.length > 0 && (
              <FilterCard>
                <Card.Header style={{ background: '#dc3545' }}>
                  <IconWrapper>🔄</IconWrapper>
                  RPU Orders - Loss Analysis
                </Card.Header>
                <Card.Body>
                  <StyledTable responsive striped size="sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order ID</th>
                        <th>Combo ID</th>
                        <th>Sold Price</th>
                        <th>Original Cost</th>
                        <th>Quantity</th>
                        <th>Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.rpu.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</td>
                          <td>{item.orderId}</td>
                          <td>{item.skuId}</td>
                          <td>${fmt(item.payment)}</td>
                          <td>${fmt(item.purchasePrice)}</td>
                          <td>{item.quantity}</td>
                          <td style={{ color: '#dc3545', fontWeight: 'bold' }}>${fmt(item.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </StyledTable>
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8d7da', borderRadius: '5px' }}>
                    <strong>RPU Total Loss: ${fmt(processedData.totals?.rpuTotal || 0)}</strong>
                  </div>
                </Card.Body>
              </FilterCard>
            )}

            {/* Grand Total */}
            <FilterCard>
              <Card.Header style={{ background: '#667eea' }}>
                <IconWrapper>💰</IconWrapper>
                Overall Profit/Loss Summary
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4} className="text-center">
                    <h5 style={{ color: '#28a745' }}>Delivered Profit</h5>
                    <h3 style={{ color: '#28a745' }}>${fmt(processedData.totals?.deliveredTotal || 0)}</h3>
                  </Col>
                  <Col md={4} className="text-center">
                    <h5 style={{ color: '#dc3545' }}>RPU Loss</h5>
                    <h3 style={{ color: '#dc3545' }}>${fmt(processedData.totals?.rpuTotal || 0)}</h3>
                  </Col>
                  <Col md={4} className="text-center">
                    <h5 style={{ color: processedData.totals?.grandTotal >= 0 ? '#28a745' : '#dc3545' }}>Net Profit/Loss</h5>
                    <h3 style={{ color: processedData.totals?.grandTotal >= 0 ? '#28a745' : '#dc3545' }}>
                      ${fmt(processedData.totals?.grandTotal || 0)}
                    </h3>
                  </Col>
                </Row>
              </Card.Body>
            </FilterCard>
          </>
        ) : null}

        {/* Excel Upload Section */}
        <FilterCard>
          <Card.Header>
            <IconWrapper>📁</IconWrapper>
            Upload Profit_Loss_Data.xlsx File
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Form.Label>Choose Excel File</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    System will automatically extract: Payment Date, Combo ID, Sold Price, Quantity, Status (Delivered/RPU) and calculate profit/loss using original cost prices from database.
                  </Form.Text>
                </FormGroup>
              </Col>
              <Col md={6} className="d-flex align-items-end">
                <SecondaryButton onClick={downloadExcelTemplate} className="w-100">
                  <FaDownload /> Download Template
                </SecondaryButton>
              </Col>
            </Row>
          </Card.Body>
        </FilterCard>



        {/* Profit/Loss Breakdown removed per user request; Uploaded Entries section (with chart) appears below */}

        {/* Upload Results Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>📊 Upload Results & Export</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {summary && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <Row>
                  <Col md={3}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Total Profit/Loss</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: summary.totalProfit >= 0 ? '#48bb78' : '#e53e3e' }}>
                      ${fmt(summary.totalProfit)}
                    </p>
                  </Col>
                  <Col md={3}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Delivered Profit</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#48bb78' }}>
                      ${fmt(summary.deliveredProfit)}
                    </p>
                  </Col>
                  <Col md={3}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>RPU Loss</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#e53e3e' }}>
                      ${fmt(summary.rpuProfit)}
                    </p>
                  </Col>
                  <Col md={3}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Total Records</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
                      {summary.totalRecords || 0}
                    </p>
                  </Col>
                </Row>
              </div>
            )}
            
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <StyledTable responsive striped>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Order ID</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Purchase Price</th>
                    <th>Payment</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Combo & Products</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResults.map((result, index) => {
                    // Support both old and new shapes
                    const sNo = result.sNo || result.sno || index + 1;
                    const orderId = result.orderId || result.order || '';
                    const sku = result.skuId || result.sku || result.comboId || '';
                    const qty = result.quantity || result.qty || 0;
                    const purchasePrice = result.purchasePrice !== undefined ? result.purchasePrice : (result.costPrice || 0);
                    const payment = result.payment !== undefined ? result.payment : (result.soldPrice || 0);
                    const profit = result.profit !== undefined ? result.profit : (result.profitTotal !== undefined ? result.profitTotal : null);
                    const status = result.status || 'Success';
                    const comboName = result.comboName || result.comboName || '';
                    const productDetails = result.productDetails || [];

                    return (
                      <tr key={index} style={{ opacity: status === 'Error' ? 0.6 : 1 }}>
                        <td><strong>{sNo}</strong></td>
                        <td>{orderId}</td>
                        <td>{sku}</td>
                        <td>{qty}</td>
                        <td>{purchasePrice !== undefined && purchasePrice !== null ? `$${fmt(purchasePrice)}` : '-'}</td>
                        <td>{payment !== undefined && payment !== null ? `$${fmt(payment)}` : '-'}</td>
                        <td>
                          {profit !== null ? (
                            <ProfitBadge profit={profit}>
                              ${fmt(profit)}
                            </ProfitBadge>
                          ) : (
                            <span style={{ color: '#e53e3e' }}>Error</span>
                          )}
                        </td>
                        <td>
                          {status === 'Error' ? (
                            <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>❌ Error</span>
                          ) : status === 'rpu' ? (
                            <span style={{ color: '#e53e3e' }}>🔄 RPU</span>
                          ) : (
                            <span style={{ color: '#48bb78' }}>✅ Delivered</span>
                          )}
                        </td>
                        <td style={{ color: '#e53e3e' }}>{result.message || ''}</td>
                        <td>
                          <div>
                            <strong>{comboName}</strong>
                            {result.calculationDetails && (
                              <div style={{ fontSize: '0.8rem', color: '#007bff', marginTop: '4px', fontWeight: '600' }}>
                                💰 {result.calculationDetails.calculation}
                              </div>
                            )}
                            {productDetails.length > 0 && (
                              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                {productDetails.map((product, idx) => (
                                  <div key={idx}>
                                    • {product.name} (Qty: {product.quantity}, Cost: ${fmt(product.unitCost)})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </StyledTable>
            </div>

            {/* Totals */}
            {uploadTotals && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
                <Row>
                  <Col md={3}><strong>Total Quantity:</strong> {uploadTotals.totalQuantity}</Col>
                  <Col md={3}><strong>Total Purchase:</strong> ${fmt(uploadTotals.totalPurchasePrice)}</Col>
                  <Col md={3}><strong>Total Payment:</strong> ${fmt(uploadTotals.totalPayment)}</Col>
                  <Col md={3}><strong>Total Profit:</strong> ${fmt(uploadTotals.totalProfit)}</Col>
                </Row>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => exportUploadResultsToExcel(uploadResults, uploadTotals)}>
              <FaFileExcel /> Export to Excel
            </Button>
            <Button variant="outline-danger" onClick={() => exportUploadResultsToPDF(uploadResults, uploadTotals)}>
              <FaFilePdf /> Export to PDF
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* All Uploaded Records Table */}
        {uploadedRows && uploadedRows.length > 0 && (
          <FilterCard>
            <Card.Header>
              <IconWrapper>📋</IconWrapper>
              All Uploaded Records ({uploadedRows.length})
            </Card.Header>
            <Card.Body>
              <StyledTable responsive striped>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Payment Date</th>
                    <th>Order ID</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Purchase Price</th>
                    <th>Payment</th>
                    <th>Profit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedRows.map((row, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}</td>
                      <td>{row.orderId}</td>
                      <td>{row.sku}</td>
                      <td>{row.quantity}</td>
                      <td>${fmt(row.purchasePrice)}</td>
                      <td>${fmt(row.payment)}</td>
                      <td style={{ 
                        color: row.profit >= 0 ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        ${fmt(row.profit)}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: 'white',
                          backgroundColor: row.status === 'rto' ? '#dc3545' : 
                                         row.status === 'rpu' ? '#ffc107' : '#28a745'
                        }}>
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            </Card.Body>
          </FilterCard>
        )}

        {/* Loading State */}
        {loading && profitData.length === 0 && uploadResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner animation="border" />
            <p>Processing...</p>
          </div>
        )}

      </AnimatedContainer>
    </Container>
  );
};

export default ProfitLoss;