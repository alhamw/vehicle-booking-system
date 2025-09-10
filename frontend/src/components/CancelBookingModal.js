import React, { useState } from 'react';
import { formatDate } from '../utils/dateUtils';
import { Modal, Alert, Row, Col, Form, Button, Badge } from 'react-bootstrap';

const CancelBookingModal = ({ 
  show, 
  onHide, 
  booking, 
  onConfirm, 
  loading = false 
}) => {
  const [cancelReason, setCancelReason] = useState('');

  const handleClose = () => {
    setCancelReason('');
    onHide();
  };

  const handleConfirm = () => {
    if (!cancelReason.trim()) {
      return; // Don't proceed if no reason provided
    }
    onConfirm(cancelReason);
    setCancelReason('');
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

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-times text-danger me-2"></i>
          Cancel Booking
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {booking && (
          <div>
            <Alert variant="warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </Alert>
            
            <h6>Booking Details:</h6>
            <Row>
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Booking ID:</dt>
                  <dd className="col-sm-8">#{booking.id}</dd>
                  
                  <dt className="col-sm-4">Vehicle:</dt>
                  <dd className="col-sm-8">
                    {booking.vehicle?.plate_number} - {booking.vehicle?.make} {booking.vehicle?.model}
                  </dd>
                  
                  <dt className="col-sm-4">Start Date:</dt>
                  <dd className="col-sm-8">{formatDate(booking.start_date)}</dd>
                  
                  <dt className="col-sm-4">End Date:</dt>
                  <dd className="col-sm-8">{formatDate(booking.end_date)}</dd>
                </dl>
              </Col>
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Status:</dt>
                  <dd className="col-sm-8">{getStatusBadge(booking.status)}</dd>
                  
                  <dt className="col-sm-4">Requester:</dt>
                  <dd className="col-sm-8">{booking.user?.name}</dd>
                  
                  <dt className="col-sm-4">Department:</dt>
                  <dd className="col-sm-8">{booking.user?.department}</dd>
                </dl>
              </Col>
            </Row>
            
            <hr />
            
                          <Form.Group>
                <Form.Label>
                  <strong>Reason for Cancellation <span className="text-danger">*</span></strong>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation (required)..."
                  required
                />
              </Form.Group>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          <i className="fas fa-times me-2"></i>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={loading || !cancelReason.trim()}>
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin me-2"></i>
              Cancelling...
            </>
          ) : (
            <>
              <i className="fas fa-times me-2"></i>
              Confirm Cancellation
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CancelBookingModal;
