# Mawid - Event Management & Booking Platform

## Overview

Mawid is a full-stack event management and booking platform that enables users to discover, book, and manage events. The platform provides a user-friendly interface for attendees and a powerful administrative dashboard for event organizers and system administrators.

[Live Demo - Frontend](https://mawid.netlify.app/)
[Live Demo - Backend API](https://mawid-production.up.railway.app/api/v1/events)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)

## Features

### User Features

- **Authentication & Authorization**
  - Register with email and password
  - Login with secure JWT authentication
  - Password requirements validation
  - Role-based access control

- **Event Discovery**
  - Browse events with pagination
  - Search events by keyword
  - Filter events by category
  - View detailed event information

- **Booking Management**
  - One-click event booking
  - View booking history and status
  - Cancel bookings

- **User Profile**
  - View and edit profile details
  - Track booking history

### Admin Features

- **Event Management**
  - Create, edit, and delete events
  - Upload and manage event images (via Supabase storage)
  - Categorize events
  - Add event tags

- **User Management**
  - View all registered users
  - Manage user roles and permissions

- **Booking Administration**
  - View all bookings across the platform
  - Confirm or reject booking requests
  - View booking statistics

## Tech Stack

### Frontend
- **React**: UI library
- **React Router**: Navigation and routing
- **React Bootstrap**: UI component framework
- **Formik & Yup**: Form management and validation
- **Axios**: HTTP client for API requests
- **JWT**: Authentication handling

### Backend
- **Go (Golang)**: Backend language
- **Gin**: Web framework
- **GORM**: ORM for database interactions
- **PostgreSQL**: Primary database
- **JWT**: Secure authentication
- **Supabase**: Storage for images and file uploads
- **In-Memory Caching**: For improved performance
- **Go Modules**: Dependency management

### Infrastructure
- **Render**: Backend hosting
- **Netlify**: Frontend hosting
- **Neon**: PostgreSQL database hosting

## Project Structure

```
/Mawid
├── backend/             # Go backend API
│   ├── cmd/             # Application entry points
│   ├── config/          # Configuration management
│   ├── db/              # Database connections and migrations
│   ├── internal/        # Private application code
│   ├── pkg/             # Shared packages
│   │   ├── api/         # API handlers and routes
│   │   ├── models/      # Data models
│   │   └── services/    # Business logic
│   ├── go.mod           # Go dependencies
│   └── Dockerfile       # Backend container definition
│
├── frontend/            # React frontend application
│   ├── public/          # Static files
│   ├── src/             # React source code
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React context providers
│   │   ├── pages/       # Page components
│   │   └── services/    # API service clients
│   ├── package.json     # JavaScript dependencies
│   └── Dockerfile       # Frontend container definition
│
└── README.md            # Project documentation
```

## Getting Started

### Prerequisites

- Go 1.20 or later
- Node.js 14.x or later
- PostgreSQL 14.x or later

### Local Development

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/robaa12/mawid.git
   cd mawid/backend
   ```

2. Install Go dependencies:
   ```bash
   go mod download
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the backend server:
   ```bash
   go run cmd/server/main.go
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.development.example .env.development
   ```

4. Start the frontend development server:
   ```bash
   npm start
   ```

This will start the frontend, backend, and database services.

## Configuration

### Backend Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Database connection details (alternative to DATABASE_URL)
- `DB_SSL_MODE`: SSL mode for database connection
- `JWT_SECRET`: Secret key for JWT tokens
- `SERVER_PORT`: Port for the backend server
- `ADMIN_EMAIL`: Default admin user email
- `SUPABASE_URL`: Supabase project URL for storage
- `SUPABASE_KEY`: Supabase API key
- `SUPABASE_BUCKET`: Supabase storage bucket name
- `SUPABASE_PUBLIC_URL`: Public URL for Supabase storage
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes

### Frontend Environment Variables

- `REACT_APP_API_URL`: URL of the backend API(https://mawid-production.up.railway.app/api/v1)

## Deployment

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `go build -o server ./cmd/server/main.go`
4. Set start command: `./server`
5. Add all required environment variables

### Frontend Deployment (Netlify)

1. Create a new site on Netlify
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add REACT_APP_API_URL environment variable pointing to your deployed backend

### Database (Neon)

1. Create a PostgreSQL database on Neon
2. Use the provided connection string in your backend's DATABASE_URL environment variable

## API Documentation

The API is organized around RESTful principles:

- Authentication: `/api/v1/auth/*`
- Events: `/api/v1/events/*`
- Bookings: `/api/v1/bookings/*`
- Users: `/api/v1/users/*`

For detailed API documentation, refer to the [Postman Documentation](https://documenter.getpostman.com/view/44767514/2sB2qWHjD5).

## Key Features and Architecture

### Backend Architecture

The Mawid backend follows a clean, layered architecture designed for scalability, maintainability, and testability:

1. **API Layer** (`pkg/api`) - Handles HTTP requests/responses using Gin framework
2. **Service Layer** (`pkg/services`) - Implements core business logic
3. **Repository Layer** (`pkg/repository`) - Provides data access abstraction using GORM
4. **Model Layer** (`pkg/models`) - Defines domain entities and data structures
5. **Utility Layer** (`internal/utils`) - Provides shared functionality

### Performance Optimizations

- **In-Memory Caching**: Reduces database load and improves response times
- **Strategic Database Indexing**: Optimizes query performance for common operations
- **Pagination**: All list endpoints support pagination for efficient data retrieval
- **Background Processing**: Non-critical operations are offloaded to background goroutines
