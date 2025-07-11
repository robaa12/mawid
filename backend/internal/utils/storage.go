package utils

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/robaa12/mawid/config"
)

type StorageService struct {
	Config *config.Config
	Client *http.Client
}

type FileUploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	MimeType string `json:"mime_type"`
}

var (
	SupportedImageTypes = map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
)

func NewStorageService(cfg *config.Config) *StorageService {
	return &StorageService{
		Config: cfg,
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (s *StorageService) UploadFile(file *multipart.FileHeader) (string, error) {
	if file == nil {
		return "", errors.New("no file provided")
	}

	if s.Config.SupabaseURL == "" || s.Config.SupabaseKey == "" || s.Config.SupabaseBucket == "" {
		return "", errors.New("storage configration is incomplete")
	}

	if !s.IsValidFileType(file.Filename) {
		return "", errors.New("unsupported file type")
	}

	if file.Size > s.Config.MaxUploadSize {
		return "", fmt.Errorf("file size exceeds maximum allowed (%d bytes)", s.Config.MaxUploadSize)
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("error opening file: %w", err)
	}
	defer src.Close()

	buffer := make([]byte, file.Size)
	if _, err = io.ReadFull(src, buffer); err != nil {
		return "", fmt.Errorf("error reading file: %w", err)
	}

	filename := s.GenerateUniqueFilename(file.Filename)

	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", strings.TrimRight(s.Config.SupabaseURL, "/"), s.Config.SupabaseBucket, filename)

	// Create request to Supabase API
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(buffer))
	if err != nil {
		return "", fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Content-Type", s.GetContentType(file.Filename))
	req.Header.Set("Authorization", "Bearer "+s.Config.SupabaseKey)

	// Send request
	resp, err := s.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error uploading to storage: %w", err)
	}

	defer resp.Body.Close()

	// Check response
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("storage service error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	publicURL := fmt.Sprintf("%s/%s",
		strings.TrimRight(s.Config.SupabasePublicURL, "/"),
		filename)

	return publicURL, nil
}

func (s *StorageService) DeleteFile(fileURL string) error {
	// Extract filename from URL
	filename := s.ExtractFilenameFromURL(fileURL)
	if filename == "" {
		return errors.New("invalid file URL format")
	}

	// Create request URL
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s",
		strings.TrimRight(s.Config.SupabaseURL, "/"),
		s.Config.SupabaseBucket,
		filename)

	// Create request
	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("error creating delete request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+s.Config.SupabaseKey)

	// Send request
	resp, err := s.Client.Do(req)
	if err != nil {
		return fmt.Errorf("error deleting from storage: %w", err)
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("storage service error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func (s *StorageService) IsValidFileType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return SupportedImageTypes[ext]
}

// GenerateUniqueFilename creates a unique filename to prevent collisions
func (s *StorageService) GenerateUniqueFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)
	return fmt.Sprintf("%s-%d%s", uuid.New().String(), time.Now().Unix(), ext)
}

// GetContentType determines content type based on file extension
func (s *StorageService) GetContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}

func (s *StorageService) ExtractFilenameFromURL(url string) string {
	// If URL is empty, return empty string
	if url == "" {
		return ""
	}

	parts := strings.Split(url, "/")
	if len(parts) == 0 {
		return ""
	}

	return parts[len(parts)-1]
}
