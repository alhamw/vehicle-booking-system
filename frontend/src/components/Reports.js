import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { dashboardAPI } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });
  const [utilizationData, setUtilizationData] = useState(null);
  const [utilizationPeriod, setUtilizationPeriod] = useState('30');

  const fetchVehicleUtilization = async () => {
    try {
      const response = await dashboardAPI.getVehicleUtilization({ period: utilizationPeriod });
      setUtilizationData(response.data);
    } catch (err) {
      console.error('Vehicle utilization error:', err);
    }
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleApplyFilters = () => {
    fetchVehicleUtilization();
  };

  useEffect(() => {
    fetchVehicleUtilization();
  }, [utilizationPeriod]);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Top Vehicle Utilization (Last ${utilizationPeriod} Days)`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Utilization: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Utilization Percentage (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Vehicle Plate Number'
        }
      }
    }
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>📊 Reports & Analytics</h2>
          <p className="text-muted">Comprehensive analytics and reporting for vehicle booking system</p>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Header>
          <h5>🔍 Filters</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button 
                variant="primary" 
                onClick={handleApplyFilters}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Apply Filters'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Detailed Vehicle Utilization */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5>🚗 Detailed Vehicle Utilization Report</h5>
                </Col>
                <Col xs="auto">
                  <Form.Select
                    value={utilizationPeriod}
                    onChange={(e) => setUtilizationPeriod(e.target.value)}
                    size="sm"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="180">Last 6 Months</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {utilizationData ? (
                <div>
                  {/* Fleet Overview */}
                  <Row className="mb-4">
                    <Col md={3} sm={6} className="mb-3">
                      <div className="text-center">
                        <h4 className="text-primary mb-1">{utilizationData.fleetUtilization}%</h4>
                        <small className="text-muted">Fleet Utilization</small>
                      </div>
                    </Col>
                    <Col md={3} sm={6} className="mb-3">
                      <div className="text-center">
                        <h4 className="text-success mb-1">{utilizationData.totalFleetHours}</h4>
                        <small className="text-muted">Total Hours</small>
                      </div>
                    </Col>
                    <Col md={3} sm={6} className="mb-3">
                      <div className="text-center">
                        <h4 className="text-info mb-1">{utilizationData.vehicleCount}</h4>
                        <small className="text-muted">Total Vehicles</small>
                      </div>
                    </Col>
                    <Col md={3} sm={6} className="mb-3">
                      <div className="text-center">
                        <h4 className="text-warning mb-1">{utilizationData.topUtilizedVehicles.length}</h4>
                        <small className="text-muted">Top Utilized</small>
                      </div>
                    </Col>
                  </Row>

                  {/* Detailed Table */}
                  <h6 className="mb-3">All Vehicle Utilization Details</h6>
                  <div className="table-responsive">
                    <Table striped hover size="sm">
                      <thead>
                        <tr>
                          <th>Vehicle</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Bookings</th>
                          <th>Total Hours</th>
                          <th>Utilization %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {utilizationData.allVehicles.map((vehicle) => (
                          <tr key={vehicle.id}>
                            <td>
                              <strong>{vehicle.plateNumber}</strong>
                              <br />
                              <small className="text-muted">
                                {vehicle.make} {vehicle.model}
                              </small>
                            </td>
                            <td>{vehicle.type}</td>
                            <td>
                              <Badge bg={
                                vehicle.status === 'available' ? 'success' :
                                vehicle.status === 'in_use' ? 'warning' :
                                vehicle.status === 'maintenance' ? 'danger' : 'secondary'
                              }>
                                {vehicle.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg="info">{vehicle.bookingCount}</Badge>
                            </td>
                            <td>{vehicle.totalHours}h</td>
                            <td>
                              <Badge 
                                bg={vehicle.utilizationPercentage > 50 ? 'success' : 
                                    vehicle.utilizationPercentage > 25 ? 'warning' : 'danger'}
                              >
                                {vehicle.utilizationPercentage}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;
