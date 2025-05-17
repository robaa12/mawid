import React from 'react';
import { Pagination as BootstrapPagination } from 'react-bootstrap';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Don't render if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Calculate range of pages to show
  const getPageNumbers = () => {
    const delta = 2; // How many pages to show before and after current page
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <BootstrapPagination className="justify-content-center mt-4">
      <BootstrapPagination.First
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      />
      <BootstrapPagination.Prev
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />

      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <BootstrapPagination.Ellipsis key={`ellipsis-${index}`} disabled />
        ) : (
          <BootstrapPagination.Item
            key={page}
            active={page === currentPage}
            onClick={() => onPageChange(page)}
          >
            {page}
          </BootstrapPagination.Item>
        )
      ))}

      <BootstrapPagination.Next
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
      <BootstrapPagination.Last
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    </BootstrapPagination>
  );
};

export default Pagination;