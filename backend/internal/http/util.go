package http

import (
	"encoding/json"
	"log/slog"
	nethttp "net/http"
)

func WriteJSON(w nethttp.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if body == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("writeJSON encode failed", "err", err)
	}
}

func WriteError(w nethttp.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}
