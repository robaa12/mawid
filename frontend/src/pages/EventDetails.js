import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Badge,
  Button,
  Alert,
  Container,
  Modal,
} from "react-bootstrap";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import eventService from "../services/eventService";
import bookingService from "../services/bookingService";
import { useAuth } from "../context/AuthContext";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasBooking, setHasBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  // Format event date
  const formatEventDate = (dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format price
  const formatPrice = (price) => {
    // Check if price is undefined, null, or not a number
    if (price === undefined || price === null || isNaN(price)) {
      return "Free"; // Default to Free if price is missing or invalid
    }

    return price === 0 ? "Free" : `$${Number(price).toFixed(2)}`;
  };

  // In useEffect that fetches event data in EventDetails.js
  useEffect(() => {
    const fetchEventData = async () => {
      setLoading(true);
      try {
        const response = await eventService.getEventById(id);
        console.log("Event details response:", response);

        // Process response and ensure price is a number
        if (response && response.data) {
          const eventData = response.data;

          // Ensure price is a number
          if (eventData.price === undefined || eventData.price === null) {
            eventData.price = 0;
          } else {
            eventData.price = Number(eventData.price);
          }

          setEvent(eventData);
        } else {
          throw new Error("Invalid response format");
        }

        // Check if user has a booking for this event
        if (isAuthenticated) {
          checkBookingStatus();
        }
      } catch (err) {
        console.error("Failed to fetch event:", err);
        setError(
          "Failed to load event details. The event may not exist or has been removed.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, isAuthenticated]);

  // Ensure the event ID is properly passed to checkBookingStatus
  const checkBookingStatus = async () => {
    try {
      console.log("Checking booking status for event ID:", id);
      const response = await bookingService.checkEventBooking(id);
      console.log("Booking status response:", response);

      if (response && response.data) {
        setHasBooking(response.data.has_booking);
        if (response.data.has_booking && response.data.booking) {
          setBookingStatus(response.data.booking.status);
        }
      } else {
        console.error("Unexpected booking status response format:", response);
      }
    } catch (err) {
      console.error("Failed to check booking status:", err);
      // Don't set error state here, just log it
    }
  };

  const handleBookEvent = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/events/${id}` } });
      return;
    }

    setBookingError("");
    setBookingMessage("");
    setShowBookingModal(true);
  };

  // Updated confirmBooking function in EventDetails.js
  const confirmBooking = async () => {
    try {
      console.log("Confirming booking for event ID:", id);

      // Call the booking service
      const response = await bookingService.createBooking(id);
      console.log("Booking confirmed:", response);

      setHasBooking(true);
      setBookingStatus("confirmed");
      setBookingMessage(
        "Booking confirmed successfully! You can view your bookings in your profile.",
      );
    } catch (err) {
      console.error("Booking failed:", err);

      // Log more details about the error
      if (err.response) {
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
      }

      setBookingError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to book event. Please try again.",
      );
    } finally {
      setShowBookingModal(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      // First we need to get the booking ID
      console.log("Getting booking info for event ID:", id);
      const response = await bookingService.checkEventBooking(id);
      console.log("Got booking info:", response);

      if (response.data && response.data.has_booking && response.data.booking) {
        const bookingId = response.data.booking.id;
        console.log("Cancelling booking with ID:", bookingId);

        await bookingService.updateBookingStatus(bookingId, "cancelled");
        setBookingStatus("cancelled");
        setBookingMessage("Booking cancelled successfully.");
      } else {
        throw new Error("Unable to find booking information");
      }
    } catch (err) {
      console.error("Cancellation failed:", err);
      setBookingError(
        err.response?.data?.message ||
          "Failed to cancel booking. Please try again.",
      );
    }
  };

  const handleEditEvent = () => {
    navigate(`/admin/events?edit=${id}`);
  };

  if (loading) {
    return <LoadingSpinner text="Loading event details..." />;
  }

  if (error || !event) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-primary" onClick={() => navigate("/")}>
            Return to Events
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4 page-transition">
      {bookingMessage && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setBookingMessage("")}
        >
          {bookingMessage}
        </Alert>
      )}

      {bookingError && (
        <Alert variant="danger" dismissible onClose={() => setBookingError("")}>
          {bookingError}
        </Alert>
      )}

      <Card className="mb-4 border-0 shadow">
        <Row className="g-0">
          <Col md={4}>
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.name}
                className="img-fluid rounded-start h-100"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="bg-light d-flex align-items-center justify-content-center h-100 rounded-start">
                <p className="text-muted">No image available</p>
              </div>
            )}
          </Col>
          <Col md={8}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <Badge bg="primary" className="mb-2">
                    {event.category?.name || "Uncategorized"}
                  </Badge>
                  <h2>{event.name}</h2>
                </div>
                <Badge
                  bg={event.price === 0 ? "success" : "secondary"}
                  className="fs-6"
                >
                  {formatPrice(event.price)}
                </Badge>
              </div>

              <Card.Text className="mb-3">
                <i className="bi bi-geo-alt me-2"></i>
                {event.venue}
              </Card.Text>

              <Card.Text className="mb-4">
                <i className="bi bi-calendar-date me-2"></i>
                {formatEventDate(event.event_date)}
              </Card.Text>

              {isAdmin && (
                <div className="mb-4">
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={handleEditEvent}
                    className="me-2"
                  >
                    <i className="bi bi-pencil me-1"></i> Edit Event
                  </Button>
                </div>
              )}

              <div className="d-grid gap-2 d-md-flex justify-content-md-start mt-4">
                {!hasBooking ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleBookEvent}
                    disabled={bookingStatus === "confirmed"}
                  >
                    Book Now
                  </Button>
                ) : bookingStatus === "confirmed" ? (
                  <>
                    <Button variant="success" size="lg" disabled>
                      <i className="bi bi-check-circle me-1"></i> Booked
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={handleCancelBooking}
                    >
                      Cancel Booking
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" size="lg" disabled>
                    Booking Cancelled
                  </Button>
                )}
              </div>
            </Card.Body>
          </Col>
        </Row>
      </Card>

      <Card className="my-4 shadow-sm">
        <Card.Header>
          <h4>Event Details</h4>
        </Card.Header>
        <Card.Body>
          <div className="mb-4">
            {event.description.split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {event.tags && event.tags.length > 0 && (
            <div className="mt-4">
              <h5>Tags</h5>
              {event.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  bg="light"
                  text="dark"
                  className="me-2 mb-2"
                  style={{ fontSize: "0.9rem", padding: "8px" }}
                >
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal
        show={showBookingModal}
        onHide={() => setShowBookingModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You are about to book a ticket for:</p>
          <p className="fw-bold">{event.name}</p>
          <p>
            <i className="bi bi-geo-alt me-1"></i> {event.venue}
            <br />
            <i className="bi bi-calendar-date me-1"></i>{" "}
            {formatEventDate(event.event_date)}
          </p>
          {event.price > 0 && (
            <Alert variant="info">
              This event costs {formatPrice(event.price)}. You'll need to pay at
              the venue.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowBookingModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmBooking}>
            Confirm Booking
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EventDetails;
