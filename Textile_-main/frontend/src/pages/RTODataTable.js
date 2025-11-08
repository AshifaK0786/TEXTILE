import React, { useState, useEffect } from 'react';
import { Table, Alert, Card, Spinner, Form, Row, Col } from 'react-bootstrap';
import { profitLossAPI } from '../services/api';
import styled from 'styled-components';

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
      padding: 1rem;
      font-weight: 600;
    }
  }
  
  tbody tr {
    &:hover {
      background: #f8f9fa;
    }
    
    td {
      padding: 0.8rem;
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

const RTODataTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await profitLossAPI.getEntries('', '', 2000);
      const entries = response.data.entries || [];
      
      // Filter and format data
      const formattedData = entries.map((entry, index) => ({
        sNo: index + 1,
        paymentDate: entry.paymentDate ? new Date(entry.paymentDate).toLocaleDateString() : 'N/A',
        sku: entry.sku || 'N/A',
        quantity: entry.quantity || 0,
        purchasePrice: entry.purchasePrice || 0,
        payment: entry.payment || 0,
        profit: entry.profit || 0,
        status: entry.status || 'delivered'
      }));

      setData(formattedData);
      setError('');
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = statusFilter 
    ? data.filter(item => item.status === statusFilter)
    : data;

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'rto': return '#dc3545';
      case 'rpu': return '#ffc107';
      case 'delivered': return '#28a745';
      default: return '#6c757d';
    }
  };

  const fmt = (value) => {
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  return (
    <Container>
      <FilterCard>
        <Card.Header>
          📊 RTO/RPU Data Table
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Row className="mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Filter by Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="delivered">Delivered</option>
                  <option value="rto">RTO</option>
                  <option value="rpu">RPU</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={8} className="d-flex align-items-end">
              <div>
                <strong>Total Records: {filteredData.length}</strong>
                <br />
                <small className="text-muted">
                  RTO: {filteredData.filter(d => d.status === 'rto').length} | 
                  RPU: {filteredData.filter(d => d.status === 'rpu').length} | 
                  Delivered: {filteredData.filter(d => d.status === 'delivered').length}
                </small>
              </div>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p>Loading data...</p>
            </div>
          ) : (
            <StyledTable responsive striped>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Payment Date</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Purchase Price</th>
                  <th>Payment</th>
                  <th>Profit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => (
                  <tr key={row.sNo}>
                    <td>{row.sNo}</td>
                    <td>{row.paymentDate}</td>
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
                        backgroundColor: getStatusColor(row.status)
                      }}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          )}

          {!loading && filteredData.length === 0 && (
            <div className="text-center py-4">
              <p>No data found matching the selected filters.</p>
            </div>
          )}
        </Card.Body>
      </FilterCard>
    </Container>
  );
};

export default RTODataTable;