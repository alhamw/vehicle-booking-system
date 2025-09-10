import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Spinner, Pagination } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, vehicleAPI, usersAPI } from '../services/api';
import { canEditBooking, canCancelBooking } from '../utils/bookingPermissions';
import CancelBookingModal from './CancelBookingModal';
import { formatDate } from '../utils/dateUtils';

const BookingList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isApprover } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Get pagination state from URL params
  const currentPage = parseInt(searchParams.get('page')) || 1;
  const currentLimit = parseInt(searchParams.get('limit')) || 10;
  const currentStatus = searchParams.get('status') || '';
  
  const [pagination, setPagination] = useState({
    page: currentPage,
    limit: currentLimit,
    total: 0,
    pages: 0
  });

  const [filters, setFilters] = useState({
    status: currentStatus,
    department: '',
    vehicle_id: '',
    start_date: '',
    end_date: '',
    employee_id: '',
    approver_id: '',
    page: currentPage
  });

  // Modal state for cancel booking
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Update URL params when filters or pagination changes
    const params = new URLSearchParams();
    if (filters.page > 1) params.set('page', filters.page.toString());
    if (pagination.limit !== 10) params.set('limit', pagination.limit.toString());
    if (filters.status) params.set('status', filters.status);
    
    setSearchParams(params);
    fetchBookings();
  }, [filters, pagination.limit, setSearchParams]);

  useEffect(() => {
    // Fetch additional data for admin users
    if (user?.role === 'admin') {
      fetchVehicles();
      fetchDepartments();
      fetchEmployees();
      fetchApprovers();
    }
  }, [user?.role]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: filters.page,
        limit: pagination.limit
      };
      
      if (filters.status) params.status = filters.status;
      if (filters.department) params.department = filters.department;
      if (filters.vehicle_id) params.vehicle_id = filters.vehicle_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.employee_id) params.employee_id = filters.employee_id;
      if (filters.approver_id) params.approver_id = filters.approver_id;

      const response = await bookingAPI.getBookings(params);
      setBookings(response.data.bookings);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await vehicleAPI.getVehicles();
      setVehicles(response.data.vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await usersAPI.getUsers();
      const allUsers = response.data.users;
      const uniqueDepartments = [...new Set(allUsers.map(user => user.department).filter(Boolean))];
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await usersAPI.getUsers();
      const allUsers = response.data.users;
      const employeeUsers = allUsers.filter(user => user.role === 'employee');
      setEmployees(employeeUsers);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchApprovers = async () => {
    try {
      const response = await usersAPI.getUsers();
      const allUsers = response.data.users;
      const approverUsers = allUsers.filter(user => user.role === 'approver_l1' || user.role === 'approver_l2');
      setApprovers(approverUsers);
    } catch (error) {
      console.error('Error fetching approvers:', error);
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      setError('');
      
      // Build export parameters (same as current filters but without pagination)
      const exportParams = {};
      if (filters.status) exportParams.status = filters.status;
      if (filters.department) exportParams.department = filters.department;
      if (filters.vehicle_id) exportParams.vehicle_id = filters.vehicle_id;
      if (filters.start_date) exportParams.start_date = filters.start_date;
      if (filters.end_date) exportParams.end_date = filters.end_date;
      if (filters.employee_id) exportParams.employee_id = filters.employee_id;
      if (filters.approver_id) exportParams.approver_id = filters.approver_id;

      console.log('Exporting with params:', exportParams);

      const response = await bookingAPI.exportBookings(exportParams);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting bookings:', error);
      if (error.response?.data?.error) {
        setError(`Failed to export bookings: ${error.response.data.error}`);
      } else {
        setError('Failed to export bookings. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1
    }));
    setFilters(prev => ({
      ...prev,
      page: 1
    }));
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      in_progress: 'info',
      completed: 'primary',
      cancelled: 'secondary'
    };
    
    return (
      <Badge bg={variants[status] || 'secondary'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else {
      return `${hours}h`;
    }
  };

  const handleViewBooking = (booking) => {
    navigate(`/bookings/${booking.id}`);
  };

  const handleCancelBooking = (booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason) => {
    if (!selectedBooking) return;

    try {
      setCancelling(true);
      await bookingAPI.cancelBooking(selectedBooking.id, reason);
      setShowCancelModal(false);
      setSelectedBooking(null);
      fetchBookings(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelClose = () => {
    setShowCancelModal(false);
    setSelectedBooking(null);
  };

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const items = [];
    const current = pagination.page;
    const total = pagination.pages;

    // First and previous
    items.push(
      <Pagination.First 
        key="first"
        disabled={current === 1}
        onClick={() => handlePageChange(1)}
      />
    );
    items.push(
      <Pagination.Prev 
        key="prev"
        disabled={current === 1}
        onClick={() => handlePageChange(current - 1)}
      />
    );

    // Page numbers
    for (let page = Math.max(1, current - 2); page <= Math.min(total, current + 2); page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === current}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    // Next and last
    items.push(
      <Pagination.Next 
        key="next"
        disabled={current === total}
        onClick={() => handlePageChange(current + 1)}
      />
    );
    items.push(
      <Pagination.Last 
        key="last"
        disabled={current === total}
        onClick={() => handlePageChange(total)}
      />
    );

    return <Pagination>{items}</Pagination>;
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h3 className="mb-0">
                <i className="fas fa-calendar-alt me-2"></i>
                Bookings
              </h3>
              <div className="d-flex gap-2">
                {/* Export button for all users */}
                <Button 
                  variant="outline-success" 
                  onClick={exportToExcel}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-excel me-2"></i>
                      Export Excel
                    </>
                  )}
                </Button>
                {/* Show New Booking button for Employees and Admins, hide for pure Approvers */}
                {(user?.role === 'employee' || user?.role === 'admin') && (
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/bookings/create')}
                  >
                    <i className="fas fa-plus me-2"></i>
                    New Booking
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {/* Filters */}
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                {user?.role === 'admin' && (
                  <>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Department</Form.Label>
                        <Form.Select
                          name="department"
                          value={filters.department}
                          onChange={handleFilterChange}
                        >
                          <option value="">All Departments</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Vehicle</Form.Label>
                        <Form.Select
                          name="vehicle_id"
                          value={filters.vehicle_id}
                          onChange={handleFilterChange}
                        >
                          <option value="">All Vehicles</option>
                          {vehicles.map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </>
                )}
                <Col md={user?.role === 'admin' ? 3 : 3}>
                  <Form.Group>
                    <Form.Label>Show</Form.Label>
                    <Form.Select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Employee and Approver Filters for Admin */}
              {user?.role === 'admin' && (
                <Row className="mb-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Employee</Form.Label>
                      <Form.Select
                        name="employee_id"
                        value={filters.employee_id}
                        onChange={handleFilterChange}
                      >
                        <option value="">All Employees</option>
                        {employees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} ({employee.department})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Approver</Form.Label>
                      <Form.Select
                        name="approver_id"
                        value={filters.approver_id}
                        onChange={handleFilterChange}
                      >
                        <option value="">All Approvers</option>
                        {approvers.map(approver => (
                          <option key={approver.id} value={approver.id}>
                            {approver.name} ({approver.role.replace('_', ' ').toUpperCase()})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>&nbsp;</Form.Label>
                      <div>
                        <Button 
                          variant="outline-secondary" 
                          onClick={() => {
                            setFilters({ 
                              status: '', 
                              department: '', 
                              vehicle_id: '', 
                              start_date: '', 
                              end_date: '', 
                              employee_id: '', 
                              approver_id: '', 
                              page: 1 
                            });
                            setPagination(prev => ({ ...prev, page: 1 }));
                          }}
                        >
                          <i className="fas fa-times me-2"></i>
                          Clear Filters
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {/* Date Range Filters for Admin */}
              {user?.role === 'admin' && (
                <Row className="mb-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>End Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>&nbsp;</Form.Label>
                      <div>
                        <Button 
                          variant="outline-secondary" 
                          onClick={() => {
                            setFilters({ 
                              status: '', 
                              department: '', 
                              vehicle_id: '', 
                              start_date: '', 
                              end_date: '', 
                              employee_id: '', 
                              approver_id: '', 
                              page: 1 
                            });
                            setPagination(prev => ({ ...prev, page: 1 }));
                          }}
                        >
                          <i className="fas fa-times me-2"></i>
                          Clear Filters
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading bookings...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                  <h5>No bookings found</h5>
                  <p className="text-muted">
                    {filters.status || filters.priority 
                      ? 'No bookings match your current filters.'
                      : 'You haven\'t created any bookings yet.'
                    }
                  </p>
                  {/* Show Create First Booking button only for Admins */}
                  {user?.role === 'admin' && (
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/bookings/create')}
                    >
                      Create Your First Booking
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table striped hover>
                      <thead>
                        <tr>
                          <th>Booking ID</th>
                          <th>Vehicle</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          {user?.role === 'admin' && <th>Duration</th>}
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map(booking => (
                          <tr key={booking.id}>
                            <td>
                              <Badge bg="secondary">#{booking.id}</Badge>
                            </td>
                            <td>
                              <div>
                                <strong>{booking.vehicle?.plate_number}</strong>
                                <br />
                                <small className="text-muted">
                                  {booking.vehicle?.make} {booking.vehicle?.model}
                                </small>
                              </div>
                            </td>
                            <td>{formatDate(booking.start_date)}</td>
                            <td>{formatDate(booking.end_date)}</td>
                            {user?.role === 'admin' && (
                              <td>
                                <Badge bg="info">
                                  {formatDuration(booking.start_date, booking.end_date)}
                                </Badge>
                              </td>
                            )}
                            <td>{getStatusBadge(booking.status)}</td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => handleViewBooking(booking)}
                                  title="View Details"
                                >
                                  <i className="fas fa-eye"></i>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-warning"
                                  disabled={!canEditBooking(booking, user)}
                                  onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                                  title="Edit Booking"
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                                {user?.role === 'admin' && (
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    disabled={!canCancelBooking(booking, user)}
                                    onClick={() => handleCancelBooking(booking)}
                                    title="Cancel Booking"
                                  >
                                    <i className="fas fa-times"></i>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      <small className="text-muted d-block mb-1">
                        Showing {Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)} to{' '}
                        {Math.min(pagination.total, pagination.page * pagination.limit)} of {pagination.total} bookings
                        {user?.role === 'employee' && (
                          <span className="ms-2">(filtered to your bookings only)</span>
                        )}
                      </small>
                    </div>
                    {renderPagination()}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        show={showCancelModal}
        onHide={handleCancelClose}
        booking={selectedBooking}
        onConfirm={handleCancelConfirm}
        loading={cancelling}
      />
    </Container>
  );
};

export default BookingList;
