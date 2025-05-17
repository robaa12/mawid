import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import BookingCard from '../components/shared/BookingCard';
import Pagination from '../components/shared/Pagination';
import bookingService from '../services/bookingService';

const Bookings = () => {
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserBookings();
    }
  }, [isAuthenticated, currentPage, filterStatus]);

  const fetchUserBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getUserBookings(currentPage);
      
      setBookings(response.data.bookings);
      setTotalPages(response.data.total_pages);
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
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      setError("Failed to cancel booking. Please try again later.");
    }
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Filter bookings if needed
  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filterStatus);

  if (loading) {
    return <LoadingSpinner text="Loading bookings..." />;
  }

  return (
    <Container className="py-4 page-transition">
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

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Bookings</h2>
        
        <Form.Group style={{ width: '200px' }}>
          <Form.Select 
            value={filterStatus} 
            onChange={handleFilterChange}
            aria-label="Filter bookings"
          >
            <option value="all">All Bookings</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </Form.Select>
        </Form.Group>
      </div>
      
      {filteredBookings.length > 0 ? (
        <>
          <Row>
            <Col>
              {filteredBookings.map(booking => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  onCancelBooking={handleCancelBooking}
                  showEventDetails={true}
                />
              ))}
            </Col>
          </Row>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <Card body className="text-center">
          <p className="mb-0">
            {filterStatus === 'all' 
              ? "You don't have any bookings yet." 
              : `You don't have any ${filterStatus} bookings.`}
          </p>
          
          {filterStatus !== 'all' && (
            <p className="mt-3 mb-0">
              <button 
                className="btn btn-link p-0" 
                onClick={() => setFilterStatus('all')}
              >
                View all bookings
              </button>
            </p>
          )}
        </Card>
      )}
    </Container>
  );
};

export default Bookings;