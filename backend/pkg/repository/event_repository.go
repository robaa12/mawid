package repository

import (
	"github.com/robaa12/mawid/pkg/models"
	"gorm.io/gorm"
)

type EventRepository struct {
	DB *gorm.DB
}

func NewEventRepository(db *gorm.DB) *EventRepository {
	return &EventRepository{DB: db}
}

func (r *EventRepository) Create(event *models.Event) error {
	return r.DB.Create(event).Error
}

func (r *EventRepository) GetAll(page, pageSize int) ([]models.Event, int64, error) {
	var events []models.Event
	var total int64

	if err := r.DB.Model(&models.Event{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	query := r.DB.Preload("Category").Preload("Tags").Offset(offset).Limit(pageSize)
	if err := query.Find(&events).Error; err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

func (r *EventRepository) GetEventByID(id uint) (*models.Event, error) {
	var event models.Event
	if err := r.DB.Preload("Category").Preload("Tags").First(&event, id).Error; err != nil {
		return nil, err
	}

	return &event, nil

}

func (r *EventRepository) Update(event *models.Event) error {
	return r.DB.Save(event).Error
}

func (r *EventRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Event{}, id).Error
}

func (r *EventRepository) SearchByName(name string, page, pageSize int) ([]models.Event, int64, error) {
	var events []models.Event
	var total int64

	query := r.DB.Model(&models.Event{}).Where("name ILIKE ?", "%"+name+"%")

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * pageSize
	if err := query.Preload("Category").Preload("Tags").Offset(offset).Limit(pageSize).Find(&events).Error; err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

func (r *EventRepository) GetCategoryByID(id uint) (*models.Category, error) {
	var category models.Category
	err := r.DB.First(&category, id).Error
	if err != nil {
		return nil, err
	}
	return &category, nil

}

func (r *EventRepository) GetAllCategories() ([]models.Category, error) {
	var categories []models.Category
	err := r.DB.Find(&categories).Error
	return categories, err

}

func (r *EventRepository) CreateCategory(category *models.Category) error {
	return r.DB.Create(category).Error
}

func (r *EventRepository) UpdateCategory(category *models.Category) error {
	return r.DB.Save(category).Error
}

func (r *EventRepository) DeleteCategory(id uint) error {
	return r.DB.Delete(&models.Category{}, id).Error
}

func (r *EventRepository) GetAllTags() ([]models.Tag, error) {
	var tags []models.Tag
	err := r.DB.Find(&tags).Error
	return tags, err
}

func (r *EventRepository) GetTagByID(id uint) (*models.Tag, error) {
	var tag models.Tag
	err := r.DB.First(&tag, id).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

func (r *EventRepository) CreateTag(tag *models.Tag) error {
	return r.DB.Create(tag).Error
}

func (r *EventRepository) FindOrCreateTag(name string) (*models.Tag, error) {
	var tag models.Tag

	err := r.DB.Where("name = ?", name).FirstOrCreate(&tag, models.Tag{Name: name}).Error
	return &tag, err
}
