import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';

const ApprovalManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Modal state for approval/rejection
  const [showModal, setShowModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [modalAction, setModalAction] = useState(''); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filter state
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [showAll, pagination.page, pagination.limit]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({
      ...prev,
      page: 1, // Reset to first page when changing limit
      limit: newLimit
    }));
  };

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        show_all: showAll.toString()
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/approvals?${new URLSearchParams(params)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      setApprovals(data.approvals);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        pages: data.pagination.pages
      });
    } catch (error) {
      console.error('Error fetching approvals:', error);
      setError('Failed to load approvals');
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

      setSuccess(`Booking ${modalAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
      closeModal();
      fetchApprovals(); // Refresh the list

    } catch (error) {
      console.error('Error processing approval:', error);
      setError(`Failed to ${modalAction} booking`);
    } finally {
      setProcessing(false);
    }
  };

  const canApprove = (approval) => {
    // Can only approve if booking status is pending
    if (approval.booking?.status !== 'pending') return false;
    
    return approval.status === 'pending';
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-2">Loading pending approvals...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h3 className="mb-0">
                <i className="fas fa-check-circle me-2"></i>
                Approval Management
                <small className="text-muted ms-2">
                  ({user.role === 'approver_l1' ? 'Level 1' : 'Level 2'} Approver)
                </small>
              </h3>
            </Card.Header>
            <Card.Body>
              {/* Filter for Level 2 Approvers */}
              {user.role === 'approver_l2' && (
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Check
                        type="checkbox"
                        label="Show all bookings (including those not approved by Level 1)"
                        checked={showAll}
                        onChange={(e) => setShowAll(e.target.checked)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  <i className="fas fa-exclamation-circle me-2"></i>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                  <i className="fas fa-check-circle me-2"></i>
                  {success}
                </Alert>
              )}

              {approvals.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-clipboard-check fa-3x text-muted mb-3"></i>
                  <h5>No approvals found</h5>
                  <p className="text-muted">
                    {user.role === 'approver_l2' && !showAll 
                      ? 'No bookings have been approved by Level 1 yet.'
                      : 'All approvals at your level have been processed.'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Approval ID</th>
                        <th>Booking ID</th>
                        <th>Requester</th>
                        <th>Vehicle</th>
                        <th>Schedule</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map(approval => (
                        <tr key={approval.id}>
                          <td>
                            <strong>#{approval.id}</strong>
                          </td>
                          <td>
                            <strong>#{approval.booking?.id}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{approval.booking?.user?.name}</strong>
                              <br />
                              <small className="text-muted">
                                {approval.booking?.user?.department}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{approval.booking?.vehicle?.plate_number}</strong>
                              <br />
                              <small className="text-muted">
                                {approval.booking?.vehicle?.make} {approval.booking?.vehicle?.model}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <small>
                                <strong>Start:</strong> {formatDate(approval.booking?.start_date)}
                                <br />
                                <strong>End:</strong> {formatDate(approval.booking?.end_date)}
                              </small>
                            </div>
                          </td>
                          <td>
                            <Badge bg="info">
                              {formatDuration(approval.booking?.start_date, approval.booking?.end_date)}
                            </Badge>
                          </td>
                          <td>{getStatusBadge(approval.status)}</td>
                          <td>
                            <div className="d-flex gap-1">
                              {canApprove(approval) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => openApprovalModal(approval, 'approve')}
                                    title="Approve"
                                  >
                                    <i className="fas fa-check"></i>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => openApprovalModal(approval, 'reject')}
                                    title="Reject"
                                  >
                                    <i className="fas fa-times"></i>
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => navigate(`/bookings/${approval.booking?.id}`)}
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="d-flex align-items-center">
                    <span className="me-3">Show:</span>
                    <Form.Select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                      style={{ width: 'auto' }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </Form.Select>
                    <span className="ms-3">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} approvals
                    </span>
                  </div>
                  
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="me-2"
                    >
                      <i className="fas fa-chevron-left"></i> Previous
                    </Button>
                    
                    <span className="mx-2">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Next <i className="fas fa-chevron-right"></i>
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

            {/* Approval/Rejection Modal */}
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
                <Spinner size="sm" className="me-2" />
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
    </Container>
  );
};

export default ApprovalManagement;
