import React, { useState, useEffect } from 'react';
import { Table, Alert, Form, Button, Row, Col, Card, Spinner } from 'react-bootstrap';
import { profitLossAPI, rtoProductsAPI } from '../services/api';
import styled from 'styled-components';
import { FaFileExcel, FaTrash, FaEye } from 'react-icons/fa';

const Container = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
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

const UploadedData = () => {
  const [uploadedSheets, setUploadedSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmt = (v) => {
    if (v === undefined || v === null) return '0.00';
    const n = Number(v);
    return isNaN(n) ? '0.00' : n.toFixed(2);
  };

  const fetchUploadedSheets = async () => {
    setLoading(true);
    try {
      const response = await profitLossAPI.getLatestUploads(50);
      setUploadedSheets(response.data.uploads || []);
      setError('');
    } catch (error) {
      setError('Failed to fetch uploaded sheets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const viewSheetData = async (sheetId) => {
    setLoading(true);
    try {
      const response = await profitLossAPI.getEntries('', '', 1000);
      const filteredData = response.data.entries.filter(entry => entry.uploadId === sheetId);
      setSheetData(filteredData);
      setSelectedSheet(sheetId);
      setError('');
    } catch (error) {
      setError('Failed to fetch sheet data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSheet = async (sheetId) => {
    if (!window.confirm('Are you sure you want to delete this upload and all related records?')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await profitLossAPI.deleteUpload(sheetId);
      console.log('Delete response:', response.data);
      await fetchUploadedSheets();
      if (selectedSheet === sheetId) {
        setSelectedSheet(null);
        setSheetData([]);
      }
      // Trigger refresh of combo-wise analysis
      window.dispatchEvent(new CustomEvent('profitDataDeleted'));
      // Show success message
      alert(`Successfully deleted upload and ${response.data?.deletedEntries || 0} related records`);
      setError('');
    } catch (error) {
      setError('Failed to delete sheet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedSheets();
  }, []);

  return (
    <Container>
      <FilterCard>
        <Card.Header>
          <FaFileExcel style={{ marginRight: '0.5rem' }} />
          Uploaded Data Records
        </Card.Header>
        <Card.Body>
          {/* Debug Section */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h6 style={{ marginBottom: '0.5rem', color: '#495057' }}>Debug Tools</h6>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={async () => {
                  try {
                    const response = await profitLossAPI.testRTOCreation({});
                    console.log('Test RTO Response:', response.data);
                    alert(`Test RTO created successfully! Check console for details.`);
                  } catch (err) {
                    console.error('Test RTO Error:', err);
                    alert('Test RTO failed: ' + err.message);
                  }
                }}
              >
                🧪 Test RTO Creation
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => {
                  console.log('Current uploaded sheets:', uploadedSheets);
                  console.log('Selected sheet data:', sheetData);
                  alert('Check console for current data state');
                }}
              >
                🔍 Debug State
              </Button>
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={async () => {
                  try {
                    const response = await rtoProductsAPI.getDebugAll();
                    console.log('RTO/RPU Debug Response:', response.data);
                    alert(`Found ${response.data.stats.total} RTO/RPU products (RTO: ${response.data.stats.rto}, RPU: ${response.data.stats.rpu})`);
                  } catch (err) {
                    console.error('RTO Debug Error:', err);
                    alert('RTO Debug failed: ' + err.message);
                  }
                }}
              >
                📦 Check RTO/RPU Data
              </Button>
              <Button 
                variant="outline-warning" 
                size="sm"
                onClick={() => window.open('/rto-products', '_blank')}
              >
                🔗 Open RTO/RPU Page
              </Button>
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={() => window.open('/rto-data-table', '_blank')}
              >
                📈 View Data Table
              </Button>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={async () => {
                  try {
                    // Test API endpoint first
                    const testResponse = await fetch('http://localhost:5000/api/rto-products/ping');
                    const testData = await testResponse.json();
                    console.log('API Test:', testData);
                    alert(`API Test: ${testData.message}`);
                  } catch (err) {
                    console.error('API Test Error:', err);
                    alert('API Test failed: ' + err.message);
                  }
                }}
              >
                🔍 Test API
              </Button>
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={async () => {
                  try {
                    // Check what data exists in database
                    const [profitResponse, returnResponse] = await Promise.all([
                      fetch('http://localhost:5000/api/profit-loss/entries?limit=1000'),
                      fetch('http://localhost:5000/api/returns')
                    ]);
                    
                    const profitData = await profitResponse.json();
                    const returnData = await returnResponse.json();
                    
                    const allEntries = profitData.entries || [];
                    const rtoRpuEntries = allEntries.filter(e => 
                      e.status === 'rto' || e.status === 'rpu'
                    );
                    
                    const statusCounts = allEntries.reduce((acc, e) => {
                      acc[e.status] = (acc[e.status] || 0) + 1;
                      return acc;
                    }, {});
                    
                    console.log('All ProfitLoss entries:', allEntries);
                    console.log('Status counts:', statusCounts);
                    console.log('RTO/RPU entries:', rtoRpuEntries);
                    console.log('Returns:', returnData);
                    
                    alert(`Total: ${allEntries.length} entries. RTO/RPU: ${rtoRpuEntries.length}. Returns: ${returnData.length || 0}. Statuses: ${Object.keys(statusCounts).join(', ')}`);
                  } catch (err) {
                    console.error('Data check error:', err);
                    alert('Data check failed: ' + err.message);
                  }
                }}
              >
                📋 Check Existing Data
              </Button>
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={async () => {
                  try {
                    // Create test RTO entry directly in ProfitLoss
                    const testEntry = {
                      orderId: 'TEST-001',
                      sku: 'TEST-SKU',
                      comboName: 'Test RTO Product',
                      quantity: 1,
                      purchasePrice: 100,
                      payment: 0,
                      profit: -100,
                      status: 'rto',
                      paymentDate: new Date(),
                      fileName: 'Test Data'
                    };
                    
                    const response = await fetch('http://localhost:5000/api/profit-loss/entries', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(testEntry)
                    });
                    
                    if (response.ok) {
                      alert('Test RTO entry created! Check RTO/RPU page.');
                    } else {
                      const error = await response.text();
                      alert('Failed: ' + error);
                    }
                  } catch (err) {
                    alert('Error: ' + err.message);
                  }
                }}
              >
                ➕ Add Test RTO
              </Button>
            </div>
          </div>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Uploaded Sheets List */}
          <h5>Uploaded Files History</h5>
          <StyledTable responsive striped>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Upload Date</th>
                <th>Total Records</th>
                <th>Success Records</th>
                <th>Error Records</th>
                <th>Total Profit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploadedSheets.map((sheet, index) => (
                <tr key={index}>
                  <td><strong>{sheet.fileName}</strong></td>
                  <td>{new Date(sheet.uploadDate).toLocaleDateString()}</td>
                  <td>{sheet.totalRecords}</td>
                  <td style={{ color: '#28a745' }}>{sheet.successRecords}</td>
                  <td style={{ color: '#dc3545' }}>{sheet.errorRecords}</td>
                  <td style={{ 
                    color: sheet.profitSummary?.totalProfit >= 0 ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    ${fmt(sheet.profitSummary?.totalProfit)}
                  </td>
                  <td>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => viewSheetData(sheet._id)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      <FaEye /> View Data
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => deleteSheet(sheet._id)}
                    >
                      <FaTrash /> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </StyledTable>

          {/* Selected Sheet Data */}
          {selectedSheet && sheetData.length > 0 && (
            <>
              <h5 style={{ marginTop: '2rem' }}>Sheet Data Details</h5>
              <StyledTable responsive striped size="sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order ID</th>
                    <th>SKU</th>
                    <th>Combo Name</th>
                    <th>Quantity</th>
                    <th>Purchase Price</th>
                    <th>Payment</th>
                    <th>Profit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetData.map((record, index) => (
                    <tr key={index}>
                      <td>{record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : 'N/A'}</td>
                      <td>{record.orderId}</td>
                      <td>{record.sku}</td>
                      <td>{record.comboName}</td>
                      <td>{record.quantity}</td>
                      <td>${fmt(record.purchasePrice)}</td>
                      <td>${fmt(record.payment)}</td>
                      <td style={{ 
                        color: record.profit >= 0 ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        ${fmt(record.profit)}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          background: record.status === 'rpu' ? '#ffc107' : '#28a745',
                          color: 'white'
                        }}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            </>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Spinner animation="border" />
              <p>Loading...</p>
            </div>
          )}
        </Card.Body>
      </FilterCard>
    </Container>
  );
};

export default UploadedData;