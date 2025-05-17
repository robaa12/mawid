import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Pagination from '../../components/shared/Pagination';
import bookingService from '../../services/bookingService';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [displayedBookings, setDisplayedBookings] = useState([]);
  const [filterConfirmed, setFilterConfirmed] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const fetchBookings = async (page) => {
        // Prevent multiple concurrent requests
        if (loading) return;
      
        setLoading(true);
        try {
          // Request a large page size to effectively get all bookings
          const response = await bookingService.getAllBookings(page, 1000);
          console.log("Admin bookings response:", response);
      
          // Handle different possible response structures
          let bookingsData = [];
          let totalPagesValue = 1;
          let totalCount = 0;
      
          if (response && response.data) {
            if (Array.isArray(response.data)) {
              bookingsData = response.data;
              totalCount = bookingsData.length;
            } else if (response.data.bookings && Array.isArray(response.data.bookings)) {
              bookingsData = response.data.bookings;
              totalPagesValue = response.data.total_pages || 1;
              totalCount = response.data.total || bookingsData.length;
            } else if (response.data.data && response.data.data.bookings && Array.isArray(response.data.data.bookings)) {
              bookingsData = response.data.data.bookings;
              totalPagesValue = response.data.data.total_pages || 1;
              totalCount = response.data.data.total || bookingsData.length;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              bookingsData = response.data.data;
              totalPagesValue = response.data.total_pages || 1;
              totalCount = response.data.total || bookingsData.length;
            }
          }
      
          console.log("Parsed bookings data:", bookingsData);
          console.log("Total bookings count:", totalCount);
          setTotalPages(totalPagesValue);
          console.log("Total pages set to:", totalPagesValue);
      
        // Further enrich the booking data by ensuring event and user data
        const enrichedBookings = bookingsData.map(booking => {
          // Ensure booking has user and event objects
          if (!booking.user) booking.user = { id: booking.user_id, name: `User #${booking.user_id}` };
          if (!booking.event) booking.event = { id: booking.event_id, name: `Event #${booking.event_id}` };
          return booking;
        });
      
        // Sort bookings by date (newest first)
        const sortedBookings = [...enrichedBookings].sort((a, b) => 
          new Date(b.created_at || b.updated_at || Date.now()) - 
          new Date(a.created_at || a.updated_at || Date.now())
        );
      
        // Update booking lists
        setAllBookings(sortedBookings);
      
        // Apply confirmed filter if it's enabled
        if (filterConfirmed) {
          setBookings(sortedBookings.filter(booking => booking.status === 'confirmed'));
        } else {
          setBookings(sortedBookings);
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        setError("Failed to load bookings. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

  // Load the filter from URL parameter only once on component mount
  useEffect(() => {
    const confirmedParam = searchParams.get('confirmed');
    if (confirmedParam === 'true') {
      setFilterConfirmed(true);
    }
    
    // Initial data fetch on component mount
    fetchBookings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Only fetch bookings when page changes or when component first mounts
  // Since we're getting all bookings at once, we don't need to refetch as often
  // Update displayed bookings when page changes or bookings change
  useEffect(() => {
    if (bookings.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, bookings.length);
      setDisplayedBookings(bookings.slice(startIndex, endIndex));
    } else {
      setDisplayedBookings([]);
    }
  }, [currentPage, bookings, itemsPerPage]);
  
  // Initial fetch
  useEffect(() => {
    // Skip on initial render since we already fetch in the mount effect
    if (!loading && allBookings.length === 0) {
      fetchBookings(1); // Always fetch page 1 with large page size to get all bookings
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Apply filter when allBookings changes
  // This handles when new data is loaded from API
  useEffect(() => {
    // Only apply filter if we actually have bookings
    if (allBookings.length > 0) {
      if (filterConfirmed) {
        // Show only confirmed bookings 
        setBookings(allBookings.filter(booking => booking.status === 'confirmed'));
      } else {
        // Show all bookings
        setBookings(allBookings);
      }
      // Update total pages based on filtered bookings and items per page
      const filteredBookings = filterConfirmed 
        ? allBookings.filter(booking => booking.status === 'confirmed')
        : allBookings;
      setTotalPages(Math.ceil(filteredBookings.length / itemsPerPage));
    }
  }, [allBookings, filterConfirmed, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  
  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleFilterChange = () => {
    const newFilterState = !filterConfirmed;
    setFilterConfirmed(newFilterState);
    
    // Apply filter immediately to prevent unnecessary re-renders
    if (allBookings.length > 0) {
      if (newFilterState) {
        // Show only confirmed bookings 
        setBookings(allBookings.filter(booking => booking.status === 'confirmed'));
      } else {
        // Show all bookings
        setBookings(allBookings);
      }
    }
    
    // Reset to page 1 when filter changes, but only if needed
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await bookingService.updateBookingStatus(bookingId, newStatus);
      
      // Update local state to reflect the change
      const updatedBookings = allBookings.map(booking => 
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      );
      
      setAllBookings(updatedBookings);
      
      // Update the filtered bookings if needed
      if (filterConfirmed) {
        setBookings(updatedBookings.filter(booking => booking.status === 'confirmed'));
      } else {
        setBookings(updatedBookings);
      }
      
      setSuccessMessage(`Booking #${bookingId} has been ${newStatus}.`);
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error(`Failed to update booking status:`, err);
      setError(`Failed to update booking status. ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    let variant = 'secondary';
    
    switch(status) {
      case 'confirmed':
        variant = 'success';
        break;
      case 'cancelled':
        variant = 'danger';
        break;
      case 'pending':
        variant = 'warning';
        break;
      default:
        variant = 'secondary';
    }
    
    return <Badge bg={variant}>{status}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return <LoadingSpinner text="Loading bookings..." />;
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>All Bookings</h2>
        <div className="d-flex gap-3 align-items-center">
          <Form.Group className="d-flex align-items-center me-3">
            <Form.Label className="me-2 mb-0">Items per page:</Form.Label>
            <Form.Select 
              style={{ width: '80px' }} 
              value={itemsPerPage} 
              onChange={handleItemsPerPageChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Form.Select>
          </Form.Group>
          <Form.Check 
            type="switch"
            id="confirmed-filter-switch"
            label="Show only confirmed bookings"
            checked={filterConfirmed}
            onChange={handleFilterChange}
          />
        </div>
      </div>
      
      {successMessage && (
        <Alert 
          variant="success" 
          dismissible 
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert 
          variant="danger" 
          dismissible 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      <Card className="shadow-sm">
        <Card.Body>
          {bookings.length > 0 ? (
            <>
              <div className="table-responsive">
                <p className="text-muted mb-2">
                  Showing {displayedBookings.length} of {bookings.length} total bookings 
                  {filterConfirmed ? " (filtered: confirmed only)" : ""}
                </p>
                <Table hover>
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Event</th>
                      <th>User</th>
                      <th>Date Booked</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>#{booking.id}</td>
                        <td>
                          <Link to={`/events/${booking.event_id}`}>
                            {booking.event?.name || `Event #${booking.event_id}`}
                          </Link>
                        </td>
                        <td>{booking.user?.name || `User #${booking.user_id}`}</td>
                        <td>{formatDate(booking.created_at)}</td>
                        <td>{getStatusBadge(booking.status)}</td>
                        <td>
                          {booking.status === 'pending' && (
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              className="me-2"
                              onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                            >
                              <i className="bi bi-check-circle"></i> Confirm
                            </Button>
                          )}
                          
                          {booking.status !== 'cancelled' && (
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                            >
                              <i className="bi bi-x-circle"></i> Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mt-4">
                <p className="text-muted mb-0">
                  Page {currentPage} of {totalPages}
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          ) : (
            <Alert variant="info">
              No bookings found. When users book events, they will appear here.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdminBookings;