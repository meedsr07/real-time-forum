package posts

import (
	"strings"
	"net/http"
	"real-time-forum/database"
	"real-time-forum/internal/models"
)

var categories = []string{
	"General",
	"Tech",
	"Gaming",
	"Movies",
	"Science",
}

func ValidatePostInput(post models.Post) bool {
	if len(strings.TrimSpace(post.Title)) == 0 || len(strings.TrimSpace(post.Title)) > 150 {
		return false
	}

	if (!checkCategories(categories , post.Category)) {
		return  false
	}

	if len(strings.TrimSpace(post.Content)) == 0 || len(strings.TrimSpace(post.Content)) > 4500 {
		return false
	}
	return true
}

func checkCategories(arr []string, category string) bool {
	for _, v := range arr {
		if v == category {
			return true
		}
	}
	return false
}

func GetUserID(r *http.Request) (int, error) {
	// Get the cookie named session_token from the user's request
	cookie, err := r.Cookie("session_token")
	if err != nil {
		return 0, err
	}
	// take the value of the cookie
	token := cookie.Value

	var userID int
	// Query the database to find the user_id associated with the session_token
	err = database.DB.QueryRow("SELECT user_id FROM user_sessions  WHERE session_token = ?", token).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}