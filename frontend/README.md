# Mawid Frontend

## Overview

Mawid is a comprehensive event booking and management platform built with modern web technologies. The frontend provides an intuitive interface for users to browse events, make bookings, and manage their profiles, while administrators can manage events, bookings, and users.

## Tech Stack

- **React**: A JavaScript library for building user interfaces
- **React Router**: For navigation and routing
- **React Bootstrap**: UI component library based on Bootstrap
- **Formik**: Form handling with validation
- **Yup**: Schema validation for forms
- **Axios**: Promise-based HTTP client for API requests
- **JWT**: JSON Web Token for secure authentication

## Features

### User Features

- **Authentication**
  - Register with name, email, and password
  - Login with email and password
  - Automatic token refresh for persistent sessions

- **Event Discovery**
  - Browse all events with pagination
  - Search events by keyword
  - Filter events by category
  - View detailed event information

- **Booking Management**
  - Book events with one-click process
  - View booking history
  - Cancel bookings

- **User Profile**
  - View and edit profile information
  - Change password
  - View booking history

### Admin Features

- **Event Management**
  - Create, edit, and delete events
  - Upload event images
  - Assign categories to events
  - Add tags to events for better discoverability

- **Booking Management**
  - View all bookings
  - Confirm or cancel bookings
  - Filter bookings by status

- **User Management**
  - View all registered users
  - Edit user information
  - Change user roles

## Project Structure

The frontend follows a modular structure for better maintainability:

```
/src
  /components     # Reusable UI components
  /context        # React context for state management
  /pages          # Page components
  /services       # API services
  /utils          # Utility functions
  /assets         # Static assets like images
```

## Environment Variables

The application uses the following environment variables:

- `REACT_APP_API_URL`: https://mawid-production.up.railway.app/api/v1

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the necessary environment variables
4. Start the development server:
   ```
   npm start
   ```

### Building for Production

```
npm run build
```

This creates an optimized production build in the `build` folder.

## Deployment

[Front End] (https://mawid.netlify.app/)
