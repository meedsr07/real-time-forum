package comments

import (
	"fmt"
	"real-time-forum/database"
	"real-time-forum/internal/models"
)

// inserts a new comment into the DB.
func CreateComment(comment models.Comment) (models.Comment, error) {
	query := `INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`
	result, err := database.DB.Exec(query, comment.PostID, comment.UserID, comment.Content, comment.CreatedAt)
	if err != nil {
		return comment, fmt.Errorf("create comment: insert: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return comment, fmt.Errorf("create comment: get last insert id: %w", err)
	}

	comment.ID = int(id)
	return comment, nil
}

func GetCommentsByPostID(postID int, userID int) ([]models.Comment, error) {
	query := `
	SELECT 
			c.id, 
			c.post_id,
			c.user_id, 
			COALESCE(u.username, 'Anonymous'), 
			c.content, 
			c.created_at,
			
			(SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND reaction = 1) AS likes_count,
			(SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND reaction = 0) AS dislikes_count,
			(SELECT reaction FROM comment_likes WHERE comment_id = c.id AND user_id = ? LIMIT 1) AS user_reaction
			
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC`

	rows, err := database.DB.Query(query, userID, postID)
	if err != nil {
		return nil, fmt.Errorf("get comments for post %d: %w", postID, err)
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var comment models.Comment
		if err := rows.Scan(&comment.ID, &comment.PostID, &comment.UserID, &comment.Username, &comment.Content, &comment.CreatedAt, &comment.Likes, &comment.Dislikes, &comment.UserReaction,); err != nil {
			return nil, fmt.Errorf("get comments: scan row: %w", err)
		}
		comments = append(comments, comment)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("get comments: row iteration: %w", err)
	}

	return comments, nil
}
