import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import './styles/Dashboard.css';

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
};

const AdminUsers = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userService.getAllUsers();
      // Check if response is an array or has a users property
      const usersList = Array.isArray(response) ? response : response.users || [];
      setUsers(usersList);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Manage Users</h2>
        <div>
          <span className="badge bg-primary me-2">Admin</span>
          <span>{currentUser?.name || 'Administrator'}</span>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Users</h4>
          <Form.Group as={Row} className="mb-0">
            <Col xs="auto">
              <Form.Control
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </Col>
          </Form.Group>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people fs-1 text-muted"></i>
              <p className="mt-3">No users found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td>{formatDate(user.created_at || user.CreateAt)}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <i className="bi bi-eye me-1"></i> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* User Details Modal */}
      <Modal show={showUserModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <p className="mb-1"><strong>ID:</strong></p>
                  <p>{selectedUser.id}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Role:</strong></p>
                  <Badge bg={selectedUser.role === 'admin' ? 'danger' : 'primary'}>
                    {selectedUser.role}
                  </Badge>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <p className="mb-1"><strong>Name:</strong></p>
                  <p>{selectedUser.name}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Email:</strong></p>
                  <p>{selectedUser.email}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <p className="mb-1"><strong>Created At:</strong></p>
                  <p>{formatDate(selectedUser.created_at || selectedUser.CreateAt)}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Updated At:</strong></p>
                  <p>{formatDate(selectedUser.updated_at || selectedUser.UpdatedAt)}</p>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminUsers;