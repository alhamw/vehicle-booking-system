import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { driverAPI } from '../services/api';
import { formatDate } from '../utils/dateUtils';

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    license_expiry: '',
    phone: '',
    email: '',
    status: 'available',
    experience_years: '',
    vehicle_types: []
  });

  const [filters, setFilters] = useState({
    status: ''
  });

  const [errors, setErrors] = useState({});

  const vehicleTypeOptions = [
    'truck', 'van', 'car', 'bus', 'excavator', 'bulldozer', 'crane', 'other'
  ];

  useEffect(() => {
    fetchDrivers();
  }, [filters]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (filters.status) params.status = filters.status;

      const response = await driverAPI.getDrivers(params);
      setDrivers(response.data.drivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setError('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      license_number: '',
      license_expiry: '',
      phone: '',
      email: '',
      status: 'available',
      experience_years: '',
      vehicle_types: []
    });
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
    setEditingDriver(null);
    setShowModal(true);
  };

  const openEditModal = (driver) => {
    const licenseExpiry = driver.license_expiry 
      ? new Date(driver.license_expiry).toISOString().split('T')[0] 
      : '';
      
    setFormData({
      name: driver.name || '',
      license_number: driver.license_number || '',
      license_expiry: licenseExpiry,
      phone: driver.phone || '',
      email: driver.email || '',
      status: driver.status || 'available',
      experience_years: driver.experience_years?.toString() || '',
      vehicle_types: driver.vehicle_types || []
    });
    setModalMode('edit');
    setEditingDriver(driver);
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDriver(null);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleVehicleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      vehicle_types: prev.vehicle_types.includes(type)
        ? prev.vehicle_types.filter(t => t !== type)
        : [...prev.vehicle_types, type]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.license_number.trim()) {
      newErrors.license_number = 'License number is required';
    }

    if (formData.license_expiry) {
      const expiryDate = new Date(formData.license_expiry);
      if (expiryDate <= new Date()) {
        newErrors.license_expiry = 'License expiry date must be in the future';
      }
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (formData.experience_years && (formData.experience_years < 0 || formData.experience_years > 50)) {
      newErrors.experience_years = 'Experience years must be between 0 and 50';
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
      
      const driverData = {
        ...formData,
        experience_years: parseInt(formData.experience_years) || 0,
        license_expiry: formData.license_expiry || null
      };

      if (modalMode === 'add') {
        await driverAPI.createDriver(driverData);
        setSuccess('Driver added successfully!');
      } else {
        await driverAPI.updateDriver(editingDriver.id, driverData);
        setSuccess('Driver updated successfully!');
      }
      
      closeModal();
      fetchDrivers();

    } catch (error) {
      console.error('Error saving driver:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to save driver');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (driver) => {
    if (!window.confirm(`Are you sure you want to delete driver ${driver.name}?`)) {
      return;
    }

    try {
      await driverAPI.deleteDriver(driver.id);
      setSuccess('Driver deleted successfully!');
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      setError('Failed to delete driver');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      available: 'success',
      assigned: 'warning',
      on_leave: 'info',
      inactive: 'secondary'
    };
    
    return (
      <Badge bg={variants[status] || 'secondary'}>
        {status?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const isLicenseExpiringSoon = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow;
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-2">Loading drivers...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h3 className="mb-0">
                <i className="fas fa-user-tie me-2"></i>
                Driver Management
              </h3>
              <Button variant="primary" onClick={openAddModal}>
                <i className="fas fa-plus me-2"></i>
                Add Driver
              </Button>
            </Card.Header>
            <Card.Body>
              {/* Filters */}
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Statuses</option>
                      <option value="available">Available</option>
                      <option value="assigned">Assigned</option>
                      <option value="on_leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <div>
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setFilters({ status: '' })}
                      >
                        <i className="fas fa-times me-2"></i>
                        Clear Filters
                      </Button>
                    </div>
                  </Form.Group>
                </Col>
              </Row>

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

              {drivers.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-user-tie fa-3x text-muted mb-3"></i>
                  <h5>No drivers found</h5>
                  <p className="text-muted">
                    Start by adding your first driver to the system.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>License Number</th>
                        <th>License Expiry</th>
                        <th>Contact</th>
                        <th>Experience</th>
                        <th>Vehicle Types</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map(driver => (
                        <tr key={driver.id}>
                          <td>
                            <strong>{driver.name}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{driver.license_number}</strong>
                              {isLicenseExpiringSoon(driver.license_expiry) && (
                                <div>
                                  <Badge bg="warning" className="mt-1">
                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                    Expiring Soon
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={isLicenseExpiringSoon(driver.license_expiry) ? 'text-warning fw-bold' : ''}>
                              {formatDate(driver.license_expiry)}
                            </span>
                          </td>
                          <td>
                            <div>
                              {driver.phone && (
                                <div>
                                  <i className="fas fa-phone me-1"></i>
                                  {driver.phone}
                                </div>
                              )}
                              {driver.email && (
                                <div>
                                  <i className="fas fa-envelope me-1"></i>
                                  <small>{driver.email}</small>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge bg="info">
                              {driver.experience_years} years
                            </Badge>
                          </td>
                          <td>
                            <div>
                              {driver.vehicle_types?.map(type => (
                                <Badge key={type} bg="secondary" className="me-1 mb-1">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td>{getStatusBadge(driver.status)}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openEditModal(driver)}
                                title="Edit Driver"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(driver)}
                                title="Delete Driver"
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Driver Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas fa-${modalMode === 'add' ? 'plus' : 'edit'} me-2`}></i>
            {modalMode === 'add' ? 'Add New Driver' : 'Edit Driver'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    isInvalid={!!errors.name}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>License Number <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleInputChange}
                    isInvalid={!!errors.license_number}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.license_number}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>License Expiry <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="license_expiry"
                    value={formData.license_expiry}
                    onChange={handleInputChange}
                    isInvalid={!!errors.license_expiry}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.license_expiry}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Experience (Years)</Form.Label>
                  <Form.Control
                    type="number"
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleInputChange}
                    isInvalid={!!errors.experience_years}
                    min="0"
                    max="50"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.experience_years}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1234567890"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    isInvalid={!!errors.email}
                    placeholder="driver@company.com"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Authorized Vehicle Types</Form.Label>
              <div className="border rounded p-3">
                <Row>
                  {vehicleTypeOptions.map(type => (
                    <Col md={3} key={type}>
                      <Form.Check
                        type="checkbox"
                        label={type.charAt(0).toUpperCase() + type.slice(1)}
                        checked={formData.vehicle_types.includes(type)}
                        onChange={() => handleVehicleTypeChange(type)}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
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
                  {modalMode === 'add' ? 'Adding...' : 'Updating...'}
                </>
              ) : (
                <>
                  <i className={`fas fa-${modalMode === 'add' ? 'plus' : 'save'} me-2`}></i>
                  {modalMode === 'add' ? 'Add Driver' : 'Update Driver'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DriverManagement;
