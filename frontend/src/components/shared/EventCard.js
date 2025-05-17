import React, { useEffect, useState } from "react";
import { Card, Badge, Button, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./EventCard.css";

// TODO: Add animation for card hover

const EventCard = ({ event }) => {
  // Flag to check if event is in future
  const [isUpcoming, setIsUpcoming] = useState(false);
  
  // Using effect to check date - this ran into timezone issues before
  useEffect(() => {
    let eventDate = new Date(event.event_date);
    let today = new Date();
    
    // sometimes we get weird date objects so double check
    if(isNaN(eventDate.getTime())) {
      console.log('Invalid date found for event:', event.name);
      eventDate = today; // fallback
    }
    
    setIsUpcoming(eventDate >= today);
  }, [event]);
  // Pretty format the event date for display
  const formatEventDate = (dateString) => {
    // Fixed options for consistent formatting
    const options = {
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    
    // Handle bad dates gracefully
    try {
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch(e) {
      return "Date unavailable";
    }
  };

  // Format price to show Free or actual cost
  // NOTE: Might need to add currency symbol config later
  const formatPrice = (price) => {
    // Handle all these annoying edge cases we keep getting
    if (price === undefined || price === null || isNaN(price)) {
      return "Free";
    }
    
    // Free events or anything costing money
    return price === 0 ? "Free" : `$${Number(price).toFixed(2)}`;
  };

  // Use a default placeholder if event has no image
  let imageUrl = "https://via.placeholder.com/300x200?text=No+Image";
  if (event.image_url && event.image_url.trim() !== "") {
    imageUrl = event.image_url;
  }

  return (
    <Card className="event-card shadow-sm">
      <Card.Img
        variant="top"
        src={imageUrl}
        alt={event.name}
        className="card-img-top"
      />
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <Badge bg="primary" className="me-1">
              {event.category?.name || "Uncategorized"}
            </Badge>
            {/* Show badge only for future events */}
            {isUpcoming && (
              <Badge bg="success">
                Upcoming
              </Badge>
            )}
          </div>
          <Badge bg={event.price === 0 ? "success" : "secondary"}>
            {formatPrice(event.price)}
          </Badge>
        </div>

        <Card.Title className="mb-3" title={event.name}>
          {/* Adding ellipsis in CSS for long titles */}
          {event.name}
        </Card.Title>

        <div className="text-muted small mb-2">
          <i className="bi bi-geo-alt me-2"></i>
          {event.venue}
        </div>

        <div className="text-muted small mb-3">
          <i className="bi bi-calendar-event me-2"></i>
          {formatEventDate(event.event_date)}
        </div>

        {/* Truncated description - should be handled by CSS classes */}
        <Card.Text className="description-text small mb-3">
          {event.description || "No description available"}
        </Card.Text>

        <div className="view-details-btn mt-auto">
          <Button
            as={Link}
            to={`/events/${event.id}`}
            variant="outline-primary"
            className="w-100"
          >
            View Details
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

// TODO: Maybe add React.memo later for performance if we have lots of cards?
export default EventCard;