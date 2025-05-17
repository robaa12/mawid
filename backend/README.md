Mawid Backend - Technical Documentation

Live-Link for the backend :- [Backend Deployment](mawid-production.up.railway.app)

## Table of Contents
1. [Code Architecture](#code-architecture)
2. [Database Caching](#database-caching)
3. [Database Indexing](#database-indexing)
4. [Golang Best Practices](#golang-best-practices)
5. [API Doc](#api-documentation)

## Code Architecture

The Mawid backend follows a clean, layered architecture designed for scalability, maintainability, and testability. The architecture is inspired by Domain-Driven Design (DDD) principles and follows the dependency injection pattern.

### Layers

1. **API Layer** (`pkg/api`)
   - Handles HTTP requests and responses
   - Implements middleware for authentication, authorization, rate limiting, and security
   - Uses the Gin framework for routing and request handling
   - Completely decoupled from business logic

2. **Service Layer** (`pkg/services`)
   - Implements core business logic
   - Orchestrates data flow between repositories
   - Enforces business rules and validation
   - Handles cross-cutting concerns like caching

3. **Repository Layer** (`pkg/repository`)
   - Provides data access abstraction
   - Implements database operations using GORM
   - Isolates the rest of the application from data storage details
   - Allows for easy switching of data sources

4. **Model Layer** (`pkg/models`)
   - Defines domain entities and data structures
   - Implements entity-specific business rules
   - Uses GORM tags for database mapping

5. **Utility Layer** (`internal/utils`)
   - Provides shared functionality like caching, JWT handling, etc.
   - Implements cross-cutting concerns

### Key Design Patterns

1. **Dependency Injection**
   - Services receive repositories as constructor parameters
   - Handlers receive services as constructor parameters
   - Makes testing easier through mock injection
   - Example:
   ```go
   // Repository creation
   userRepo := repository.NewUserRepository(database)

   // Service creation with injected repository
   authService := services.NewAuthService(userRepo, cfg)

   // Handler creation with injected service
   authHandler := handlers.NewAuthHandler(authService)
   ```

2. **Repository Pattern**
   - Each entity has its own repository
   - Example:
   ```go
   func (r *EventRepository) GetEventByID(id uint) (*models.Event, error) {
       var event models.Event
       if err := r.DB.Preload("Category").Preload("Tags").First(&event, id).Error; err != nil {
           return nil, err
       }
       return &event, nil
   }
   ```

3. **Middleware Chain**
   - Middleware functions are chained for route protection
   - Allows for fine-grained access control
   - Example:
   ```go
   adminRoutes.Use(middlewars.AuthMidddleware(cfg), middlewars.AdminMiddleware())
   ```

### Architecture Diagram

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   HTTP      │      │  Handlers   │      │  Services   │      │ Repositories│
│   Request   │─────▶│  (API Layer)│─────▶│ (Biz Logic) │─────▶│ (Data Layer)│
└─────────────┘      └─────────────┘      └─────────────┘      └──────┬──────┘
                           ▲                    ▲                     │
                           │                    │                     ▼
                           │                    │               ┌─────────────┐
                           │                    │               │  Database   │
                           │                    │               │ (PostgreSQL)│
                           │                    │               └─────────────┘
                     ┌─────┴──────┐      ┌──────┴─────┐
                     │ Middleware │      │   Models   │      ┌─────────────┐
                     │  (Auth,    │      │  (Domain   │      │   Utils     │
                     │   CORS)    │      │   Entities)│      │  (Shared)   │
                     └────────────┘      └────────────┘      └─────────────┘
```

## Database Caching

Mawid implements a sophisticated in-memory caching strategy to reduce database load and improve response times.

### In-Memory Cache Implementation

1. **Generic Cache Utility**
   - Thread-safe with mutex locks
   - Support for expiration times
   - Automatic cleanup of expired items
   ```go
   type Cache struct {
       mu      sync.RWMutex
       items   map[string]any
       expires map[string]time.Time
   }
   ```

2. **Cache Initialization and Cleanup**
   - Background goroutine for automatic cleanup
   ```go
   func NewCache() *Cache {
       cache := &Cache{
           items:   make(map[string]any),
           expires: make(map[string]time.Time),
       }
       go cache.startCleanupTimer()
       return cache
   }

   func (c *Cache) startCleanupTimer() {
       ticker := time.NewTicker(5 * time.Minute)
       defer ticker.Stop()
       for range ticker.C {
           c.cleanup()
       }
   }
   ```

3. **Event Service Caching**
   - Initialization of cache on service startup
   - Automatic refresh of recent events every 2 minutes
   - Manual invalidation on events CRUD operations
   ```go
   go func() {
       fmt.Println("[CACHE INIT] Populating recent events cache on startup")
       if _, err := service.cacheRecentEvents(); err != nil {
           fmt.Println("[CACHE INIT ERROR] Failed to initialize cache:", err)
       }

       ticker := time.NewTicker(2 * time.Minute)
       go func() {
           for range ticker.C {
               // Auto-refresh cache
               service.cacheMutex.Lock()
               service.cache.Delete("recent_events")
               service.cacheMutex.Unlock()

               if _, err := service.cacheRecentEvents(); err != nil {
                   fmt.Println("[CACHE AUTO-REFRESH ERROR] Failed to refresh cache:", err)
               }
           }
       }()
   }()
   ```

### Cached Data

1. **Recent Events**
   - Top 5 events, prioritizing upcoming events
   - Cached for 5 minutes
   - Used for homepage and discovery features
   ```go
   func (s *EventService) cacheRecentEvents() (*PaginatedEvents, error) {
       // Fetch from database
       evts, _, err := s.EventRepo.GetAll(1, 8, 0)
       if err != nil {
           return nil, err
       }

       // Keep only top 5 events
       var topEvents []models.Event
       if len(evts) > 5 {
           topEvents = evts[:5]
       } else {
           topEvents = evts
       }

       result, err := s.createPaginatedResponse(topEvents, int64(len(topEvents)), 1, 5)
       if err != nil {
           return nil, err
       }

       // Cache with expiration
       s.cache.Set("recent_events", result, 5*time.Minute)

       return result, nil
   }
   ```

2. **Individual Events**
   - Caching individual event details
   - Invalidated on update or delete
   ```go
   cacheKey := fmt.Sprintf("event_%d", id)
   s.cache.Set(cacheKey, eventResp, 5*time.Minute)
   ```

## Database Indexing

Mawid employs strategic database indexing to optimize query performance, especially for common operations.

### Index Types Implemented

1. **B-Tree Indexes**
   - Used for equality and range queries
   - Applied to columns frequently used in WHERE clauses
   - Used in filtering events by date
   ```sql
   CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date)
   ```

2. **Composite Indexes**
   - Used for multi-column filtering and sorting
   - Optimizes queries that filter on multiple conditions like filtering events using category and date
   ```sql
   CREATE INDEX IF NOT EXISTS idx_events_category_date ON events(category_id, event_date)
   ```

### Indexing Strategy

**Query-Driven Indexing**
   - Indexes are added based on query patterns
   - Frequent search and filter operations are identified and indexed

## Golang Best Practices

The Mawid backend demonstrates several Golang best practices and idioms:

### Concurrency Patterns

1. **Goroutines for Non-Blocking Operations**
   - Background caching and cleanup
   ```go
   go func() {
       ticker := time.NewTicker(2 * time.Minute)
       for range ticker.C {
           // Cache refresh logic
       }
   }()
   ```

2. **Mutex for Thread Safety**
   - Proper synchronization of shared resources
   ```go
   type Cache struct {
       mu      sync.RWMutex
       items   map[string]any
       expires map[string]time.Time
   }

   func (c *Cache) Get(key string) (any, bool) {
       c.mu.RLock()
       defer c.mu.RUnlock()
       // Cache read logic
   }
   ```
### Error Handling

1. **Error Wrapping**
   - Contextual error messages
   ```go
   if err != nil {
       return fmt.Errorf("failed to get database connection: %w", err)
   }
   ```

2. **Consistent Error Responses**
   - Structured error responses
   ```go
   func ErrorResponse(c *gin.Context, statusCode int, message string, err any) {
       c.JSON(statusCode, Response{
           Success: false,
           Message: message,
           Error:   err,
       })
   }
   ```

### Security Practices

1. **JWT-Based Authentication**
   - Secure token generation and validation
   ```go
   func GenerateJWT(user models.User, cfg *config.Config) (string, time.Time, error) {
       // JWT generation logic
   }

   func ValidateToken(tokenString string, cfg *config.Config) (*JWTClaim, error) {
       // JWT validation logic
   }
   ```

2. **Middleware Security Chain**
   - Multiple security middlewares
   ```go
   router.Use(gin.Recovery())
   router.Use(RateLimiterMiddleware())
   router.Use(SecurityHeadersMiddleware())
   ```

### Performance Optimizations

1. **Pagination**
   - All list endpoints support pagination
   ```go
   func (s *EventService) GetAllEvents(page, pageSize int, categoryID uint) (*PaginatedEvents, error) {
       // Pagination logic
   }
   ```

2. **Efficient Database Queries**
   - Smart selection of what to fetch
   - Uses GORM's Preload for eager loading

3. **Response Caching**
   - In-memory caching for frequently accessed data

4. **Background Processing**
   - Offloading non-critical operations to background goroutines

## Getting Started

### Prerequisites

- Go 1.18 or higher
- PostgreSQL 12 or higher
- Docker (optional)

### Installation

1. Clone the repository
```bash
git clone https://github.com/robaa12/mawid.git
cd mawid/backend
```

2. Configure environment variables
```bash
cp cmd/server/.env.example cmd/server/.env
```

3. Run the server
```bash
go run cmd/server/main.go
```

Or with Docker:
```bash
docker-compose up -d
```

### API Documentation

The API documentation is available in [Postman](https://documenter.getpostman.com/view/44767514/2sB2qWHjD5)
