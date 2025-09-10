import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button, Modal, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, vehicleAPI } from '../services/api';
import VehicleUtilizationChart from '../components/VehicleUtilizationChart';
import { canEditBooking, canCancelBooking, canApproveBooking, canRejectBooking } from '../utils/bookingPermissions';
import CancelBookingModal from '../components/CancelBookingModal';
import { formatDate } from '../utils/dateUtils';

const Dashboard = () => {
  const { user, isAdmin, isApprover, isApproverOnly } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    totalApprovals: 0,
    pendingApprovals: 0,
    approvedApprovals: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentApprovals, setRecentApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination state for approvals
  const [approvalPagination, setApprovalPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Filter state for approvals
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all' or 'level1_approved'
  
  // Modal state for approval/rejection
  const [showModal, setShowModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [modalAction, setModalAction] = useState(''); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  // Modal state for cancel booking
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [approvalPagination.page, approvalPagination.limit, approvalFilter]);

  const handleApprovalPageChange = (newPage) => {
    setApprovalPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleApprovalLimitChange = (newLimit) => {
    setApprovalPagination(prev => ({
      ...prev,
      page: 1, // Reset to first page when changing limit
      limit: newLimit
    }));
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (isApproverOnly) {
        // Fetch all approval data for approvers (both Level 1 and Level 2 for logic)
        const params = {
          page: approvalPagination.page,
          limit: approvalPagination.limit,
          show_all: 'true' // Always show all approvals for proper Level 2 logic
        };

        const approvalsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/approvals?${new URLSearchParams(params)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (approvalsResponse.ok) {
          const allApprovals = await approvalsResponse.json();
          const approvals = allApprovals.approvals;
          
          // For Level 2 approvers, filter to only show Level 2 approvals in the table
          // For Level 1 approvers, filter to only show Level 1 approvals in the table
          // But keep all approvals for the canApprove logic (for Level 2)
          const displayApprovals = user?.role === 'approver_l2' 
            ? approvals.filter(a => a.level === 2)
            : user?.role === 'approver_l1'
            ? approvals.filter(a => a.level === 1)
            : approvals;
          
          setRecentApprovals(displayApprovals);
          setApprovalPagination({
            page: allApprovals.pagination.page,
            limit: allApprovals.pagination.limit,
            total: displayApprovals.length, // Use filtered count for pagination
            pages: Math.ceil(displayApprovals.length / allApprovals.pagination.limit)
          });
          
          setStats({
            totalBookings: 0,
            pendingBookings: 0,
            approvedBookings: 0,
            totalVehicles: 0,
            availableVehicles: 0,
            totalApprovals: displayApprovals.length,
            pendingApprovals: displayApprovals.filter(a => a.status === 'pending').length,
            approvedApprovals: displayApprovals.filter(a => a.status === 'approved').length
          });
          
          // Store all approvals for Level 2 canApprove logic (to check Level 1 status)
          if (user?.role === 'approver_l2') {
            // Store all approvals in a ref or state for canApprove function
            window.allApprovalsForLevel2 = approvals;
          }
        }
      } else if (!isAdmin) {
        // Fetch booking data for non-approvers (but not admin)
      const bookingsResponse = await bookingAPI.getBookings({ 
        limit: 5, 
        page: 1 
      });
      setRecentBookings(bookingsResponse.data.bookings);

      // Calculate stats from bookings
      const allBookingsResponse = await bookingAPI.getBookings({ 
        limit: 1000, 
        page: 1 
      });
      const allBookings = allBookingsResponse.data.bookings;
      
      // Fetch vehicles
      const vehiclesResponse = await vehicleAPI.getVehicles();
      const vehicles = vehiclesResponse.data.vehicles;

      setStats({
        totalBookings: allBookings.length,
        pendingBookings: allBookings.filter(b => b.status === 'pending').length,
        approvedBookings: allBookings.filter(b => b.status === 'approved').length,
        totalVehicles: vehicles.length,
          availableVehicles: vehicles.filter(v => v.status === 'available').length,
          totalApprovals: 0,
          pendingApprovals: 0,
          approvedApprovals: 0
      });
      } else {
        // Admin dashboard - only fetch stats and vehicles
        const allBookingsResponse = await bookingAPI.getBookings({ 
          limit: 1000, 
          page: 1 
        });
        const allBookings = allBookingsResponse.data.bookings;
        
        // Fetch vehicles
        const vehiclesResponse = await vehicleAPI.getVehicles();
        const vehicles = vehiclesResponse.data.vehicles;

        setStats({
          totalBookings: allBookings.length,
          pendingBookings: allBookings.filter(b => b.status === 'pending').length,
          approvedBookings: allBookings.filter(b => b.status === 'approved').length,
          totalVehicles: vehicles.length,
          availableVehicles: vehicles.filter(v => v.status === 'available').length,
          totalApprovals: 0,
          pendingApprovals: 0,
          approvedApprovals: 0
        });
      }

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      in_progress: 'info',
      completed: 'success',
      cancelled: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
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
        fetchDashboardData(); // Refresh the data
      } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelClose = () => {
    setShowCancelModal(false);
    setSelectedBooking(null);
  };

  // Approval functions
  const openApprovalModal = (approval, action) => {
    setSelectedApproval(approval);
    setModalAction(action);
    setComments('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedApproval(null);
    setModalAction('');
    setComments('');
  };

  const handleApprovalAction = async () => {
    if (!selectedApproval || !modalAction) return;

    try {
      setProcessing(true);

      // Update the approval status
      const approvalData = {
        status: modalAction === 'approve' ? 'approved' : 'rejected',
        comments: comments.trim() || null
      };

      // Call the approval API endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/approvals/${selectedApproval.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(approvalData)
      });

      if (!response.ok) {
        throw new Error('Failed to update approval');
      }

      closeModal();
      fetchDashboardData(); // Refresh the data

    } catch (error) {
      console.error('Error processing approval:', error);
      alert(`Failed to ${modalAction} booking`);
    } finally {
      setProcessing(false);
    }
  };

  const canApprove = (approval) => {
    // Can only approve if booking status is pending
    if (approval.booking?.status !== 'pending') return false;
    
    // For Level 1 approvers, can approve if status is pending
    if (user?.role === 'approver_l1') {
      return approval.status === 'pending';
    }
    
    // For Level 2 approvers, can approve if status is pending AND Level 1 has approved
    if (user?.role === 'approver_l2') {
      if (approval.status !== 'pending') return false;
      
      // Check if Level 1 has approved this booking
      // Use the stored all approvals to check Level 1 status
      const allApprovals = window.allApprovalsForLevel2 || [];
      const level1Approval = allApprovals.find(a => 
        a.booking_id === approval.booking_id && 
        a.level === 1 && 
        a.status === 'approved'
      );
      
      // Enable approve button if Level 1 has approved
      return !!level1Approval;
    }
    
    return false;
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

  if (loading) {
    return (
      <Container>
        <div className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h1>Dashboard</h1>
          <p className="text-muted">Welcome back, {user?.name}!</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4">
        {isApproverOnly ? (
          // Approval stats for approvers
          <>
            <Col md={3} sm={6} className="mb-3">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <i className="fas fa-check-circle fa-2x text-primary mb-2"></i>
                  <h3>{stats.totalApprovals}</h3>
                  <p className="text-muted mb-0">Total Approval Requests</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6} className="mb-3">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <i className="fas fa-clock fa-2x text-warning mb-2"></i>
                  <h3>{stats.pendingApprovals}</h3>
                  <p className="text-muted mb-0">Pending Approval</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6} className="mb-3">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <i className="fas fa-check fa-2x text-success mb-2"></i>
                  <h3>{stats.approvedApprovals}</h3>
                  <p className="text-muted mb-0">Approved Requests</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6} className="mb-3">
              <Card className="h-100">
                <Card.Body className="text-center">
                  <i className="fas fa-user-tie fa-2x text-info mb-2"></i>
                  <h3>{user?.role === 'approver_l1' ? 'Level 1' : 'Level 2'}</h3>
                  <p className="text-muted mb-0">Approval Level</p>
                </Card.Body>
              </Card>
            </Col>
          </>
        ) : (
          // Booking stats for non-approvers
          <>
        <Col md={3} sm={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <i className="fas fa-calendar-alt fa-2x text-primary mb-2"></i>
              <h3>{stats.totalBookings}</h3>
              <p className="text-muted mb-0">Total Bookings</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <i className="fas fa-clock fa-2x text-warning mb-2"></i>
              <h3>{stats.pendingBookings}</h3>
              <p className="text-muted mb-0">Pending Approval</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <i className="fas fa-truck fa-2x text-success mb-2"></i>
              <h3>{stats.availableVehicles}</h3>
              <p className="text-muted mb-0">Available Vehicles</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <i className="fas fa-check-circle fa-2x text-info mb-2"></i>
              <h3>{stats.approvedBookings}</h3>
              <p className="text-muted mb-0">Approved Bookings</p>
            </Card.Body>
          </Card>
        </Col>
          </>
        )}
      </Row>

      {/* Quick Actions - Only for non-approvers */}
      {!isApproverOnly && (
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                {/* Show New Booking for Employees and Admins, hide for pure Approvers */}
                {(user?.role === 'employee' || user?.role === 'admin') && (
                  <Col md={3} sm={6} className="mb-2">
                    <Link to="/bookings/create" className="btn btn-primary w-100">
                      <i className="fas fa-plus me-2"></i>
                      New Booking
                    </Link>
                  </Col>
                )}
                <Col md={3} sm={6} className="mb-2">
                  <Link to="/bookings" className="btn btn-outline-primary w-100">
                    <i className="fas fa-list me-2"></i>
                    View All Bookings
                  </Link>
                </Col>
                {isAdmin && (
                  <>
                    <Col md={3} sm={6} className="mb-2">
                      <Link to="/admin/vehicles" className="btn btn-outline-success w-100">
                        <i className="fas fa-truck me-2"></i>
                        Manage Vehicles
                      </Link>
                    </Col>
                    <Col md={3} sm={6} className="mb-2">
                      <Link to="/admin/reports" className="btn btn-outline-info w-100">
                        <i className="fas fa-chart-bar me-2"></i>
                        View Reports
                      </Link>
                    </Col>
                  </>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      )}

      {/* Vehicle Utilization Chart - Admin Only */}
      {isAdmin && (
        <Row className="mb-4">
          <Col>
            <VehicleUtilizationChart />
          </Col>
        </Row>
      )}

            {/* Recent Bookings/Approvals */}
      {!isAdmin && (
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{isApproverOnly ? 'Booking Approval' : 'Recent Bookings'}</h5>
              {!isApproverOnly && (
              <Link to="/bookings" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
              )}
            </Card.Header>
            <Card.Body>
              {isApproverOnly ? (
                // Booking Approval for approvers
                recentApprovals.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-check-circle fa-3x text-muted mb-3"></i>
                    <p className="text-muted">No approval requests found</p>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Booking ID</th>
                            <th>Requester</th>
                            <th>Vehicle</th>
                            <th>Schedule</th>
                            <th>Duration</th>
                            <th>Book Status</th>
                            {user?.role === 'approver_l2' && <th>Level 1 Status</th>}
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentApprovals.map((approval) => (
                            <tr key={approval.id}>
                              <td>
                                <strong>#{approval.booking?.id}</strong>
                              </td>
                              <td>
                                <strong>{approval.booking?.user?.name}</strong><br />
                                <small className="text-muted">
                                  {approval.booking?.user?.department}
                                </small>
                              </td>
                              <td>
                                <strong>{approval.booking?.vehicle?.plate_number}</strong><br />
                                <small className="text-muted">
                                  {approval.booking?.vehicle?.make} {approval.booking?.vehicle?.model}
                                </small>
                              </td>
                              <td>
                                <small>
                                  <strong>Start:</strong> {formatDate(approval.booking?.start_date)}<br />
                                  <strong>End:</strong> {formatDate(approval.booking?.end_date)}
                                </small>
                              </td>
                              <td>
                                <Badge bg="info">
                                  {formatDuration(approval.booking?.start_date, approval.booking?.end_date)}
                                </Badge>
                              </td>
                              <td>{getStatusBadge(approval.booking?.status)}</td>
                              {user?.role === 'approver_l2' && (
                                <td>
                                  {(() => {
                                    const allApprovals = window.allApprovalsForLevel2 || [];
                                    const level1Approval = allApprovals.find(a => 
                                      a.booking_id === approval.booking_id && 
                                      a.level === 1
                                    );
                                    if (level1Approval) {
                                      return getStatusBadge(level1Approval.status);
                                    } else {
                                      return <Badge bg="secondary">Not Assigned</Badge>;
                                    }
                                  })()}
                                </td>
                              )}
                              <td>
                                <div className="d-flex gap-1">
                                  <Link 
                                    to={`/bookings/${approval.booking?.id}`} 
                                    className="btn btn-sm btn-outline-primary"
                                    title="View Details"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </Link>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    disabled={!canApproveBooking(approval, user)}
                                    onClick={() => openApprovalModal(approval, 'approve')}
                                    title="Approve"
                                  >
                                    <i className="fas fa-check"></i>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    disabled={!canRejectBooking(approval, user)}
                                    onClick={() => openApprovalModal(approval, 'reject')}
                                    title="Reject"
                                  >
                                    <i className="fas fa-times"></i>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="d-flex align-items-center">
                        <span className="me-3">Show:</span>
                        <Form.Select
                          value={approvalPagination.limit}
                          onChange={(e) => handleApprovalLimitChange(parseInt(e.target.value))}
                          style={{ width: 'auto' }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </Form.Select>
                        <span className="ms-3">
                          Showing {((approvalPagination.page - 1) * approvalPagination.limit) + 1} to {Math.min(approvalPagination.page * approvalPagination.limit, approvalPagination.total)} of {approvalPagination.total} approvals
                        </span>
                      </div>
                      
                      <div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleApprovalPageChange(approvalPagination.page - 1)}
                          disabled={approvalPagination.page <= 1}
                          className="me-2"
                        >
                          <i className="fas fa-chevron-left"></i> Previous
                        </Button>
                        
                        <span className="mx-2">
                          Page {approvalPagination.page} of {approvalPagination.pages}
                        </span>
                        
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleApprovalPageChange(approvalPagination.page + 1)}
                          disabled={approvalPagination.page >= approvalPagination.pages}
                        >
                          Next <i className="fas fa-chevron-right"></i>
                        </Button>
                      </div>
                    </div>
                  </>
                )
              ) : (
                // Recent Bookings for non-approvers
                recentBookings.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No bookings found</p>
                  <Link to="/bookings/create" className="btn btn-primary">
                    Create Your First Booking
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                          {user?.role === 'admin' && <th>Duration</th>}
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>
                            <strong>{booking.vehicle?.plate_number}</strong><br />
                            <small className="text-muted">
                              {booking.vehicle?.make} {booking.vehicle?.model}
                            </small>
                          </td>
                          <td>
                            {formatDate(booking.start_date)}
                          </td>
                          <td>
                            {formatDate(booking.end_date)}
                          </td>
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
                              <Link 
                                to={`/bookings/${booking.id}`} 
                                className="btn btn-sm btn-outline-primary"
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Button 
                                size="sm" 
                                variant="outline-warning"
                                disabled={!canEditBooking(booking, user)}
                                onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                                title="Edit Booking"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline-danger"
                                disabled={!canCancelBooking(booking, user)}
                                onClick={() => handleCancelBooking(booking)}
                                title="Cancel Booking"
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                )
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      )}

      {/* Approval/Rejection Modal */}
      {isApproverOnly && (
        <Modal show={showModal} onHide={closeModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {modalAction === 'approve' ? (
                <><i className="fas fa-check text-success me-2"></i>Approve Booking</>
              ) : (
                <><i className="fas fa-times text-danger me-2"></i>Reject Booking</>
              )}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedApproval && (
              <div>
                <h6>Booking Details:</h6>
                <Row>
                  <Col md={6}>
                    <dl className="row">
                      <dt className="col-sm-4">Approval ID:</dt>
                      <dd className="col-sm-8">#{selectedApproval.id}</dd>
                      
                      <dt className="col-sm-4">Booking ID:</dt>
                      <dd className="col-sm-8">#{selectedApproval.booking?.id}</dd>
                      
                      <dt className="col-sm-4">Requester:</dt>
                      <dd className="col-sm-8">{selectedApproval.booking?.user?.name}</dd>
                      
                      <dt className="col-sm-4">Department:</dt>
                      <dd className="col-sm-8">{selectedApproval.booking?.user?.department}</dd>
                      
                      <dt className="col-sm-4">Vehicle:</dt>
                      <dd className="col-sm-8">
                        {selectedApproval.booking?.vehicle?.plate_number} - {selectedApproval.booking?.vehicle?.make} {selectedApproval.booking?.vehicle?.model}
                      </dd>
                    </dl>
                  </Col>
                  <Col md={6}>
                    <dl className="row">
                      <dt className="col-sm-4">Start Date:</dt>
                      <dd className="col-sm-8">{formatDate(selectedApproval.booking?.start_date)}</dd>
                      
                      <dt className="col-sm-4">End Date:</dt>
                      <dd className="col-sm-8">{formatDate(selectedApproval.booking?.end_date)}</dd>
                      
                      <dt className="col-sm-4">Duration:</dt>
                      <dd className="col-sm-8">
                        {formatDuration(selectedApproval.booking?.start_date, selectedApproval.booking?.end_date)}
                      </dd>
                      
                      <dt className="col-sm-4">Booking Status:</dt>
                      <dd className="col-sm-8">{getStatusBadge(selectedApproval.booking?.status)}</dd>
                      
                      <dt className="col-sm-4">Approval Status:</dt>
                      <dd className="col-sm-8">{getStatusBadge(selectedApproval.status)}</dd>
                      
                      {selectedApproval.booking?.notes && (
                        <>
                          <dt className="col-sm-4">Notes:</dt>
                          <dd className="col-sm-8">{selectedApproval.booking.notes}</dd>
                        </>
                      )}
                    </dl>
                  </Col>
                </Row>
                
                <Form.Group className="mt-3">
                  <Form.Label>
                    Comments {modalAction === 'reject' && <span className="text-danger">*</span>}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={
                      modalAction === 'approve' 
                        ? "Optional: Add any approval comments or conditions..."
                        : "Required: Please provide a reason for rejection..."
                    }
                    required={modalAction === 'reject'}
                  />
                </Form.Group>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              variant={modalAction === 'approve' ? 'success' : 'danger'}
              onClick={handleApprovalAction}
              disabled={processing || (modalAction === 'reject' && !comments.trim())}
            >
              {processing ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Processing...
                </>
              ) : (
                <>
                  <i className={`fas fa-${modalAction === 'approve' ? 'check' : 'times'} me-2`}></i>
                  {modalAction === 'approve' ? 'Approve' : 'Reject'} Booking
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

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

export default Dashboard;
