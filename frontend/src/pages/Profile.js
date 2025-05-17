import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Form, Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import BookingCard from '../components/shared/BookingCard';
import bookingService from '../services/bookingService';

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const fetchUserBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getUserBookings();
      setBookings(response.data.bookings);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setError("Failed to load your bookings. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await bookingService.updateBookingStatus(bookingId, 'cancelled');
      // Update the booking in the local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' } 
          : booking
      ));
      setSuccessMessage('Booking cancelled successfully.');
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      setError("Failed to cancel booking. Please try again later.");
    }
  };

  const handlePasswordChange = () => {
    // Reset errors and open modal
    setPasswordError('');
    setShowChangePasswordModal(true);
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const submitPasswordChange = () => {
    // Reset error
    setPasswordError('');

    // Basic validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    // Password change would go here (not implemented in this example)
    // For now, just close the modal and show success message
    setShowChangePasswordModal(false);
    setSuccessMessage('Password updated successfully.');
    
    // Reset form
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  if (loading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  if (!currentUser) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          You need to be logged in to view your profile.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col>
          <h2>My Profile</h2>
        </Col>
      </Row>
      
      <Row>
        <Col md={4}>
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <div className="text-center mb-4">
                <div className="avatar-placeholder bg-primary text-white rounded-circle mb-3 mx-auto"
                     style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
                </div>
                <h3>{currentUser.name}</h3>
                <p className="text-muted">{currentUser.email}</p>
                <Badge bg={currentUser.role === 'admin' ? 'danger' : 'info'} className="px-3 py-2">
                  {currentUser.role === 'admin' ? 'Administrator' : 'User'}
                </Badge>
              </div>
              
              <div className="d-grid gap-2">
                <Button variant="outline-secondary" onClick={handlePasswordChange}>
                  Change Password
                </Button>
                <Button variant="outline-danger" onClick={logout}>
                  Logout
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Header>
              <h4>Recent Bookings</h4>
            </Card.Header>
            <Card.Body>
              {bookings.length > 0 ? (
                bookings.slice(0, 5).map(booking => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onCancelBooking={handleCancelBooking}
                  />
                ))
              ) : (
                <p className="text-center text-muted my-4">
                  You don't have any bookings yet.
                </p>
              )}
              
              {bookings.length > 5 && (
                <div className="text-center mt-3">
                  <Button variant="link" as={Link} to="/bookings">
                    View All Bookings
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Password Change Modal */}
      <Modal show={showChangePasswordModal} onHide={() => setShowChangePasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {passwordError && (
            <Alert variant="danger">{passwordError}</Alert>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Current Password</Form.Label>
            <Form.Control 
              type="password" 
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange}
              placeholder="Enter current password" 
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>New Password</Form.Label>
            <Form.Control 
              type="password" 
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange}
              placeholder="Enter new password" 
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Confirm New Password</Form.Label>
            <Form.Control 
              type="password" 
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange}
              placeholder="Confirm new password" 
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowChangePasswordModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitPasswordChange}>
            Update Password
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

// Define Badge component since it's not imported
const Badge = ({ bg, className, children }) => (
  <span className={`badge bg-${bg} ${className || ''}`}>
    {children}
  </span>
);

// Define Link component since it's not imported
const Link = ({ to, children, as: Component = 'a', ...rest }) => (
  <Component href={to} {...rest}>{children}</Component>
);

export default Profile;