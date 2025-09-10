import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { vehicleAPI } from '../services/api';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    plate_number: '',
    type: '',
    make: '',
    model: '',
    year: '',
    capacity: '',
    fuel_type: '',
    status: 'available',
    location: '',
    mileage: 0
  });

  const [filters, setFilters] = useState({
    type: '',
    status: '',
    fuel_type: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchVehicles();
  }, [filters]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.fuel_type) params.fuel_type = filters.fuel_type;

      const response = await vehicleAPI.getVehicles(params);
      setVehicles(response.data.vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to load vehicles');
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
      plate_number: '',
      type: '',
      make: '',
      model: '',
      year: '',
      capacity: '',
      fuel_type: '',
      status: 'available',
      location: '',
      mileage: 0
    });
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
    setEditingVehicle(null);
    setShowModal(true);
  };

  const openEditModal = (vehicle) => {
    setFormData({
      plate_number: vehicle.plate_number || '',
      type: vehicle.type || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      capacity: vehicle.capacity || '',
      fuel_type: vehicle.fuel_type || '',
      status: vehicle.status || 'available',
      location: vehicle.location || '',
      mileage: vehicle.mileage || 0
    });
    setModalMode('edit');
    setEditingVehicle(vehicle);
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
    resetForm();
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

    if (!formData.plate_number.trim()) {
      newErrors.plate_number = 'Plate number is required';
    }

    if (!formData.type) {
      newErrors.type = 'Vehicle type is required';
    }

    if (!formData.make.trim()) {
      newErrors.make = 'Make is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'Valid year is required';
    }

    if (!formData.fuel_type) {
      newErrors.fuel_type = 'Fuel type is required';
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
      
      const vehicleData = {
        ...formData,
        year: parseInt(formData.year),
        mileage: parseInt(formData.mileage) || 0
      };

      if (modalMode === 'add') {
        await vehicleAPI.createVehicle(vehicleData);
        setSuccess('Vehicle added successfully!');
      } else {
        await vehicleAPI.updateVehicle(editingVehicle.id, vehicleData);
        setSuccess('Vehicle updated successfully!');
      }
      
      closeModal();
      fetchVehicles(); // Refresh the list

    } catch (error) {
      console.error('Error saving vehicle:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to save vehicle');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${vehicle.plate_number}?`)) {
      return;
    }

    try {
      await vehicleAPI.deleteVehicle(vehicle.id);
      setSuccess('Vehicle deleted successfully!');
      fetchVehicles(); // Refresh the list
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError('Failed to delete vehicle');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      available: 'success',
      in_use: 'warning',
      maintenance: 'danger',
      out_of_service: 'secondary'
    };
    
    return (
      <Badge bg={variants[status] || 'secondary'}>
        {status?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    const variants = {
      truck: 'primary',
      van: 'info',
      car: 'success',
      bus: 'warning',
      excavator: 'danger',
      bulldozer: 'dark',
      crane: 'secondary'
    };
    
    return (
      <Badge bg={variants[type] || 'secondary'}>
        {type?.toUpperCase()}
      </Badge>
    );
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

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h3 className="mb-0">
                <i className="fas fa-truck me-2"></i>
                Vehicle Management
              </h3>
              <Button variant="primary" onClick={openAddModal}>
                <i className="fas fa-plus me-2"></i>
                Add Vehicle
              </Button>
            </Card.Header>
            <Card.Body>
              {/* Filters */}
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Type</Form.Label>
                    <Form.Select
                      name="type"
                      value={filters.type}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Types</option>
                      <option value="truck">Truck</option>
                      <option value="van">Van</option>
                      <option value="car">Car</option>
                      <option value="bus">Bus</option>
                      <option value="excavator">Excavator</option>
                      <option value="bulldozer">Bulldozer</option>
                      <option value="crane">Crane</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Statuses</option>
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out_of_service">Out of Service</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Fuel Type</Form.Label>
                    <Form.Select
                      name="fuel_type"
                      value={filters.fuel_type}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Fuel Types</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <div>
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setFilters({ type: '', status: '', fuel_type: '' })}
                      >
                        <i className="fas fa-times me-2"></i>
                        Clear
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

              {vehicles.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-truck fa-3x text-muted mb-3"></i>
                  <h5>No vehicles found</h5>
                  <p className="text-muted">
                    {Object.values(filters).some(f => f) 
                      ? 'No vehicles match your current filters.'
                      : 'Start by adding your first vehicle to the fleet.'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Plate Number</th>
                        <th>Vehicle</th>
                        <th>Type</th>
                        <th>Capacity</th>
                        <th>Fuel</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Mileage</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map(vehicle => (
                        <tr key={vehicle.id}>
                          <td>
                            <strong>{vehicle.plate_number}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{vehicle.make} {vehicle.model}</strong>
                              <br />
                              <small className="text-muted">
                                {vehicle.year}
                              </small>
                            </div>
                          </td>
                          <td>{getTypeBadge(vehicle.type)}</td>
                          <td>{vehicle.capacity || 'Not specified'}</td>
                          <td>
                            <Badge bg="info">
                              {vehicle.fuel_type?.toUpperCase()}
                            </Badge>
                          </td>
                          <td>{getStatusBadge(vehicle.status)}</td>
                          <td>{vehicle.location || 'Not specified'}</td>
                          <td>{vehicle.mileage?.toLocaleString()} km</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openEditModal(vehicle)}
                                title="Edit Vehicle"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(vehicle)}
                                title="Delete Vehicle"
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

      {/* Add/Edit Vehicle Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas fa-${modalMode === 'add' ? 'plus' : 'edit'} me-2`}></i>
            {modalMode === 'add' ? 'Add New Vehicle' : 'Edit Vehicle'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Plate Number <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="plate_number"
                    value={formData.plate_number}
                    onChange={handleInputChange}
                    isInvalid={!!errors.plate_number}
                    placeholder="e.g., ABC-123"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.plate_number}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    isInvalid={!!errors.type}
                    required
                  >
                    <option value="">Select type...</option>
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="car">Car</option>
                    <option value="bus">Bus</option>
                    <option value="excavator">Excavator</option>
                    <option value="bulldozer">Bulldozer</option>
                    <option value="crane">Crane</option>
                    <option value="other">Other</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.type}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Make <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleInputChange}
                    isInvalid={!!errors.make}
                    placeholder="e.g., Toyota"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.make}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Model <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    isInvalid={!!errors.model}
                    placeholder="e.g., Camry"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.model}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Year <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    isInvalid={!!errors.year}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.year}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fuel Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="fuel_type"
                    value={formData.fuel_type}
                    onChange={handleInputChange}
                    isInvalid={!!errors.fuel_type}
                    required
                  >
                    <option value="">Select fuel type...</option>
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="hybrid">Hybrid</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.fuel_type}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="in_use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Capacity</Form.Label>
                  <Form.Control
                    type="text"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    placeholder="e.g., 5 passengers, 2 tons"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Mileage (km)</Form.Label>
                  <Form.Control
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    min="0"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Main Depot, Site A"
              />
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
                  {modalMode === 'add' ? 'Add Vehicle' : 'Update Vehicle'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default VehicleManagement;

