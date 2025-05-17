import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './styles/Dashboard.css';

import { useAuth } from '../../context/AuthContext';
import eventService from '../../services/eventService';
import bookingService from '../../services/bookingService';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalBookings: 0,
    confirmedBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real implementation, you might have a dedicated endpoint for dashboard stats
        // Here we'll simulate by just getting events and calculating stats
        const eventsResponse = await eventService.getAllEvents(1, 100);
        const events = eventsResponse.data.events;
        
        // Get current date for comparison
        const now = new Date();
        
        // Calculate active events (events that haven't happened yet)
        const activeEvents = events.filter(event => new Date(event.event_date) > now);
        
        // Get booking stats from the admin API
        const bookingsResponse = await bookingService.getAllBookings(1, 100);
        const bookings = bookingsResponse.data.bookings || [];
        const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed');

        setStats({
          totalEvents: events.length,
          activeEvents: activeEvents.length,
          totalBookings: bookings.length,
          confirmedBookings: confirmedBookings.length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Dashboard</h2>
        <div>
          <span className="badge bg-primary me-2">Admin</span>
          <span>{currentUser?.name || 'Administrator'}</span>
        </div>
      </div>
      
      {/* Summary text */}
      <div className="alert alert-light mb-4">
        <h5><i className="bi bi-info-circle me-2"></i>System Overview</h5>
        <p className="mb-0">Your dashboard shows {stats.totalEvents} total events managed by the system, with {stats.activeEvents} currently active. 
        There are {stats.totalBookings} total bookings, of which {stats.confirmedBookings} are confirmed.</p>
      </div>

      {/* Stats Cards Section */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm hover-card">
            <Card.Body>
              <i className="bi bi-calendar-event display-4 text-primary"></i>
              <h2 className="mt-3">{stats.totalEvents}</h2>
              <Card.Text>Total Events</Card.Text>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <div className="d-flex align-items-center justify-content-center text-primary">
                <i className="bi bi-arrow-up-right-circle me-1"></i>
                <span className="small">All events</span>
              </div>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm hover-card">
            <Card.Body>
              <i className="bi bi-calendar-check display-4 text-success"></i>
              <h2 className="mt-3">{stats.activeEvents}</h2>
              <Card.Text>Active Events</Card.Text>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <div className="d-flex align-items-center justify-content-center text-success">
                <i className="bi bi-calendar-check me-1"></i>
                <span className="small">Currently active</span>
              </div>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm hover-card">
            <Card.Body>
              <i className="bi bi-ticket-perforated display-4 text-info"></i>
              <h2 className="mt-3">{stats.totalBookings}</h2>
              <Card.Text>Total Bookings</Card.Text>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <div className="d-flex align-items-center justify-content-center text-info">
                <i className="bi bi-ticket-perforated me-1"></i>
                <span className="small">From all events</span>
              </div>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm hover-card">
            <Card.Body>
              <i className="bi bi-tag display-4 text-warning"></i>
              <h2 className="mt-3">{stats.confirmedBookings}</h2>
              <Card.Text>Confirmed Bookings</Card.Text>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <div className="d-flex align-items-center justify-content-center text-warning">
                <i className="bi bi-check-circle me-1"></i>
                <span className="small">Confirmed status</span>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      
      {/* Quick Stats Navigation */}
      <div className="d-flex justify-content-end mb-4">
        <Link to="/admin/events" className="btn btn-primary">
          <i className="bi bi-gear me-2"></i>
          Manage Events & Bookings
        </Link>
      </div>
      
      {/* Management Actions Section */}
      <Row>
        <Col md={12}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h4>Quick Actions</h4>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6} lg={3}>
                  <Link to="/admin/events?new=true" className="btn btn-primary d-flex flex-column align-items-center py-4 h-100 w-100">
                    <i className="bi bi-plus-circle fs-1 mb-2"></i>
                    <span>Create New Event</span>
                  </Link>
                </Col>
                <Col md={6} lg={3}>
                  <Link to="/admin/categories" className="btn btn-outline-secondary d-flex flex-column align-items-center py-4 h-100 w-100">
                    <i className="bi bi-tags fs-1 mb-2"></i>
                    <span>Manage Categories</span>
                  </Link>
                </Col>
                <Col md={6} lg={3}>
                  <Link to="/admin/events" className="btn btn-outline-info d-flex flex-column align-items-center py-4 h-100 w-100">
                    <i className="bi bi-calendar-week fs-1 mb-2"></i>
                    <span>View All Events</span>
                  </Link>
                </Col>
                <Col md={6} lg={3}>
                  <Link to="/admin/users" className="btn btn-outline-dark d-flex flex-column align-items-center py-4 h-100 w-100">
                    <i className="bi bi-people fs-1 mb-2"></i>
                    <span>Manage Users</span>
                  </Link>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;