package posts

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"real-time-forum/database"
	"real-time-forum/internal/models"
)

var categories = []string{
	"General",
	"Technology",
	"Programming",
	"Gaming",
	"Science",
	"Education",
}

func ValidatePostInput(post models.Post) bool {
	if len(strings.TrimSpace(post.Title)) == 0 || len(strings.TrimSpace(post.Title)) > 150 {
		return false
	}

	if len(post.Category) == 0 {
		return false
	}
	if !checkCategories(categories, post.Category) {
		return false
	}

	if len(strings.TrimSpace(post.Content)) == 0 || len(strings.TrimSpace(post.Content)) > 4500 {
		return false
	}
	return true
}

func checkCategories(categories []string, selected []string) bool {
	for _, sel := range selected {
		found := false

		for _, cat := range categories {
			if cat == sel {
				found = true
				break
			}
		}

		if !found {
			return false
		}
	}

	return true
}

// GetUserID returns logged-in user ID from session token.
func GetUserID(r *http.Request) (int, error) {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		return 0, fmt.Errorf("no cookie found")
	}

	var userID int
	var expiresAt time.Time

	err = database.DB.QueryRow("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ?", cookie.Value).Scan(&userID, &expiresAt)
	if err != nil {
		return 0, fmt.Errorf("invalid session token")
	}

	if time.Now().After(expiresAt) {
		return 0, fmt.Errorf("session expired")
	}

	return userID, nil
}
