package utils

import (
	"sync"
	"time"
)

// Cache represents a generic cache implementation with expiration
type Cache struct {
	mu      sync.RWMutex
	items   map[string]any
	expires map[string]time.Time
}

// NewCache creates a new cache instance
func NewCache() *Cache {
	cache := &Cache{
		items:   make(map[string]any),
		expires: make(map[string]time.Time),
	}

	// Start the cleanup goroutine
	go cache.startCleanupTimer()

	return cache
}

// Get retrieves an item from the cache
func (c *Cache) Get(key string) (any, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists {
		return nil, false
	}

	// Check if the item has expired
	if expiration, ok := c.expires[key]; ok && expiration.Before(time.Now()) {
		return nil, false
	}

	return item, true
}

// Set adds an item to the cache with an optional expiration time
func (c *Cache) Set(key string, value any, duration time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = value

	// Set expiration if duration is provided
	if duration > 0 {
		c.expires[key] = time.Now().Add(duration)
	}
}

// Delete removes an item from the cache
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.items, key)
	delete(c.expires, key)
}

// Clear empties the entire cache
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items = make(map[string]any)
	c.expires = make(map[string]time.Time)
}

// startCleanupTimer starts a timer that periodically cleans up expired items
func (c *Cache) startCleanupTimer() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.cleanup()
	}
}

// cleanup removes expired items from the cache
func (c *Cache) cleanup() {
	now := time.Now()

	c.mu.Lock()
	defer c.mu.Unlock()

	for key, expiration := range c.expires {
		if expiration.Before(now) {
			delete(c.items, key)
			delete(c.expires, key)
		}
	}
}
