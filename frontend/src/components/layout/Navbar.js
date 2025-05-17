import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Navbar as BootstrapNavbar,
  Nav,
  Container,
  Button,
  Form,
  FormControl,
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <BootstrapNavbar
      className={`custom-navbar ${scrolled ? "scrolled" : ""}`}
      variant="dark"
      expand="lg"
      sticky="top"
    >
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" className="navbar-brand">
          <span className="brand-logo">مَوعِد</span>
          <span className="brand-name">Mawid</span>
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link
              as={Link}
              to="/"
              className={isActive("/") ? "active" : ""}
            >
              Home
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/events"
              className={isActive("/events") ? "active" : ""}
            >
              Events
            </Nav.Link>
            {isAuthenticated && (
              <Nav.Link
                as={Link}
                to="/bookings"
                className={isActive("/bookings") ? "active" : ""}
              >
                My Bookings
              </Nav.Link>
            )}
            {isAdmin && (
              <Nav.Link
                as={Link}
                to="/admin"
                className={
                  location.pathname.startsWith("/admin") ? "active" : ""
                }
              >
                Admin
              </Nav.Link>
            )}
          </Nav>

          <Form
            className="d-flex search-form mx-lg-auto"
            onSubmit={handleSearch}
          >
            <FormControl
              type="search"
              placeholder="Search events..."
              className="search-input"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="outline-light"
              type="submit"
              className="search-button"
            >
              <i className="bi bi-search"></i>
            </Button>
          </Form>

          <Nav className="ms-auto">
            {isAuthenticated ? (
              <div className="user-menu">
                <Link to="/profile" className="nav-link">
                  <div className="d-flex align-items-center">
                    <div className="user-avatar">
                      <i className="bi bi-person"></i>
                    </div>
                    <span>{currentUser?.name || "Profile"}</span>
                  </div>
                </Link>
                <Button
                  variant="outline-light"
                  onClick={logout}
                  className="logout-button ms-2"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="d-flex flex-column flex-lg-row">
                <Button
                  as={Link}
                  to="/login"
                  variant="outline-light"
                  className="auth-button login-button"
                >
                  Login
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  variant="light"
                  className="auth-button register-button"
                >
                  Register
                </Button>
              </div>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
