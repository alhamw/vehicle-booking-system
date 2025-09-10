import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { dashboardAPI } from '../services/api';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const VehicleUtilizationChart = () => {
  const [utilizationData, setUtilizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchUtilizationData();
  }, [period]);

  const fetchUtilizationData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await dashboardAPI.getVehicleUtilization({ period });
      setUtilizationData(response.data);
    } catch (err) {
      console.error('Error fetching utilization data:', err);
      setError('Failed to load vehicle utilization data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      available: 'success',
      in_use: 'warning',
      maintenance: 'danger',
      out_of_service: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Top Vehicle Utilization (Last ${period} Days)`,
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

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-chart-bar me-2"></i>
            Vehicle Utilization Chart
          </h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading utilization data...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-chart-bar me-2"></i>
            Vehicle Utilization Chart
          </h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h5 className="mb-0">
              <i className="fas fa-chart-bar me-2"></i>
              Vehicle Utilization Chart
            </h5>
          </Col>
          <Col xs="auto">
            <Form.Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
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

        {/* Chart */}
        <div className="mb-4" style={{ height: '400px' }}>
          <Bar data={utilizationData.chartData} options={chartOptions} />
        </div>

        {/* View Detailed Report Button */}
        <div className="text-center">
          <Link to="/admin/reports" className="btn btn-outline-primary">
            <i className="fas fa-chart-bar me-2"></i>
            View Detailed Vehicle Utilization Report
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
};

export default VehicleUtilizationChart;
