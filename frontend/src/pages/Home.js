import React, { useState, useEffect } from "react";
import { Row, Col, Container, Button, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import FullWidthContainer from "../components/layout/FullWidthContainer";
import EventCard from "../components/shared/EventCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import eventService from "../services/eventService";
import "./Home.css";

const Home = () => {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUpcomingEvents();
    
    // Refresh events automatically every 2 minutes
    const refreshInterval = setInterval(() => {
      fetchUpcomingEvents(true);
    }, 120000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchUpcomingEvents = async (isRefresh = false) => {
    setLoading(isRefresh ? false : true);
    
    try {
      // Use the optimized recent events endpoint that uses server-side caching
      const response = await eventService.getRecentEvents(isRefresh);
      if (response && response.data && response.data.events) {
        // Filter out past events
        const currentDate = new Date();
        const filteredEvents = response.data.events.filter(event => 
          new Date(event.event_date) >= currentDate
        );
        
        // Show up to 6 events for a 2x3 grid layout
        setUpcomingEvents(filteredEvents.slice(0, 6));
        if (error) setError(null); // Clear any previous errors on success
      } else {
        setError("Failed to load upcoming events");
      }
    } catch (err) {
      console.error("Failed to fetch upcoming events:", err);
      setError("Failed to load upcoming events. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-transition home-page">
      {/* Hero Section */}
      <div className="hero-section bg-primary text-white py-5 text-center">
        <Container>
          <Row className="justify-content-center py-5">
            <Col md={8} className="py-5">
              <h1 className="display-4 fw-bold mb-4">
                Discover Events That Matter to You
              </h1>
              <p className="lead mb-4">
                Easily book concerts, courses, and tech meetups without hassle.
              </p>
              <Link to="/events">
                <Button size="lg" variant="light" className="fw-bold px-4 py-2 square-button">
                  Browse Events
                </Button>
              </Link>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Upcoming Events Section */}
      <div className="upcoming-events">
        <Container className="py-5">
          <h2 className="text-center fw-bold upcoming-events-title">Upcoming Events</h2>
          
          {loading ? (
            <div className="text-center py-5">
              <LoadingSpinner text="Loading events..." />
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : upcomingEvents.length > 0 ? (
            <div>
              <Row className="g-4">
                {upcomingEvents.map((event) => (
                  <Col key={event.id} xs={12} sm={6} md={4} className="mb-4 event-card-wrapper">
                    <EventCard event={event} />
                  </Col>
                ))}
              </Row>
              <div className="text-center mt-4">
                <Link to="/events">
                  <Button variant="outline-primary" className="view-all-btn">View All Events</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <Alert variant="info">
                <i className="bi bi-calendar-x me-2"></i>
                No upcoming events available at this time. Check back soon or view past events!
              </Alert>
              <Link to="/events">
                <Button variant="outline-primary" className="view-all-btn mt-3">Browse All Events</Button>
              </Link>
            </div>
          )}
        </Container>
      </div>
    </div>
  );
};

export default Home;
