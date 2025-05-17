import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer footer-sticky">
      <div className="container text-center">
        <p className="copyright">
          &copy; {new Date().getFullYear()} Mawid (مَوعِد) - Event Booking Platform
        </p>
        <p className="tagline">
          Built with <i className="bi bi-heart-fill heart-icon"></i> for connecting people to events
        </p>
      </div>
    </footer>
  );
};

export default Footer;