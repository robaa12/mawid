import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import eventService from '../../services/eventService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Pagination from '../../components/shared/Pagination';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchCategories();
  }, [currentPage]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await eventService.getCategories();
      console.log("Fetch categories response:", response);
      
      // Handle different response structures
      let categoriesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          categoriesData = response.data.categories;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (typeof response.data === "object") {
          // Try to extract categories from other response formats
          const possibleArrays = Object.values(response.data).filter(val => 
            Array.isArray(val)
          );
          
          if (possibleArrays.length > 0) {
            // Use the first array found in the response
            categoriesData = possibleArrays[0];
          }
        }
      }
      
      console.log("Processed categories:", categoriesData);
      
      // Filter out any invalid entries
      categoriesData = categoriesData.filter(cat => cat && cat.id && cat.name);
      
      // Sort categories by name in ascending order
      const sortedCategories = [...categoriesData].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setCategories(sortedCategories);
      
      // Calculate total pages for pagination
      setTotalPages(Math.ceil(sortedCategories.length / pageSize));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("Failed to load categories. Please try again later.");
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      await eventService.deleteCategory(categoryToDelete.id);
      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      setSuccessMessage(`Category "${categoryToDelete.name}" has been deleted.`);
    } catch (err) {
      setError(`Failed to delete category: ${err.response?.data?.message || err.message}`);
    } finally {
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }
    
    console.log("Submitting category:", categoryName);
    
    try {
      let response;
      
      if (editingCategory) {
        response = await eventService.updateCategory(editingCategory.id, { name: categoryName });
        console.log("Update category response:", response);
        
        // Handle different response structures for the returned data
        let updatedCategory;
        if (response.data && response.data.success && response.data.data) {
          updatedCategory = response.data.data;
        } else if (response.data) {
          updatedCategory = response.data;
        } else {
          // If no valid data in response, create a category object with updated name
          updatedCategory = { ...editingCategory, name: categoryName };
        }
        
        setSuccessMessage(`Category "${categoryName}" has been updated.`);
        
        // Update category in the list
        setCategories(categories.map(c => c.id === editingCategory.id ? updatedCategory : c));
      } else {
        response = await eventService.createCategory({ name: categoryName });
        console.log("Create category response:", response);
        
        // Handle different response structures
        let categoryData = response.data;
        if (response.data && response.data.category) {
          categoryData = response.data.category;
        }
        
        setSuccessMessage(`Category "${categoryName}" has been created.`);
        
        // Add new category to the list and refresh to ensure proper rendering
        await fetchCategories();
      }
      
      handleCloseCategoryModal();
    } catch (err) {
      console.error("Error submitting form:", err);
      setError(`Failed to ${editingCategory ? 'update' : 'create'} category: ${err.response?.data?.message || err.message}`);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Get current categories for the current page
  const indexOfLastCategory = currentPage * pageSize;
  const indexOfFirstCategory = indexOfLastCategory - pageSize;
  const currentCategories = categories.slice(indexOfFirstCategory, indexOfLastCategory);

  if (loading) {
    return <LoadingSpinner text="Loading categories..." />;
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Manage Categories</h2>
        <Button variant="primary" onClick={handleAddCategory}>
          <i className="bi bi-plus-circle me-1"></i> Add New Category
        </Button>
      </div>
      
      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Card className="shadow-sm">
        <Card.Body>
          {categories.length > 0 ? (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th style={{ width: '70%' }}>Name</th>
                    <th style={{ width: '30%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCategories.map(category => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          className="me-2"
                          onClick={() => handleEditCategory(category)}
                        >
                          <i className="bi bi-pencil"></i> Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDeleteClick(category)}
                        >
                          <i className="bi bi-trash"></i> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info">No categories found. Create your first category!</Alert>
          )}
          
          {categories.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </Card.Body>
      </Card>
      
      {/* Category Form Modal */}
      <Modal show={showCategoryModal} onHide={handleCloseCategoryModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCategory ? 'Edit Category' : 'Add New Category'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Category Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseCategoryModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the category "{categoryToDelete?.name}"?</p>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Warning: Deleting a category may affect events that use this category.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete Category
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Categories;