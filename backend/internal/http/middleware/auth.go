package middleware

import (
	"context"
	"net/http"
	"strings"

	"kare-rehber/backend/internal/auth"
	"kare-rehber/backend/internal/domain"
	httputil "kare-rehber/backend/internal/http"
)

type ctxKey string

const claimsKey ctxKey = "auth.claims"

func ClaimsFrom(ctx context.Context) (*auth.Claims, bool) {
	c, ok := ctx.Value(claimsKey).(*auth.Claims)
	return c, ok
}

func RequireAuth(j *auth.JWT) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tok := bearerToken(r)
			if tok == "" {
				httputil.WriteError(w, http.StatusUnauthorized, "missing token")
				return
			}
			claims, err := j.Parse(tok)
			if err != nil {
				httputil.WriteError(w, http.StatusUnauthorized, "invalid token")
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(j *auth.JWT, roles ...domain.Role) func(http.Handler) http.Handler {
	allowed := make(map[domain.Role]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return RequireAuth(j)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, _ := ClaimsFrom(r.Context())
			if _, ok := allowed[claims.Role]; !ok {
				httputil.WriteError(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		}))
	}
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		return ""
	}
	return strings.TrimSpace(h[len(prefix):])
}
