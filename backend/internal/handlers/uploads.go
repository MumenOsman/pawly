package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const maxUploadSize = 5 * 1024 * 1024 // 5 MB

// UploadUserPhoto handles POST /me/photo
func (h *Handler) UploadUserPhoto(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "File too large (max 5MB)")
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Missing photo field in form")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		ext = ".jpg"
	}

	dir := filepath.Join("uploads", "users")
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Printf("❌ Failed creating directory %s: %v", dir, err)
		writeError(w, http.StatusInternalServerError, "Storage error")
		return
	}

	filename := fmt.Sprintf("user_%d%s", userID, ext)
	dstPath := filepath.Join(dir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		log.Printf("❌ Failed creating file %s: %v", dstPath, err)
		writeError(w, http.StatusInternalServerError, "Storage error")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		log.Printf("❌ Failed saving file %s: %v", dstPath, err)
		writeError(w, http.StatusInternalServerError, "Storage error")
		return
	}

	photoURL := fmt.Sprintf("/uploads/users/%s", filename)

	_, err = h.DB.Exec(`
		INSERT INTO user_profiles (user_id, owner_photo, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id) DO UPDATE 
		SET owner_photo = EXCLUDED.owner_photo, updated_at = NOW();
	`, userID, photoURL)
	if err != nil {
		log.Printf("❌ Failed updating DB user profile photo: %v", err)
		writeError(w, http.StatusInternalServerError, "Database update error")
		return
	}

	timestampedURL := fmt.Sprintf("%s?t=%d", photoURL, time.Now().UnixNano())

	writeJSON(w, http.StatusOK, map[string]string{
		"url":     timestampedURL,
		"message": "User photo uploaded successfully",
	})
}

// UploadPetPhoto handles POST /pets/{id}/photo
func (h *Handler) UploadPetPhoto(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	petIDStr := r.PathValue("id")
	petID, err := strconv.Atoi(petIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	// Verify pet belongs to current user
	var ownerID int
	err = h.DB.QueryRow(`SELECT owner_id FROM pets WHERE id = $1`, petID).Scan(&ownerID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Pet not found")
		return
	} else if ownerID != userID {
		writeError(w, http.StatusForbidden, "You do not own this pet")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "File too large (max 5MB)")
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Missing photo field in form")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		ext = ".jpg"
	}

	dir := filepath.Join("uploads", "pets")
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Printf("❌ Failed creating directory %s: %v", dir, err)
		writeError(w, http.StatusInternalServerError, "Storage error")
		return
	}

	filename := fmt.Sprintf("pet_%d_%d%s", petID, time.Now().UnixNano(), ext)
	dstPath := filepath.Join(dir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		log.Printf("❌ Failed creating file %s: %v", dstPath, err)
		writeError(w, http.StatusInternalServerError, "Storage error")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		log.Printf("❌ Failed saving file %s: %v", dstPath, err)
		writeError(w, http.StatusInternalServerError, "Storage error")
		return
	}

	photoURL := fmt.Sprintf("/uploads/pets/%s", filename)

	_, err = h.DB.Exec(`
		UPDATE pets 
		SET photos = array_append(ARRAY(SELECT unnest(COALESCE(photos, '{}')) EXCEPT SELECT '/paw-icon.svg'), $1),
		    pet_photo = $1
		WHERE id = $2;
	`, photoURL, petID)
	if err != nil {
		log.Printf("❌ Failed updating DB pet photo: %v", err)
		writeError(w, http.StatusInternalServerError, "Database update error")
		return
	}

	timestampedURL := fmt.Sprintf("%s?t=%d", photoURL, time.Now().UnixNano())

	writeJSON(w, http.StatusOK, map[string]string{
		"url":       timestampedURL,
		"raw_url":   photoURL,
		"message":   "Pet photo uploaded successfully",
	})
}

// DeleteUserPhoto handles DELETE /me/photo
func (h *Handler) DeleteUserPhoto(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	_, err := h.DB.Exec(`
		UPDATE user_profiles 
		SET owner_photo = '', updated_at = NOW() 
		WHERE user_id = $1;
	`, userID)
	if err != nil {
		log.Printf("❌ Failed clearing user profile photo: %v", err)
		writeError(w, http.StatusInternalServerError, "Database update error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "User photo removed successfully",
	})
}

// DeletePetPhoto handles DELETE /pets/{id}/photo
func (h *Handler) DeletePetPhoto(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	userID := getUserID(r)
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized - please log in")
		return
	}

	petIDStr := r.PathValue("id")
	petID, err := strconv.Atoi(petIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid pet ID")
		return
	}

	// Verify ownership
	var ownerID int
	err = h.DB.QueryRow(`SELECT owner_id FROM pets WHERE id = $1`, petID).Scan(&ownerID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Pet not found")
		return
	} else if ownerID != userID {
		writeError(w, http.StatusForbidden, "You do not own this pet")
		return
	}

	photoQuery := r.URL.Query().Get("photo_url")
	if photoQuery != "" {
		// Remove specific photo from gallery array and reset pet_photo if it matched
		_, err = h.DB.Exec(`
			UPDATE pets 
			SET photos = array_remove(photos, $1),
			    pet_photo = CASE WHEN pet_photo = $1 THEN '' ELSE pet_photo END
			WHERE id = $2;
		`, photoQuery, petID)
	} else {
		// Clear all photos for this pet
		_, err = h.DB.Exec(`
			UPDATE pets 
			SET photos = '{}', pet_photo = '' 
			WHERE id = $1;
		`, petID)
	}

	if err != nil {
		log.Printf("❌ Failed removing pet photo: %v", err)
		writeError(w, http.StatusInternalServerError, "Database update error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "Pet photo removed successfully",
	})
}
