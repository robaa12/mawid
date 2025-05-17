import React, { useState, useEffect } from "react";
import { Row, Col, Container, Alert, Form } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import EventCard from "../components/shared/EventCard";
import Pagination from "../components/shared/Pagination";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import eventService from "../services/eventService";


/**
 * Events component responsible for displaying the events listing page with 
 * search, filtering, and pagination functionality.
 * Uses server-side pagination for better performance with large datasets.
 */
const Events = () => {
  // State management
  const [events, setEvents] = useState([]); // All events for current page
  const [filteredEvents, setFilteredEvents] = useState([]); // Events after filtering
  const [categories, setCategories] = useState([]); // Available categories for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  // Get search query from URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get("search");
  const categoryParam = searchParams.get("category");

  // Load categories and initialize selected category from URL parameter
  useEffect(() => {
    fetchCategories();
    
    // Set selected category from URL parameter if available
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  // Load events when page, search query, or category changes
  useEffect(() => {
    if (searchQuery) {
      // Handle search query
      searchEvents(searchQuery, currentPage);
    } else if (selectedCategory) {
      // Handle category filtering
      fetchEventsWithCategory(selectedCategory, currentPage);
    } else {
      // Regular events with no filters
      fetchEvents(currentPage);
    }
  }, [currentPage, searchQuery, selectedCategory]);

  /**
   * Fetches events for a specific page using server-side pagination
   * @param {number} page - The page number to fetch
   */
  const fetchEvents = async (page) => {
    setLoading(true);
    setError(null);
    try {
      // Use standard page size (10) and request the specific page
      const pageSize = 10;
      
      const response = await eventService.getAllEvents(page, pageSize);
      console.log("Events API response:", response); // Debugging

      if (response && response.data && response.data.events) {
        const fetchedEvents = response.data.events;
        
        // Set the events for the current page
        setEvents(fetchedEvents);
        setFilteredEvents(fetchedEvents);
        
        // Set total pages from API response
        setTotalPages(response.data.total_pages || 1);
      } else {
        console.error("Unexpected API response format:", response);
        setEvents([]);
        setFilteredEvents([]);
        setError("Unexpected data format received from server");
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError("Failed to load events. Please try again later.");
      setEvents([]);
      setFilteredEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const searchEvents = async (query, page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await eventService.searchEvents(query, page);
      console.log("Search API response:", response); // Debugging

      if (response && response.data && response.data.events) {
        setEvents(response.data.events);
        setFilteredEvents(response.data.events); // Update filteredEvents with search results
        setTotalPages(response.data.total_pages || 1);
      } else {
        console.error("Unexpected search response format:", response);
        setEvents([]);
        setFilteredEvents([]); // Also update filteredEvents
        setError("Unexpected data format received from search");
      }
    } catch (err) {
      console.error("Failed to search events:", err);
      setError("Failed to search events. Please try again later.");
      setEvents([]); // Reset to empty array on error
      setFilteredEvents([]); // Also reset filteredEvents on error
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log("Fetching categories...");
      const response = await eventService.getCategories();
      console.log("Categories response:", response);

      // Add defensive handling for various response formats
      let categoriesData = [];

      if (response && response.data) {
        if (Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (typeof response.data === "object") {
          // Try to extract categories from other response formats
          const possibleArrays = Object.values(response.data).filter((val) =>
            Array.isArray(val),
          );

          if (possibleArrays.length > 0) {
            // Use the first array found in the response
            categoriesData = possibleArrays[0];
          }
        }
      }

      console.log("Processed categories data:", categoriesData);
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setCategories([]);
    }
  };

  /**
   * Handles page change in pagination
   * Triggers appropriate data fetch based on current filters (search/category)
   * @param {number} page - The page number to navigate to
   */
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
    // The data will be fetched by the useEffect hook that depends on currentPage
  };

  /**
   * Fetches events filtered by category using server-side filtering and pagination
   * @param {string|number} categoryId - ID of the category to filter by
   * @param {number} page - The page number to fetch
   */
  const fetchEventsWithCategory = async (categoryId, page) => {
    setLoading(true);
    setError(null);
    try {
      const pageSize = 10;
      
      // Pass the categoryId parameter directly
      const response = await eventService.getAllEvents(page, pageSize, categoryId);
      console.log("Category filtered events response:", response);

      if (response && response.data && response.data.events) {
        const eventsData = response.data.events;
        
        // Update both events and filteredEvents to keep state consistent
        setEvents(eventsData);
        setFilteredEvents(eventsData);
        setTotalPages(response.data.total_pages || 1);
      } else {
        setEvents([]);
        setFilteredEvents([]);
        setError("Unexpected data format received from server for category filter");
      }
    } catch (err) {
      console.error("Failed to fetch events with category filter:", err);
      setError("Failed to load events for this category. Please try again later.");
      setEvents([]);
      setFilteredEvents([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles category selection change
   * Updates URL and triggers appropriate data fetching
   * @param {Object} e - Event object from the select input change
   */
  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to first page when changing category
    
    // Update URL with category parameter or remove it if not selected
    const newUrl = new URL(window.location);
    if (categoryId) {
      newUrl.searchParams.set('category', categoryId);
    } else {
      newUrl.searchParams.delete('category');
    }
    navigate(`${location.pathname}?${newUrl.searchParams.toString()}`, { replace: true });
    // The data will be fetched by the useEffect hook that depends on selectedCategory
  };

  if (loading) {
    return <LoadingSpinner text="Loading events..." />;
  }

  const displayEvents = filteredEvents;
  return (
    <Container className="py-4 page-transition">
      <h1 className="text-center mb-4">
        {searchQuery
          ? `Search Results for "${searchQuery}"`
          : "Browse Events"}
      </h1>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="mb-4">
        <Row>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Filter by Category</Form.Label>
              <Form.Select
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                <option value="">All Categories</option>
                {Array.isArray(categories) && categories.length > 0 ? (
                  categories.map((category) => (
                    <option
                      key={category.id || `cat-${Math.random()}`}
                      value={category.id}
                    >
                      {category.name || "Unnamed category"}
                    </option>
                  ))
                ) : (
                  <option disabled>No categories available</option>
                )}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </div>

      {Array.isArray(displayEvents) && displayEvents.length > 0 ? (
        <>
          <Row>
            {displayEvents.map((event, index) => (
              <Col
                key={event.id || `event-${index}`}
                xs={12}
                md={6}
                lg={4}
                className="mb-4"
              >
                <EventCard event={event} />
              </Col>
            ))}
          </Row>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <Alert variant="info">
          {searchQuery
            ? `No events found for "${searchQuery}". Try a different search term.`
            : selectedCategory
            ? "No events found in this category. Try selecting a different category."
            : "No events available at this time. Please check back later."}
        </Alert>
      )}
    </Container>
  );
};

export default Events;