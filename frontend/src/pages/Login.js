import React, { useState } from "react";
import { Form, Button, Container, Card, Alert } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirectUrl from location state (if coming from protected route)
  const from = location.state?.from || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simple validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setError("");
      setLoading(true);
      console.log("Attempting login with:", { email, password: "********" });

      const loginResponse = await login({ email, password });
      console.log("Login successful:", loginResponse);

      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login component error:", err);
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={6}>
          <Card className="shadow-sm">
            <Card.Header as="h4" className="text-center bg-primary text-white">
              Login to Mawid
            </Card.Header>
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="mt-3"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Login"}
                  </Button>
                </div>
              </Form>

              <div className="text-center mt-4">
                <p>
                  Don't have an account?{" "}
                  <Link to="/register">Register here</Link>
                </p>
                <p className="small text-muted mt-3">
                  <strong>Admin:</strong> admin@mawid.com / admin123
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

// Define Row and Col components since they aren't imported
const Row = ({ children, className }) => (
  <div className={`row ${className || ""}`}>{children}</div>
);

const Col = ({ children, xs, md, className }) => {
  const classes = [
    "col",
    xs ? `col-${xs}` : "",
    md ? `col-md-${md}` : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
};

export default Login;
