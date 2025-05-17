# Mawid - Event Booking Platform

Mawid (مَوعِد) is a comprehensive event booking platform that allows users to discover, manage, and book tickets for various events.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Security](#security)
- [Database Schema](#database-schema)

## Overview

Mawid backend is built with Go and uses PostgreSQL for data storage. The application provides a RESTful API for the frontend client to interact with.

## Features

- User authentication and authorization
- Event creation, management, and discovery
- Category management
- Event booking and ticket management
- Admin dashboard with user and event management
- Image upload and storage integration

## Getting Started

### Prerequisites

- Go 1.18 or higher
- PostgreSQL 12 or higher
- Docker (optional)

### Installation

1. Clone the repository
```
git clone https://github.com/robaa12/mawid.git
cd mawid/backend
```

2. Configure environment variables
```
cp cmd/server/.env.example cmd/server/.env
```
Edit the `.env` file with your configuration.

3. Run the server
```
go run cmd/server/main.go
```

Or with Docker:
```
docker-compose up -d
```

## API Documentation

### Authentication

#### Register a new user
```
POST /api/v1/auth/register
```
Request body:
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```
Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com",
      "role": "user"
    },
    "expires_at": 1620000000,
    "token_type": "Bearer"
  }
}
```

#### Login
```
POST /api/v1/auth/login
```
Request body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com",
      "role": "user"
    },
    "expires_at": 1620000000,
    "token_type": "Bearer"
  }
}
```

#### Get User Profile
```
GET /api/v1/auth/profile
```
Headers:
```
Authorization: Bearer JWT_TOKEN
```
Response:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Events

#### Get All Events
```
GET /api/v1/events?page=1&page_size=10&category_id=1
```
Response:
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": {
    "events": [
      {
        "id": 1,
        "name": "Sample Event",
        "description": "Event description",
        "category": {
          "id": 1,
          "name": "Conference"
        },
        "event_date": "2023-07-15T14:00:00Z",
        "venue": "Event Venue",
        "price": 99.99,
        "image_url": "https://example.com/image.jpg",
        "tags": [
          {
            "id": 1,
            "name": "tech"
          }
        ]
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 10,
    "total_pages": 1
  }
}
```

#### Get Event by ID
```
GET /api/v1/events/:id
```
Response:
```json
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "id": 1,
    "name": "Sample Event",
    "description": "Event description",
    "category": {
      "id": 1,
      "name": "Conference"
    },
    "event_date": "2023-07-15T14:00:00Z",
    "venue": "Event Venue",
    "price": 99.99,
    "image_url": "https://example.com/image.jpg",
    "tags": [
      {
        "id": 1,
        "name": "tech"
      }
    ]
  }
}
```

#### Search Events
```
GET /api/v1/events/search?q=conference&page=1&page_size=10
```
Response: Same format as Get All Events

#### Create Event (Admin only)
```
POST /api/v1/events
```
Headers:
```
Authorization: Bearer JWT_TOKEN
Content-Type: multipart/form-data
```
Form data:
```
name: "Sample Event"
description: "Event description"
category_id: 1
event_date: "2023-07-15T14:00:00Z"
venue: "Event Venue"
price: 99.99
tags: "tech,conference"
image: (file upload)
```
Response:
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": 1,
    "name": "Sample Event",
    "description": "Event description",
    "category": {
      "id": 1,
      "name": "Conference"
    },
    "event_date": "2023-07-15T14:00:00Z",
    "venue": "Event Venue",
    "price": 99.99,
    "image_url": "https://example.com/image.jpg",
    "tags": [
      {
        "id": 1,
        "name": "tech"
      }
    ]
  }
}
```

#### Update Event (Admin only)
```
PUT /api/v1/events/:id
```
Request: Same as Create Event
Response: Same as Create Event

#### Delete Event (Admin only)
```
DELETE /api/v1/events/:id
```
Response:
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### Categories

#### Get All Categories
```
GET /api/v1/events/categories
```
Response:
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Conference"
    },
    {
      "id": 2,
      "name": "Workshop"
    }
  ]
}
```

#### Create Category (Admin only)
```
POST /api/v1/events/categories
```
Request body:
```json
{
  "name": "Conference"
}
```
Response:
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 1,
    "name": "Conference"
  }
}
```

### Bookings

#### Create Booking
```
POST /api/v1/bookings
```
Headers:
```
Authorization: Bearer JWT_TOKEN
```
Request body:
```json
{
  "event_id": 1
}
```
Response:
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "event_id": 1,
    "booking_date": "2023-05-10T15:30:45Z",
    "status": "confirmed"
  }
}
```

#### Get User Bookings
```
GET /api/v1/bookings?page=1&page_size=10
```
Headers:
```
Authorization: Bearer JWT_TOKEN
```
Response:
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": 1,
        "user_id": 1,
        "event_id": 1,
        "booking_date": "2023-05-10T15:30:45Z",
        "status": "confirmed",
        "event": {
          "id": 1,
          "name": "Sample Event",
          "venue": "Event Venue",
          "image_url": "https://example.com/image.jpg"
        }
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 10,
    "total_pages": 1
  }
}
```

#### Check Event Booking Status
```
GET /api/v1/bookings/event/:eventId
```
Headers:
```
Authorization: Bearer JWT_TOKEN
```
Response:
```json
{
  "success": true,
  "message": "Booking check completed",
  "data": {
    "has_booking": true,
    "booking": {
      "id": 1,
      "user_id": 1,
      "event_id": 1,
      "booking_date": "2023-05-10T15:30:45Z",
      "status": "confirmed"
    }
  }
}
```

#### Update Booking Status
```
PUT /api/v1/bookings/:id/status
```
Headers:
```
Authorization: Bearer JWT_TOKEN
```
Request body:
```json
{
  "status": "cancelled"
}
```
Response:
```json
{
  "success": true,
  "message": "Booking status updated successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "event_id": 1,
    "booking_date": "2023-05-10T15:30:45Z",
    "status": "cancelled"
  }
}
```

## Architecture

The backend follows a clean architecture pattern with the following components:

1. **API Layer**: Handles HTTP requests and responses
2. **Service Layer**: Implements business logic 
3. **Repository Layer**: Manages data access and persistence
4. **Model Layer**: Defines data structures

## Security

- JWT-based authentication
- Role-based authorization
- Password hashing with bcrypt
- Rate limiting for API endpoints
- CORS protection
- Input validation and sanitization

## Database Schema

The application uses the following main entities:

- **Users**: Manages user accounts and authentication
- **Events**: Stores event information
- **Categories**: Organizes events into categories
- **Tags**: Provides additional event classification
- **Bookings**: Tracks user event bookings