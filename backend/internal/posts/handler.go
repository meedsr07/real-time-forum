package posts

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"real-time-forum/internal/models"
)

func PostHandler(w http.ResponseWriter, r *http.Request) {
	userId, err := GetUserID(r)
	if err != nil {
		http.Error(w, http.StatusText(500), http.StatusInternalServerError)
		return
	}
	if r.Method == http.MethodPost && userId != 0 {
		var post models.Post
		err := json.NewDecoder(r.Body).Decode(&post)
		defer r.Body.Close()
		if !ValidatePostInput(post) {
			http.Error(w, http.StatusText(400), http.StatusBadRequest)
			return
		}
		post.UserID = userId
		post.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
		err = CreatePost(post)
		if err != nil {
			http.Error(w, http.StatusText(500), http.StatusInternalServerError)
			return
		}
	} else if r.Method == http.MethodGet {
		category := r.URL.Query().Get("category")
		posts, err := GetAllPosts(category)
		if err != nil {
			http.Error(w, http.StatusText(500), http.StatusInternalServerError)
			return
		}
		if posts == nil {
			posts = []models.Post{}
		}
		w.Header().Set("Content-Type", "application/json")

		err = json.NewEncoder(w).Encode(posts)
		if err != nil {
			http.Error(w, http.StatusText(500), http.StatusInternalServerError)
			return
		}
	} else {
		http.Error(w, http.StatusText(405), http.StatusMethodNotAllowed)
		return
	}
}

func GetPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, http.StatusText(405), http.StatusMethodNotAllowed)
		return
	}

	idstring := r.PathValue("id")
	post_id, err := strconv.Atoi(idstring)
	if err != nil {
		http.Error(w, http.StatusText(400), http.StatusBadRequest)
		return
	}
	post, err := GetPostByID(post_id)
	if err != nil {
		http.Error(w, http.StatusText(404), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(post)
	if err != nil {
		http.Error(w, http.StatusText(405), http.StatusMethodNotAllowed)
		return
	}
}
