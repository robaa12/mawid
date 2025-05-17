import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import bookingService from '../../services/bookingService';

const BookingCard = ({ booking, onCancelBooking, showEventDetails = true }) => {
  const bookingDate = bookingService.formatBookingDate(booking.booking_date);
  const statusClass = bookingService.getStatusClass(booking.status);
  const statusBadgeClass = bookingService.getStatusBadgeClass(booking.status);
  
  // Format created date
  const formatCreatedDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="mb-1">
              Event Reservation
              <Badge className={`ms-2 ${statusBadgeClass}`}>
                {booking.status}
              </Badge>
            </h5>
            <p className="text-muted small mb-0">
              <i className="bi bi-calendar-check me-1"></i>
              Booked on {bookingDate}
            </p>
          </div>
          
          {booking.status === 'confirmed' && (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => onCancelBooking(booking.id)}
            >
              Cancel Booking
            </Button>
          )}
        </div>
        
        {showEventDetails && booking.event && (
          <Card className="mt-2 bg-light border-0">
            <Card.Body className="py-2">
              <div className="row align-items-center">
                <div className="col-md-2">
                  {booking.event.image_url && (
                    <img 
                      src={booking.event.image_url} 
                      alt={booking.event.name} 
                      className="img-fluid rounded"
                      style={{ maxHeight: '60px', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div className="col-md-10">
                  <h6 className="mb-1">{booking.event.name}</h6>
                  <p className="text-muted small mb-0">
                    <i className="bi bi-geo-alt me-1"></i>
                    {booking.event.venue}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}
        
        <div className="d-flex justify-content-between mt-3">
          <small className="text-muted">
            Created: {formatCreatedDate(booking.created_at)}
          </small>
          <Button 
            variant="primary" 
            size="sm" 
            href={`/events/${booking.event_id}`}
          >
            View Event
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default BookingCard;