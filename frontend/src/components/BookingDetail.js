import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canEditBooking, canCancelBooking, canApproveBooking, canRejectBooking, isApprover } from '../utils/bookingPermissions';
import CancelBookingModal from './CancelBookingModal';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { bookingAPI } from '../services/api';

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  const [approvalComments, setApprovalComments] = useState('');
  const [approvalProcessing, setApprovalProcessing] = useState(false);
  const [currentApproval, setCurrentApproval] = useState(null);

  // Export state
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchBooking();
    if (user?.role === 'admin') {
      fetchActivities();
    }
  }, [id, user?.role]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await bookingAPI.getBookingById(id);
      setBooking(response.data.booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      if (error.response?.status === 404) {
        setError('Booking not found');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this booking');
      } else {
        setError('Failed to load booking details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoadingActivities(true);
      const response = await bookingAPI.getBookingActivities(id);
      setActivities(response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Don't show error for activities as it's not critical
    } finally {
      setLoadingActivities(false);
    }
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
      <Badge bg={variants[status] || 'secondary'} className="fs-6">
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
      return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  const getCurrentApproval = () => {
    if (!booking || !user) return null;
    const userLevel = user.role === 'approver_l1' ? 1 : 2;
    return booking.approvals?.find(a => a.level === userLevel);
  };

  const getCurrentApprovalForUser = () => {
    if (!booking || !user) return null;
    const userLevel = user.role === 'approver_l1' ? 1 : 2;
    return booking.approvals?.find(a => a.level === userLevel);
  };

  const openApprovalModal = (action) => {
    const approval = getCurrentApproval();
    if (!approval) return;
    
    setCurrentApproval(approval);
    setApprovalAction(action);
    setApprovalComments('');
    setShowApprovalModal(true);
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setCurrentApproval(null);
    setApprovalAction('');
    setApprovalComments('');
  };

  const handleApprovalAction = async () => {
    if (!currentApproval || !approvalAction) return;

    try {
      setApprovalProcessing(true);

      const approvalData = {
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        comments: approvalComments.trim() || null
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/approvals/${currentApproval.id}`, {
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

      setSuccess(`Booking ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
      closeApprovalModal();
      fetchBooking(); // Refresh booking data

    } catch (error) {
      console.error('Error processing approval:', error);
      setError(`Failed to ${approvalAction} booking`);
    } finally {
      setApprovalProcessing(false);
    }
  };

  const handleCancelBooking = async (reason) => {
    try {
      setCancelling(true);
      await bookingAPI.cancelBooking(booking.id, reason);
      setSuccess('Booking cancelled successfully');
      setShowCancelModal(false);
      await fetchBooking(); // Refresh booking data
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelClose = () => {
    setShowCancelModal(false);
  };

  const handleExportActivities = async () => {
    try {
      setExporting(true);
      const response = await bookingAPI.exportBookingActivities(id);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booking_${id}_activities_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Activity log exported successfully!');
    } catch (error) {
      console.error('Error exporting activities:', error);
      setError('Failed to export activity log');
    } finally {
      setExporting(false);
    }
  };

  const renderApprovalStatus = () => {
    if (!booking.approvals || booking.approvals.length === 0) {
      return (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          No approval workflow configured for this booking.
        </Alert>
      );
    }

    return (
      <div>
        <h6 className="mb-3">Approval Workflow</h6>
        {booking.approvals.sort((a, b) => a.level - b.level).map((approval, index) => (
          <div key={approval.id} className="d-flex align-items-center mb-2">
            <div className="me-3">
              <i className={`fas fa-${approval.status === 'approved' ? 'check-circle text-success' : 
                approval.status === 'rejected' ? 'times-circle text-danger' : 
                approval.status === 'cancelled' ? 'times text-secondary' : 
                'clock text-warning'}`}></i>
            </div>
            <div className="flex-grow-1">
              <strong>Level {approval.level}</strong>
              {approval.approver && (
                <span className="text-muted"> - {approval.approver.name}</span>
              )}
              <div>
                <Badge bg={
                  approval.status === 'approved' ? 'success' : 
                  approval.status === 'rejected' ? 'danger' : 
                  approval.status === 'cancelled' ? 'secondary' : 'warning'
                }>
                  {approval.status.toUpperCase()}
                </Badge>
                {approval.approved_at && (
                  <small className="text-muted ms-2">
                    {formatDate(approval.approved_at)}
                  </small>
                )}
              </div>
              {approval.comments && (
                <div className="text-muted mt-1">
                  <small>"{approval.comments}"</small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-2">Loading booking details...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </Alert>
        <Button variant="secondary" onClick={() => navigate('/bookings')}>
          <i className="fas fa-arrow-left me-2"></i>
          Back to Bookings
        </Button>
      </Container>
    );
  }

  if (!booking) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Booking not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <style>
        {`
          .activity-description {
            line-height: 1.4;
            word-break: break-word;
          }
          .activity-item {
            border-left: 3px solid #e9ecef;
            padding-left: 15px;
            margin-left: 10px;
          }
          .activity-item:last-child {
            border-left: none;
          }
          .activity-icon {
            margin-top: 2px;
          }
          .activity-icon i {
            font-size: 16px;
          }
        `}
      </style>
      <Row>
        <Col>
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess('')}>
              <i className="fas fa-check-circle me-2"></i>
              {success}
            </Alert>
          )}

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
            </Alert>
          )}

          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="mb-0">
                  <i className="fas fa-calendar-check me-2"></i>
                  Booking #{booking.id}
                </h3>
                <div className="mt-2">
                  {getStatusBadge(booking.status)}
                </div>
              </div>
              <div>
                <Button
                  variant="secondary"
                  className="me-2"
                  onClick={() => navigate(isApprover(user) ? '/dashboard' : '/bookings')}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  {isApprover(user) ? 'Back to Dashboard' : 'Back to List'}
                </Button>
                <Button
                  variant="primary"
                  className="me-2"
                  disabled={!canEditBooking(booking, user)}
                  onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                >
                  <i className="fas fa-edit me-2"></i>
                  Edit
                </Button>
                {isApprover(user) && (
                  <>
                    <Button
                      variant="success"
                      className="me-2"
                      disabled={!canApproveBooking(getCurrentApprovalForUser(), user)}
                      onClick={() => openApprovalModal('approve')}
                    >
                      <i className="fas fa-check me-2"></i>
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      className="me-2"
                      disabled={!canRejectBooking(getCurrentApprovalForUser(), user)}
                      onClick={() => openApprovalModal('reject')}
                    >
                      <i className="fas fa-times me-2"></i>
                      Reject
                    </Button>
                  </>
                )}
                {user?.role === 'admin' && (
                  <Button
                    variant="danger"
                    disabled={!canCancelBooking(booking, user)}
                    onClick={() => setShowCancelModal(true)}
                  >
                    <i className="fas fa-times me-2"></i>
                    Cancel
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header>
                      <h5 className="mb-0">
                        <i className="fas fa-car me-2"></i>
                        Vehicle Information
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      <dl className="row">
                        <dt className="col-sm-4">Plate Number</dt>
                        <dd className="col-sm-8">: {booking.vehicle?.plate_number}</dd>
                        
                        <dt className="col-sm-4">Vehicle</dt>
                        <dd className="col-sm-8">
                          : {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.year})
                        </dd>
                        
                        <dt className="col-sm-4">Type</dt>
                        <dd className="col-sm-8">
                          : <Badge bg="info">{booking.vehicle?.type?.toUpperCase()}</Badge>
                        </dd>
                        
                        <dt className="col-sm-4">Fuel Type</dt>
                        <dd className="col-sm-8">: {booking.vehicle?.fuel_type}</dd>
                        
                        {booking.driver && (
                          <>
                            <dt className="col-sm-4">Driver</dt>
                            <dd className="col-sm-8">
                              : {booking.driver.name}
                              <br />
                              <small className="text-muted">
                                &nbsp;&nbsp;License: {booking.driver.license_number}
                              </small>
                            </dd>
                          </>
                        )}
                      </dl>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header>
                      <h5 className="mb-0">
                        <i className="fas fa-clock me-2"></i>
                        Booking Schedule
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      <dl className="row">
                        <dt className="col-sm-4">Start</dt>
                        <dd className="col-sm-8">: {formatDate(booking.start_date)}</dd>
                        
                        <dt className="col-sm-4">End</dt>
                        <dd className="col-sm-8">: {formatDate(booking.end_date)}</dd>
                        
                        <dt className="col-sm-4">Duration</dt>
                        <dd className="col-sm-8">: {formatDuration(booking.start_date, booking.end_date)}</dd>
                        
                        <dt className="col-sm-4">Created</dt>
                        <dd className="col-sm-8">: {formatDate(booking.created_at)}</dd>
                        
                        {booking.updated_at !== booking.created_at && (
                          <>
                            <dt className="col-sm-4">Updated</dt>
                            <dd className="col-sm-8">: {formatDate(booking.updated_at)}</dd>
                          </>
                        )}
                      </dl>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header>
                      <h5 className="mb-0">
                        <i className="fas fa-info-circle me-2"></i>
                        Booking Details
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      <dl className="row">
                        <dt className="col-sm-4">Requested by</dt>
                        <dd className="col-sm-8">
                          : {booking.user?.name}
                          <br />
                          <small className="text-muted">&nbsp;&nbsp;{booking.user?.email}</small>
                          {booking.user?.department && (
                            <>
                              <br />
                              <small className="text-muted">&nbsp;&nbsp;{booking.user.department}</small>
                            </>
                          )}
                        </dd>
                        
                        {booking.createdBy && (
                          <>
                            <dt className="col-sm-4">Created by</dt>
                            <dd className="col-sm-8">
                              : {booking.createdBy.name}
                              <br />
                              <small className="text-muted">&nbsp;&nbsp;{booking.createdBy.email}</small>
                              {booking.createdBy.department && (
                                <>
                                  <br />
                                  <small className="text-muted">&nbsp;&nbsp;{booking.createdBy.department}</small>
                                </>
                              )}
                            </dd>
                          </>
                        )}
                        
                        {booking.notes && (
                          <>
                            <dt className="col-sm-4">Notes</dt>
                            <dd className="col-sm-8">: {booking.notes}</dd>
                          </>
                        )}
                        
                        {booking.rejection_reason && (
                          <>
                            <dt className="col-sm-4">Reason</dt>
                            <dd className="col-sm-8">
                              : <span className="text-danger">
                                {booking.rejection_reason}
                              </span>
                            </dd>
                          </>
                        )}

                        {booking && booking.status === 'cancelled' && (
                          <>
                            <dt className="col-sm-4">Cancellation Reason</dt>
                            <dd className="col-sm-8">: {booking.cancellation_reason || 'No reason provided'}</dd>
                          </>
                        )}
                        
                        {(booking.status === 'rejected' || booking.status === 'cancelled') && booking.approvals && (
                          (() => {
                            const rejectedApproval = booking.approvals.find(a => a.status === 'rejected');
                            return rejectedApproval && rejectedApproval.approver ? (
                              <>
                                <dt className="col-sm-4">Rejected by</dt>
                                <dd className="col-sm-8">
                                  : <strong>{rejectedApproval.approver.name}</strong>
                                  <br />
                                  <small className="text-muted">
                                    &nbsp;&nbsp;Level {rejectedApproval.level} Approver
                                    {rejectedApproval.approved_at && (
                                      <> • {formatDate(rejectedApproval.approved_at)}</>
                                    )}
                                  </small>
                                </dd>
                              </>
                            ) : null;
                          })()
                        )}
                      </dl>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header>
                      <h5 className="mb-0">
                        <i className="fas fa-tasks me-2"></i>
                        Approval Status
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      {renderApprovalStatus()}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Activity Log Section - Admin Only */}
              {user?.role === 'admin' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Card>
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                          <i className="fas fa-history me-2"></i>
                          Activity Log
                        </h5>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleExportActivities}
                          disabled={exporting || activities.length === 0}
                        >
                          {exporting ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-download me-2"></i>
                              Export
                            </>
                          )}
                        </Button>
                      </Card.Header>
                      <Card.Body>
                        {loadingActivities ? (
                          <div className="text-center py-3">
                            <Spinner animation="border" size="sm" />
                            <span className="ms-2">Loading activities...</span>
                          </div>
                        ) : activities.length === 0 ? (
                          <div className="text-center py-3 text-muted">
                            <i className="fas fa-info-circle me-2"></i>
                            No activities recorded for this booking.
                          </div>
                        ) : (
                          <div className="activity-list">
                            {activities.map((activity, index) => (
                              <div key={activity.id} className="activity-item d-flex align-items-start mb-3">
                                <div className="activity-icon me-3">
                                  {activity.action === 'CREATE' && (
                                    <i className="fas fa-plus-circle text-success"></i>
                                  )}
                                  {activity.action === 'UPDATE' && (
                                    <i className="fas fa-edit text-primary"></i>
                                  )}
                                  {activity.action === 'CANCEL' && (
                                    <i className="fas fa-times-circle text-danger"></i>
                                  )}
                                  {activity.action === 'APPROVE' && (
                                    <i className="fas fa-check-circle text-success"></i>
                                  )}
                                  {activity.action === 'REJECT' && (
                                    <i className="fas fa-times-circle text-danger"></i>
                                  )}
                                  {!['CREATE', 'UPDATE', 'CANCEL', 'APPROVE', 'REJECT'].includes(activity.action) && (
                                    <i className="fas fa-circle text-secondary"></i>
                                  )}
                                </div>
                                <div className="activity-content flex-grow-1">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <div className="activity-description">
                                        <strong>{activity.description}</strong>
                                      </div>
                                      {activity.user && (
                                        <div className="text-muted small mt-1">
                                          by <strong>{activity.user.name}</strong> ({activity.user.role.replace('_', ' ').toUpperCase()})
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-muted small">
                                      {formatDateTime(activity.timestamp)}
                                    </div>
                                  </div>
                                  {activity.ip_address && (
                                    <div className="text-muted small mt-1">
                                      <i className="fas fa-globe me-1"></i>
                                      IP: {activity.ip_address}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Approval Modal */}
      <Modal show={showApprovalModal} onHide={closeApprovalModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {approvalAction === 'approve' ? (
              <><i className="fas fa-check text-success me-2"></i>Approve Booking</>
            ) : (
              <><i className="fas fa-times text-danger me-2"></i>Reject Booking</>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentApproval && (
            <div>
              <h6>Booking Details:</h6>
              <Row>
                <Col md={6}>
                  <dl className="row">
                    <dt className="col-sm-4">Approval ID</dt>
                    <dd className="col-sm-8">: #{currentApproval.id}</dd>
                    
                    <dt className="col-sm-4">Booking ID</dt>
                    <dd className="col-sm-8">: #{booking.id}</dd>
                    
                    <dt className="col-sm-4">Requester</dt>
                    <dd className="col-sm-8">: {booking.user?.name}</dd>
                    
                    <dt className="col-sm-4">Department</dt>
                    <dd className="col-sm-8">: {booking.user?.department}</dd>
                    
                    <dt className="col-sm-4">Vehicle</dt>
                    <dd className="col-sm-8">
                      : {booking.vehicle?.plate_number} - {booking.vehicle?.make} {booking.vehicle?.model}
                    </dd>
                  </dl>
                </Col>
                <Col md={6}>
                  <dl className="row">
                    <dt className="col-sm-4">Start Date</dt>
                    <dd className="col-sm-8">: {formatDate(booking.start_date)}</dd>
                    
                    <dt className="col-sm-4">End Date</dt>
                    <dd className="col-sm-8">: {formatDate(booking.end_date)}</dd>
                    
                    <dt className="col-sm-4">Duration</dt>
                    <dd className="col-sm-8">
                      : {formatDuration(booking.start_date, booking.end_date)}
                    </dd>
                    
                    <dt className="col-sm-4">Booking Status</dt>
                    <dd className="col-sm-8">: {getStatusBadge(booking.status)}</dd>
                    
                    <dt className="col-sm-4">Approval Status</dt>
                    <dd className="col-sm-8">: {getStatusBadge(currentApproval.status)}</dd>
                    
                    {booking.notes && (
                      <>
                        <dt className="col-sm-4">Notes</dt>
                        <dd className="col-sm-8">: {booking.notes}</dd>
                      </>
                    )}
                  </dl>
                </Col>
              </Row>
              
              <Form.Group className="mt-3">
                <Form.Label>
                  Comments {approvalAction === 'reject' && <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder={
                    approvalAction === 'approve' 
                      ? "Optional: Add any approval comments or conditions..."
                      : "Required: Please provide a reason for rejection..."
                  }
                  required={approvalAction === 'reject'}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeApprovalModal}>
            Cancel
          </Button>
          <Button 
            variant={approvalAction === 'approve' ? 'success' : 'danger'}
            onClick={handleApprovalAction}
            disabled={approvalProcessing || (approvalAction === 'reject' && !approvalComments.trim())}
          >
            {approvalProcessing ? (
              <>
                <Spinner size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className={`fas fa-${approvalAction === 'approve' ? 'check' : 'times'} me-2`}></i>
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Booking
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        show={showCancelModal}
        onHide={handleCancelClose}
        booking={booking}
        onConfirm={handleCancelBooking}
        loading={cancelling}
      />
    </Container>
  );
};

export default BookingDetail;
