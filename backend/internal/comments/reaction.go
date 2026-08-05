package comments

import (
	"encoding/json"
	"net/http"

	"real-time-forum/database"
	"real-time-forum/internal/posts"
)

type ReactionRequest struct {
	CommentID int `json:"comment_id"`
	IsLike    int `json:"is_like"` // 1 = like, 0 = dislike
}

// handles comment likes and dislikes atomically.
func ReactionHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := posts.GetUserID(r)
	if err != nil || userID <= 0 || r.Method != http.MethodPost {
		http.Error(w, "Unauthorized or bad method", http.StatusUnauthorized)
		return
	}
	var req ReactionRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if req.IsLike != 0 && req.IsLike != 1 {
		http.Error(w, "Invalid reaction type", http.StatusBadRequest)
		return
	}

	// Verify comment exists
	var commentExists bool
	err = database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM comments WHERE id=?)", req.CommentID).Scan(&commentExists)
	if err != nil || !commentExists {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	}

	// Check existing reaction
	var existingReaction int = -1
	err = database.DB.QueryRow("SELECT reaction FROM comment_likes WHERE user_id=? AND comment_id=?", userID, req.CommentID).Scan(&existingReaction)

	userReaction := req.IsLike // set the user reaction

	// delete the old reaction to prevent duplicates
	database.DB.Exec("DELETE FROM comment_likes WHERE user_id=? AND comment_id=?", userID, req.CommentID)

	if err == nil && existingReaction == req.IsLike {
		userReaction = -1 // Undo reaction
	} else {
		_, err = database.DB.Exec("INSERT INTO comment_likes (user_id, comment_id, reaction) VALUES (?, ?, ?)", userID, req.CommentID, req.IsLike)
		if err != nil {
			http.Error(w, "Failed to update reaction", http.StatusInternalServerError)
			return
		}
	}

	// count the new total likes and dislikes
	var likes, dislikes int
	database.DB.QueryRow("SELECT COALESCE(SUM(reaction=1),0), COALESCE(SUM(reaction=0),0) FROM comment_likes WHERE comment_id=?", req.CommentID).Scan(&likes, &dislikes)

	// send the JSON response to the frontend
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":        "success",
		"likes":         likes,
		"dislikes":      dislikes,
		"user_reaction": userReaction,
	})
}
