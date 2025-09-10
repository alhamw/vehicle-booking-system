import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vehicleAPI, bookingAPI, driverAPI, usersAPI } from '../services/api';

const BookingForm = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    approver_l1_id: '',
    approver_l2_id: '',
    employee_id: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchVehicles();
    if (isAdmin) {
      fetchDrivers();
      fetchApprovers();
      fetchEmployees();
    }
  }, [isAdmin]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehicleAPI.getVehicles({ status: 'available' });
      setVehicles(response.data.vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to load available vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await driverAPI.getDrivers({ status: 'available' });
      setDrivers(response.data.drivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setError('Failed to load available drivers');
    }
  };

  const fetchApprovers = async () => {
    try {
      // Fetch L1 approvers
      const l1Response = await usersAPI.getUsers({ role: 'approver_l1' });
      const l2Response = await usersAPI.getUsers({ role: 'approver_l2' });
      
      const allApprovers = [
        ...l1Response.data.users,
        ...l2Response.data.users
      ];
      
      setApprovers(allApprovers);
    } catch (error) {
      console.error('Error fetching approvers:', error);
      setError('Failed to load approvers');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await usersAPI.getUsers({ role: 'employee' });
      setEmployees(response.data.users);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vehicle_id) {
      newErrors.vehicle_id = 'Please select a vehicle';
    }

    // Admin-specific validations
    if (isAdmin) {
      if (!formData.employee_id) {
        newErrors.employee_id = 'Please select an employee';
      }
      if (!formData.driver_id) {
        newErrors.driver_id = 'Please select a driver';
      }
      if (!formData.approver_l1_id) {
        newErrors.approver_l1_id = 'Please select first approver';
      }
      if (!formData.approver_l2_id) {
        newErrors.approver_l2_id = 'Please select second approver';
      }
      if (formData.approver_l1_id === formData.approver_l2_id && formData.approver_l1_id) {
        newErrors.approver_l2_id = 'Second approver must be different from first approver';
      }
    } else {
      // Non-admin users cannot create bookings
      newErrors.general = 'Only administrators can create bookings. Please contact your admin to request a booking.';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const now = new Date();

      if (startDate < now) {
        newErrors.start_date = 'Start date cannot be in the past';
      }

      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const bookingData = {
        ...formData,
        vehicle_id: parseInt(formData.vehicle_id),
        ...(isAdmin && {
          employee_id: parseInt(formData.employee_id),
          driver_id: parseInt(formData.driver_id),
          approver_l1_id: parseInt(formData.approver_l1_id),
          approver_l2_id: parseInt(formData.approver_l2_id)
        })
      };

      await bookingAPI.createBooking(bookingData);
      
      setSuccess('Booking created successfully! Your request is pending approval.');
      
      // Reset form
      setFormData({
        vehicle_id: '',
        driver_id: '',
        approver_l1_id: '',
        approver_l2_id: '',
        employee_id: '',
        start_date: '',
        end_date: '',
        notes: ''
      });

      // Redirect to bookings list after 2 seconds
      setTimeout(() => {
        navigate('/bookings');
      }, 2000);

    } catch (error) {
      console.error('Error creating booking:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
        if (error.response.data.details) {
          setError(error.response.data.details.map(d => d.msg).join(', '));
        }
      } else {
        setError('Failed to create booking. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Allow bookings at least 30 minutes in the future
    return now.toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-2">Loading vehicles...</p>
        </div>
      </Container>
    );
  }

  // Only admins can create bookings
  if (!isAdmin) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>Access Restricted</strong>
          <br />
          Only administrators can create bookings. Please contact your admin to request a booking.
        </Alert>
        <Button variant="secondary" onClick={() => navigate('/bookings')}>
          <i className="fas fa-arrow-left me-2"></i>
          Back to Bookings
        </Button>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">
                <i className="fas fa-plus-circle me-2"></i>
                Create New Booking
              </h3>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Vehicle <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="vehicle_id"
                        value={formData.vehicle_id}
                        onChange={handleInputChange}
                        isInvalid={!!errors.vehicle_id}
                        required
                      >
                        <option value="">Select a vehicle...</option>
                        {vehicles.map(vehicle => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate_number} - {vehicle.make} {vehicle.model} ({vehicle.type})
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.vehicle_id}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Admin-specific fields */}
                {isAdmin && (
                  <>
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Employee <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            name="employee_id"
                            value={formData.employee_id}
                            onChange={handleInputChange}
                            isInvalid={!!errors.employee_id}
                            required
                          >
                            <option value="">Select an employee...</option>
                            {employees.map(employee => (
                              <option key={employee.id} value={employee.id}>
                                {employee.name} ({employee.department || 'No Department'})
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {errors.employee_id}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Driver <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            name="driver_id"
                            value={formData.driver_id}
                            onChange={handleInputChange}
                            isInvalid={!!errors.driver_id}
                            required
                          >
                            <option value="">Select a driver...</option>
                            {drivers.map(driver => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name} - {driver.license_number}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {errors.driver_id}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>First Approver <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            name="approver_l1_id"
                            value={formData.approver_l1_id}
                            onChange={handleInputChange}
                            isInvalid={!!errors.approver_l1_id}
                            required
                          >
                            <option value="">Select first approver...</option>
                            {approvers.filter(approver => approver.role === 'approver_l1').map(approver => (
                              <option key={approver.id} value={approver.id}>
                                {approver.name} ({approver.department || 'No Department'})
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {errors.approver_l1_id}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Second Approver <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            name="approver_l2_id"
                            value={formData.approver_l2_id}
                            onChange={handleInputChange}
                            isInvalid={!!errors.approver_l2_id}
                            required
                          >
                            <option value="">Select second approver...</option>
                            {approvers.filter(approver => approver.role === 'approver_l2').map(approver => (
                              <option key={approver.id} value={approver.id}>
                                {approver.name} ({approver.department || 'No Department'})
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {errors.approver_l2_id}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date & Time <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="datetime-local"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        min={getMinDateTime()}
                        isInvalid={!!errors.start_date}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.start_date}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>End Date & Time <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="datetime-local"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        min={formData.start_date || getMinDateTime()}
                        isInvalid={!!errors.end_date}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.end_date}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional information or special requirements"
                    maxLength={1000}
                  />
                  <Form.Text className="text-muted">
                    {formData.notes.length}/1000 characters
                  </Form.Text>
                </Form.Group>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/bookings')}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Creating Booking...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Create Booking
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BookingForm;
