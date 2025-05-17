import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Badge,
  InputGroup
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { Formik } from "formik";
import * as Yup from "yup";
import eventService from "../../services/eventService";
import bookingService from "../../services/bookingService";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import Pagination from "../../components/shared/Pagination";

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [filterActive, setFilterActive] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventBookings, setEventBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // Get query params
  const newEvent = searchParams.get("new") === "true";
  const editEventId = searchParams.get("edit");

  const fetchEvents = useCallback(async (page) => {
    setLoading(true);
    try {
      const response = await eventService.getAllEvents(
        page,
        10,
        null
      );
      
      if (response && response.data && response.data.events) {
        // Process events to add isActive flag
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Reset time to start of day
        
        const processedEvents = response.data.events.map(event => {
          const eventDate = new Date(event.event_date);
          const isValidDate = !isNaN(eventDate.getTime());
          
          if (isValidDate) {
            eventDate.setHours(0, 0, 0, 0);
          }
  
          return {
            ...event,
            isActive: isValidDate ? eventDate >= currentDate : true
          };
        });
        
        // Update all events state
        setAllEvents(processedEvents);
        setTotalPages(response.data.total_pages || 1);
        
        // Get current filter state at the time of the callback execution
        const currentFilterActive = filterActive;
        
        // Set filtered events based on current state
        setEvents(currentFilterActive 
          ? processedEvents.filter(event => event.isActive)
          : processedEvents
        );
      } else {
        setAllEvents([]);
        setEvents([]);
        setTotalPages(0);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError("Failed to fetch events. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); // Remove filterActive dependency to prevent re-fetching

  const fetchCategories = useCallback(async () => {
    try {
      const response = await eventService.getCategories();
      console.log("Categories response:", response);
      
      if (response && response.data) {
        setCategories(response.data);
      } else {
        console.error("Invalid categories response format:", response);
        setCategories([]);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("Failed to load categories");
    }
  }, []);

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setSelectedFile(null);
    setShowEventModal(true);
    
    // Update URL without triggering a re-render
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set("new", "true");
    window.history.replaceState(
      null, 
      '', 
      `${location.pathname}?${newSearchParams.toString()}`
    );
  }, [location.pathname, location.search, navigate]);
  
  const handleEditEvent = useCallback((event) => {
    setEditingEvent(event);
    setSelectedFile(null);
    setShowEventModal(true);
    
    // Update URL without triggering a re-render
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set("edit", event.id);
    window.history.replaceState(
      null, 
      '', 
      `${location.pathname}?${newSearchParams.toString()}`
    );
  }, [location.pathname, location.search, navigate]);

  // Format date for input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    // handle timezone offset
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
  };

  const validationSchema = Yup.object().shape({
      name: Yup.string().required("Event name is required"),
      description: Yup.string().required("Description is required"),
      event_date: Yup.date().required("Event date is required").typeError("Please enter a valid date"),
      venue: Yup.string().required("Venue is required"),
      category_id: Yup.number().required("Category is required").typeError("Category is required"),
      price: Yup.number().min(0, "Price cannot be negative").required("Price is required").typeError("Price must be a number"),
    });

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchEvents(page);
    
    // Update URL without triggering a re-render
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set("page", page);
    window.history.replaceState(
      null, 
      '', 
      `${location.pathname}?${newSearchParams.toString()}`
    );
  };

  // First useEffect for URL parameter handling - runs only once on mount
  useEffect(() => {
    // Check for filter state in URL
    const showUpcoming = searchParams.get("showUpcoming");
    if (showUpcoming !== null) {
      const shouldFilterActive = showUpcoming === "true";
      setFilterActive(shouldFilterActive);
    }
    
    // Get page from URL if present
    const pageParam = searchParams.get("page");
    if (pageParam !== null) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
  }, [searchParams]);  // Only depend on searchParams for initial load

  // Main useEffect hook for data fetching - split into multiple focused effects
  
  // Effect for fetching events when page changes
  useEffect(() => {
    fetchEvents(currentPage);
  }, [currentPage, fetchEvents]);

  // Effect for applying filter when filterActive changes without re-fetching
  useEffect(() => {
    // Skip on initial render
    if (allEvents.length > 0) {
      setEvents(filterActive 
        ? allEvents.filter(event => event.isActive)
        : allEvents
      );
    }
  }, [filterActive, allEvents]);

  // Effect for fetching categories - only runs once
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Effect for handling modal actions based on URL params
  useEffect(() => {
    // Check if we should open modal for new event
    if (newEvent) {
      handleAddEvent();
    }
  }, [newEvent, handleAddEvent]);

  // Effect for handling edit modal and fetching event data
  useEffect(() => {
    if (editEventId) {
      const fetchEventById = async () => {
        try {
          const response = await eventService.getEventById(editEventId);
          handleEditEvent(response.data);
        } catch (err) {
          console.error("Failed to fetch event for editing:", err);
          setError("Failed to fetch event for editing");
        }
      };
      fetchEventById();
    }
  }, [editEventId, handleEditEvent]);

  const handleCloseEventModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    
    // Remove edit/new params from URL without triggering a re-render
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete("new");
    newSearchParams.delete("edit");
    window.history.replaceState(
      null, 
      '', 
      `${location.pathname}?${newSearchParams.toString()}`
    );
  };

  const handleFileChange = (e, setFieldValue) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFieldValue("image", file);
      console.log("File selected:", file.name, file.type, file.size);
    }
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // Create a simple object first to make sure we have all required fields
      const eventData = {
        name: values.name,
        description: values.description,
        category_id: parseInt(values.category_id, 10),
        event_date: new Date(values.event_date).toISOString(), // Format date properly
        venue: values.venue,
        price: parseFloat(values.price)
      };

      // Handle tags (convert comma-separated string to array)
      if (values.tags) {
        eventData.tags = values.tags.split(",").map(tag => tag.trim()).filter(Boolean);
      }

      // Add image if selected
      if (selectedFile) {
        eventData.image = selectedFile;
      }

      console.log("Submitting event with data:", eventData);

      let result;
      if (editingEvent) {
        const response = await eventService.updateEvent(editingEvent.id, eventData);
        result = response.data;
        setSuccessMessage(`Event "${values.name}" updated successfully!`);
      } else {
        const response = await eventService.createEvent(eventData);
        result = response.data?.data || response.data;
        resetForm();
        setSelectedFile(null);
        setSuccessMessage(`Event "${values.name}" created successfully!`);
      }

      setShowEventModal(false);
      fetchEvents(currentPage);
    } catch (err) {
      console.error("Error submitting form:", err);
      setError(err.response?.data?.message || "Failed to save event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    
    try {
      await eventService.deleteEvent(eventToDelete.id);
      setShowDeleteModal(false);
      setSuccessMessage(`Event "${eventToDelete.name}" deleted successfully!`);
      fetchEvents(currentPage);
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(err.response?.data?.message || "Failed to delete event. Please try again.");
    }
  };

  // Handle event status toggle
  const handleStatusToggle = (event) => {
    // Toggle isActive locally without backend call since it's a calculated value
    const updatedEvent = { ...event, isActive: !event.isActive };
    
    // Update only the allEvents list - the useEffect will handle filtered events
    setAllEvents(prevAllEvents => 
      prevAllEvents.map(e => e.id === event.id ? updatedEvent : e)
    );
    
    setSuccessMessage(
      `Event "${event.name}" marked as ${updatedEvent.isActive ? "upcoming" : "past"}`
    );
  };

  // View event bookings
  const handleViewBookings = async (event) => {
    setSelectedEvent(event);
    setBookingsLoading(true);
    setShowBookingsModal(true);
    setError(""); // Clear any previous errors
    
    try {
      const response = await bookingService.getEventBookings(event.id);
      // Make sure we extract the bookings array from the response
      const bookings = response?.bookings || [];
      console.log(`Received ${bookings.length} bookings for event ${event.id}`);
      setEventBookings(bookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to fetch event bookings. Please try again.");
      setEventBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Format event status based on event date - memoized to prevent re-renders
  const formatStatus = useCallback((isActive) => {
    return isActive ? (
      <Badge bg="success">Upcoming</Badge>
    ) : (
      <Badge bg="secondary">Past</Badge>
    );
  }, []);
  
  // Format booking status with appropriate badge
  const formatBookingStatus = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>;
    
    switch(status.toLowerCase()) {
      case 'confirmed':
        return <Badge bg="success">Confirmed</Badge>;
      case 'cancelled':
        return <Badge bg="danger">Cancelled</Badge>;
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      default:
        return <Badge bg="info">{status}</Badge>;
    }
  };

  // Format event price
  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "Free"; // Default to Free if price is missing or invalid
    }
    return price === 0 ? "Free" : `$${Number(price).toFixed(2)}`;
  };
  
  // Log an event for debugging purposes
  const debugEvent = (event) => {
    if (!event) return;
    console.log("Event data:", {
      id: event.id,
      name: event.name,
      description: event.description || "No description",
      category_id: event.category_id,
      venue: event.venue,
      price: event.price
    });
  };

  if (loading) {
    return <LoadingSpinner text="Loading events..." />;
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Manage Events</h2>
        <div className="d-flex gap-3 align-items-center">
          <Form.Check 
            type="switch"
            id="active-filter-switch"
            label={<span className="fw-bold">Show only upcoming events (hide past events)</span>}
            checked={filterActive}
            onChange={() => {
              // Toggle filter state without updating events here
              // (the useEffect will handle updating events)
              setFilterActive(prevState => {
                const newState = !prevState;
                
                // Update URL without triggering re-renders
                const newSearchParams = new URLSearchParams(location.search);
                newSearchParams.set("showUpcoming", newState.toString());
                window.history.replaceState(
                  null, 
                  '', 
                  `${location.pathname}?${newSearchParams.toString()}`
                );
                
                return newState;
              });
            }}
          />
          <Button variant="primary" onClick={handleAddEvent}>
            <i className="bi bi-plus-circle me-1"></i>
            Add Event
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage("")}>
          {successMessage}
        </Alert>
      )}

      <Card className="shadow-sm">
        <Card.Body>
          <Table responsive hover className="align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
                <th>Category</th>
                <th>Price</th>
                <th>Bookings</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <i className="bi bi-calendar-x text-muted fs-1 d-block mb-2"></i>
                    No events found
                  </td>
                </tr>
              )}
              {events.map((event) => (
                <tr key={event.id} className={!event.isActive ? "table-secondary" : ""}>
                  <td>
                    <div className="d-flex align-items-center">
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.name}
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            marginRight: "10px",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            backgroundColor: "#e9ecef",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: "10px",
                          }}
                        >
                          <i className="bi bi-image text-muted"></i>
                        </div>
                      )}
                      <div>
                        <strong>{event.name}</strong>
                        <div className="small text-muted">{event.venue}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(event.event_date)}</td>
                  <td>{formatStatus(event.isActive)}</td>
                  <td>{event.category?.name || "—"}</td>
                  <td>{formatPrice(event.price)}</td>
                  <td>
                    <Button 
                      variant="outline-info" 
                      size="sm"
                      onClick={() => handleViewBookings(event)}
                    >
                      <i className="bi bi-people me-1"></i>
                      View Bookings
                    </Button>
                  </td>
                  <td>
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEditEvent(event)}
                        title="Edit Event"
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        variant={event.isActive ? "outline-secondary" : "outline-success"}
                        size="sm"
                        onClick={() => handleStatusToggle(event)}
                        title={event.isActive ? "Mark as Past" : "Mark as Upcoming"}
                        className="toggle-status-btn ms-1"
                      >
                        <i className={`bi ${event.isActive ? "bi-calendar-x" : "bi-calendar-check"}`}></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteClick(event)}
                        title="Delete Event"
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </Card.Body>
      </Card>

      {/* Event Form Modal */}
      <Modal show={showEventModal} onHide={handleCloseEventModal} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className={`bi ${editingEvent ? "bi-pencil-square" : "bi-plus-circle"} me-2`}></i>
            {editingEvent ? "Edit Event" : "Add New Event"}
          </Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={{
            name: editingEvent?.name || "",
            description: editingEvent?.description || "",
            category_id: editingEvent?.category_id?.toString() || "",
            event_date: formatDateForInput(editingEvent?.event_date) || "",
            venue: editingEvent?.venue || "",
            price: editingEvent?.price || 0,
            tags: editingEvent?.tags
              ? editingEvent.tags.map((tag) => tag.name).join(", ")
              : "",
            image: null,
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
            setFieldValue,
          }) => (
            <Form onSubmit={handleSubmit}>
              <Modal.Body>
                <Card className="mb-4 shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">Basic Information</h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <i className="bi bi-bookmark me-1"></i>
                            Event Name
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.name && errors.name}
                            placeholder="Enter event name"
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.name}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <i className="bi bi-tag me-1"></i>
                            Category
                          </Form.Label>
                          <Form.Select
                            name="category_id"
                            value={values.category_id}
                            onChange={(e) => {
                              console.log("Category selected:", e.target.value);
                              handleChange(e);
                            }}
                            onBlur={handleBlur}
                            isInvalid={touched.category_id && errors.category_id}
                          >
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {errors.category_id}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-card-text me-1"></i>
                        Description
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        value={values.description || ""}
                        onChange={(e) => {
                          console.log("Description changed:", e.target.value);
                          handleChange(e);
                        }}
                        onBlur={handleBlur}
                        isInvalid={touched.description && errors.description}
                        placeholder="Provide event details and description"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.description}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Card.Body>
                </Card>

                <Card className="mb-4 shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">Event Details</h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <i className="bi bi-calendar-event me-1"></i>
                            Date and Time
                          </Form.Label>
                          <Form.Control
                            type="datetime-local"
                            name="event_date"
                            value={values.event_date}
                            onChange={(e) => {
                              const value = e.target.value;
                              console.log("Date changed:", value);
                              // Validate date format before setting
                              if (value && !isNaN(new Date(value).getTime())) {
                                handleChange(e);
                              } else {
                                console.warn("Invalid date format detected");
                              }
                            }}
                            onBlur={handleBlur}
                            isInvalid={touched.event_date && errors.event_date}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.event_date}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <i className="bi bi-geo-alt me-1"></i>
                            Venue
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="venue"
                            value={values.venue}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.venue && errors.venue}
                            placeholder="Enter event location"
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.venue}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <i className="bi bi-currency-dollar me-1"></i>
                            Price
                          </Form.Label>
                          <InputGroup hasValidation>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control
                              type="number"
                              step="0.01"
                              min="0"
                              name="price"
                              value={values.price}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.price && errors.price}
                              placeholder="0.00"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.price}
                            </Form.Control.Feedback>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <i className="bi bi-tags me-1"></i>
                            Tags (comma separated)
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="tags"
                            value={values.tags}
                            onChange={handleChange}
                            placeholder="e.g. music, outdoor, family"
                          />
                          <Form.Text className="text-muted">
                            Enter keywords to help users find this event
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Card className="shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">
                      <i className="bi bi-image me-1"></i>
                      Event Image
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group>
                      <Form.Control
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setFieldValue)}
                        className="mb-2"
                      />
                      <Form.Text className="text-muted">
                        {editingEvent?.image_url && !selectedFile && (
                          <>
                            Current image will be kept unless you select a new one.
                          </>
                        )}
                      </Form.Text>
                      {editingEvent?.image_url && !selectedFile && (
                        <div className="mt-3 text-center">
                          <img
                            src={editingEvent.image_url}
                            alt="Current Event"
                            style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "cover" }}
                            className="border rounded shadow-sm"
                          />
                        </div>
                      )}
                      {selectedFile && (
                        <div className="mt-2">
                          <Badge bg="success">
                            <i className="bi bi-check-circle me-1"></i>
                            Selected: {selectedFile.name}
                          </Badge>
                        </div>
                      )}
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Modal.Body>

              <Modal.Footer className="bg-light">
                <Button variant="outline-secondary" onClick={handleCloseEventModal}>
                  <i className="bi bi-x-circle me-1"></i>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : editingEvent ? (
                    <>
                      <i className="bi bi-check-circle me-1"></i>
                      Update Event
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-1"></i>
                      Create Event
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Formik>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Confirm Deletion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {eventToDelete && (
            <p>
              Are you sure you want to delete the event <strong>"{eventToDelete.name}"</strong>?
              <br />
              This action cannot be undone.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            <i className="bi bi-trash me-1"></i>
            Delete Event
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bookings Modal */}
      <Modal
        show={showBookingsModal}
        onHide={() => {
          setShowBookingsModal(false);
          setEventBookings([]);
          setError("");
          setSelectedEvent(null);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="bi bi-people me-2"></i>
            Bookings for {selectedEvent?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError("")}>
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert variant="success" dismissible onClose={() => setSuccessMessage("")}>
                {successMessage}
              </Alert>
            )}

            {bookingsLoading ? (
              <div className="text-center py-5">
                <span className="spinner-border text-primary" role="status"></span>
                <p className="mt-2">Loading bookings...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <div className="mb-3 p-3 bg-light rounded">
                  <h5 className="mb-2">{selectedEvent?.name}</h5>
                  <div className="d-flex justify-content-between small text-muted">
                    <div><i className="bi bi-calendar-event me-1"></i>{formatDate(selectedEvent?.event_date)}</div>
                    <div><i className="bi bi-ticket-perforated me-1"></i>Total Bookings: <Badge bg="info">{eventBookings?.length || 0}</Badge></div>
                  </div>
                </div>
                <Table hover className="align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th>User</th>
                      <th>Tickets</th>
                      <th>Date Booked</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {error ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          <i className="bi bi-exclamation-triangle text-danger fs-1 d-block mb-2"></i>
                          {error}
                        </td>
                      </tr>
                    ) : eventBookings && eventBookings.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          <i className="bi bi-calendar-x text-muted fs-1 d-block mb-2"></i>
                          No bookings found for this event
                        </td>
                      </tr>
                    ) : Array.isArray(eventBookings) ? (
                      eventBookings.map(booking => (
                        <tr key={booking.id}>
                          <td>
                            <div>
                              <strong>{booking.user?.name || "Anonymous"}</strong>
                              <div className="small text-muted">{booking.user?.email || "No email"}</div>
                              {booking.user?.phone && (
                                <div className="small text-muted">
                                  <i className="bi bi-telephone me-1"></i>{booking.user?.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-center">
                            <Badge bg="info">
                              {booking.quantity || 1}
                            </Badge>
                          </td>
                          <td>
                            {formatDate(booking.created_at)}
                          </td>
                          <td>
                            {formatBookingStatus(booking.status)}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              {booking.status === "confirmed" && (
                                <Button size="sm" variant="outline-danger">
                                  <i className="bi bi-x-circle me-1"></i>
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        <i className="bi bi-bug text-warning fs-1 d-block mb-2"></i>
                        Invalid booking data format
                      </td>
                    </tr>
                  )}
                  </tbody>
                </Table>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => window.print()} className="me-2">
              <i className="bi bi-printer me-1"></i>
              Print Bookings
            </Button>
            <Button variant="secondary" onClick={() => {
              setShowBookingsModal(false);
              setEventBookings([]);
              setError("");
              setSelectedEvent(null);
            }}>
              <i className="bi bi-x-circle me-1"></i>
              Close
            </Button>
          </Modal.Footer>
      </Modal>
    </Container>
  );
};

// Helper function to format dates consistently
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default AdminEvents;