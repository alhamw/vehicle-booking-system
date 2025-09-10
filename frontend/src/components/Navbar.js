import React from 'react';
import { Navbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const NavigationBar = () => {
  const { user, logout, isAdmin, isApproverOnly } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <LinkContainer to="/dashboard">
          <Navbar.Brand>
            <i className="fas fa-truck me-2"></i>
            Vehicle Booking System
          </Navbar.Brand>
        </LinkContainer>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Hide Dashboard for approvers */}
            {!isApproverOnly && (
              <LinkContainer to="/dashboard">
                <Nav.Link>
                  <i className="fas fa-tachometer-alt me-1"></i>
                  Dashboard
                </Nav.Link>
              </LinkContainer>
            )}
            
            {/* Hide Bookings for approvers */}
            {!isApproverOnly && (
              <LinkContainer to="/bookings">
                <Nav.Link>
                  <i className="fas fa-calendar-alt me-1"></i>
                  Bookings
                </Nav.Link>
              </LinkContainer>
            )}
            
            {/* Show New Booking for Employees and Admins, hide for pure Approvers */}
            {(user?.role === 'employee' || user?.role === 'admin') && (
              <LinkContainer to="/bookings/create">
                <Nav.Link>
                  <i className="fas fa-plus me-1"></i>
                  New Booking
                </Nav.Link>
              </LinkContainer>
            )}

            {isAdmin && (
              <NavDropdown title={<><i className="fas fa-cog me-1"></i>Admin</>} id="admin-nav-dropdown">
                <LinkContainer to="/admin/vehicles">
                  <NavDropdown.Item>
                    <i className="fas fa-truck me-2"></i>
                    Vehicles
                  </NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/admin/drivers">
                  <NavDropdown.Item>
                    <i className="fas fa-user-tie me-2"></i>
                    Drivers
                  </NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/admin/users">
                  <NavDropdown.Item>
                    <i className="fas fa-users me-2"></i>
                    Users
                  </NavDropdown.Item>
                </LinkContainer>
                <NavDropdown.Divider />
                <LinkContainer to="/admin/reports">
                  <NavDropdown.Item>
                    <i className="fas fa-chart-bar me-2"></i>
                    Reports
                  </NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/admin/audit-logs">
                  <NavDropdown.Item>
                    <i className="fas fa-history me-2"></i>
                    Audit Logs
                  </NavDropdown.Item>
                </LinkContainer>
              </NavDropdown>
            )}
          </Nav>
          
          <Nav>
            <NavDropdown 
              title={
                <span>
                  <i className="fas fa-user me-1"></i>
                  {user?.name}
                </span>
              } 
              id="user-nav-dropdown"
              align="end"
            >
              <NavDropdown.ItemText>
                <small className="text-muted">
                  {user?.email}<br />
                  Role: {user?.role?.replace('_', ' ').toUpperCase()}
                </small>
              </NavDropdown.ItemText>
              <NavDropdown.Divider />
              <LinkContainer to="/profile">
                <NavDropdown.Item>
                  <i className="fas fa-user-edit me-2"></i>
                  Profile
                </NavDropdown.Item>
              </LinkContainer>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;


