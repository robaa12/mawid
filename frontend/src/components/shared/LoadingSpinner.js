import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center my-5 py-5">
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      <p className="mt-3 text-muted">{text}</p>
    </div>
  );
};

export default LoadingSpinner;