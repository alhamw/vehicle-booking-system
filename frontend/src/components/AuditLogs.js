import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Alert, Spinner, Pagination } from 'react-bootstrap';
import { auditLogsAPI } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';

const AuditLogs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    userId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params[key] = filters[key];
        }
      });

      console.log('Fetching audit logs with params:', params);
      const response = await auditLogsAPI.getAuditLogs(params);
      console.log('Audit logs response:', response);
      setAuditLogs(response.data.auditLogs);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Audit logs error:', err);
      if (err.response?.data?.error) {
        setError(`Failed to fetch audit logs: ${err.response.data.error}`);
      } else {
        setError('Failed to fetch audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      }

      console.log('Fetching stats with params:', params);
      const response = await auditLogsAPI.getStats(params);
      console.log('Stats response:', response);
      setStats(response.data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const handleApplyFilters = () => {
    fetchAuditLogs();
    fetchStats();
  };

  const handleExport = async () => {
    try {
      const params = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] && key !== 'page' && key !== 'limit') {
          params[key] = filters[key];
        }
      });
      params.format = 'csv';

      console.log('Exporting with params:', params);
      const response = await auditLogsAPI.exportAuditLogs(params);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export audit logs');
      console.error('Export error:', err);
    }
  };

  const getActionBadge = (action) => {
    const variants = {
      CREATE: 'success',
      UPDATE: 'primary',
      DELETE: 'danger',
      LOGIN: 'info',
      LOGOUT: 'secondary'
    };
    return <Badge bg={variants[action] || 'secondary'}>{action}</Badge>;
  };

  const getEntityBadge = (entity) => {
    const variants = {
      booking: 'primary',
      vehicle: 'success',
      driver: 'info',
      user: 'warning',
      approval: 'secondary'
    };
    return <Badge bg={variants[entity] || 'secondary'}>{entity}</Badge>;
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, [filters.page]);

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, []);

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>📋 Audit Logs</h2>
          <p className="text-muted">Track all system activities and user actions</p>
        </Col>
      </Row>

      {/* Statistics Summary */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{stats.summary.total}</h3>
                <p className="text-muted">Total Logs</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{stats.summary.recent24h}</h3>
                <p className="text-muted">Last 24 Hours</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card>
              <Card.Header>
                <h6>Top Actions</h6>
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-wrap gap-2">
                  {stats.byAction.slice(0, 5).map((item, index) => (
                    <Badge key={index} bg="secondary">
                      {item.action}: {item.count}
                    </Badge>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Header>
          <h5>🔍 Filters</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Action</Form.Label>
                <Form.Select
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Entity</Form.Label>
                <Form.Select
                  name="entity"
                  value={filters.entity}
                  onChange={handleFilterChange}
                >
                  <option value="">All Entities</option>
                  <option value="booking">Booking</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="driver">Driver</option>
                  <option value="user">User</option>
                  <option value="approval">Approval</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
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
            <Col md={2}>
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
            <Col md={2}>
              <Form.Group>
                <Form.Label>User ID</Form.Label>
                <Form.Control
                  type="text"
                  name="userId"
                  value={filters.userId}
                  onChange={handleFilterChange}
                  placeholder="Filter by user ID"
                />
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
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

      {/* Audit Logs Table */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5>📋 Activity Log</h5>
          <Button variant="success" onClick={handleExport} disabled={loading}>
            📤 Export CSV
          </Button>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Entity ID</th>
                      <th>Details</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          {formatDateTime(log.created_at)}
                        </td>
                        <td>
                          <div>
                            <strong>{log.user?.name}</strong>
                            <br />
                            <small className="text-muted">{log.user?.email}</small>
                          </div>
                        </td>
                        <td>{getActionBadge(log.action)}</td>
                        <td>{getEntityBadge(log.entity)}</td>
                        <td>{log.entity_id || '-'}</td>
                        <td>
                          <small className="text-muted">
                            {log.details ? (
                              <span title={log.details}>
                                {log.details.length > 50 
                                  ? `${log.details.substring(0, 50)}...` 
                                  : log.details
                                }
                              </span>
                            ) : '-'}
                          </small>
                        </td>
                        <td>
                          <small className="text-muted">{log.ip_address || '-'}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First 
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    />
                    
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Pagination.Item
                          key={page}
                          active={page === pagination.page}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Pagination.Item>
                      );
                    })}
                    
                    <Pagination.Next 
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                    />
                    <Pagination.Last 
                      onClick={() => handlePageChange(pagination.pages)}
                      disabled={pagination.page === pagination.pages}
                    />
                  </Pagination>
                </div>
              )}

              {/* Results Summary */}
              <div className="text-center mt-3">
                <small className="text-muted">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </small>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AuditLogs;
