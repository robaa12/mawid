import React from 'react';

const FullWidthContainer = ({ children, className = '' }) => {
  return (
    <div className={`full-width-container ${className}`} style={{
      width: '100vw',
      position: 'relative',
      left: '50%',
      right: '50%',
      marginLeft: '-50vw',
      marginRight: '-50vw',
      padding: 0,
      overflow: 'hidden'
    }}>
      {children}
    </div>
  );
};

export default FullWidthContainer;