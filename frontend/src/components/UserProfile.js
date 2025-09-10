import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { formatDate } from '../utils/dateUtils';

const UserProfile = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
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

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
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

  const validateProfileForm = () => {
    const newErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Valid email is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await updateProfile(profileData);
      
      if (result.success) {
        setSuccess('Profile updated successfully!');
      } else {
        setError(result.error || 'Failed to update profile');
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);

    } catch (error) {
      console.error('Error changing password:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'danger',
      approver_l1: 'warning',
      approver_l2: 'info',
      employee: 'success'
    };
    
    const labels = {
      admin: 'Administrator',
      approver_l1: 'Approver Level 1',
      approver_l2: 'Approver Level 2',
      employee: 'Employee'
    };
    
    return (
      <Badge bg={variants[role] || 'secondary'} className="fs-6">
        {labels[role] || role}
      </Badge>
    );
  };

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={8}>
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

          {/* Profile Information Card */}
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">
                <i className="fas fa-user me-2"></i>
                Profile Information
              </h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={8}>
                  <Form onSubmit={handleProfileSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileInputChange}
                        isInvalid={!!errors.name}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileInputChange}
                        isInvalid={!!errors.email}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Department</Form.Label>
                      <Form.Control
                        type="text"
                        name="department"
                        value={profileData.department}
                        onChange={handleProfileInputChange}
                        placeholder="Enter your department"
                      />
                    </Form.Group>

                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Update Profile
                        </>
                      )}
                    </Button>
                  </Form>
                </Col>
                <Col md={4}>
                  <div className="bg-light p-3 rounded">
                    <h6>Account Details</h6>
                    <dl className="mb-0">
                      <dt>User ID:</dt>
                      <dd>#{user?.id}</dd>
                      
                      <dt>Role:</dt>
                      <dd>{getRoleBadge(user?.role)}</dd>
                      
                      <dt>Status:</dt>
                      <dd>
                        <Badge bg="success">Active</Badge>
                      </dd>
                      
                      <dt>Member Since:</dt>
                      <dd>{user?.created_at ? formatDate(user.created_at) : 'N/A'}</dd>
                    </dl>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Security Settings Card */}
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">
                <i className="fas fa-lock me-2"></i>
                Security Settings
              </h4>
              {!showPasswordForm && (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => setShowPasswordForm(true)}
                >
                  <i className="fas fa-key me-2"></i>
                  Change Password
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {!showPasswordForm ? (
                <div className="text-center py-4">
                  <i className="fas fa-shield-alt fa-3x text-muted mb-3"></i>
                  <h6>Password Security</h6>
                  <p className="text-muted mb-3">
                    Your password was last changed on {user?.updated_at ? formatDate(user.updated_at) : 'N/A'}
                  </p>
                  <p className="text-muted">
                    <small>
                      <i className="fas fa-info-circle me-1"></i>
                      For security reasons, we recommend changing your password regularly.
                    </small>
                  </p>
                </div>
              ) : (
                <Form onSubmit={handlePasswordSubmit}>
                  <Row>
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label>Current Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordInputChange}
                          isInvalid={!!errors.currentPassword}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.currentPassword}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordInputChange}
                          isInvalid={!!errors.newPassword}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.newPassword}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          Password must be at least 6 characters long.
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Confirm New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordInputChange}
                          isInvalid={!!errors.confirmPassword}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.confirmPassword}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <div className="d-flex gap-2">
                        <Button 
                          type="submit" 
                          variant="primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Changing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-key me-2"></i>
                              Change Password
                            </>
                          )}
                        </Button>
                        <Button 
                          type="button" 
                          variant="secondary"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                            setErrors({});
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="bg-light p-3 rounded">
                        <h6>Password Tips</h6>
                        <ul className="small mb-0">
                          <li>Use at least 8 characters</li>
                          <li>Include uppercase and lowercase letters</li>
                          <li>Include numbers and symbols</li>
                          <li>Don't use personal information</li>
                          <li>Don't reuse old passwords</li>
                        </ul>
                      </div>
                    </Col>
                  </Row>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UserProfile;

