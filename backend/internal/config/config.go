package config

import (
	"os"
	"strconv"
)

type Config struct {
	AdminAPIPort              int
	PublicAPIPort             int
	DatabaseURL               string
	JWTSecret                 string
	SMSProvider               string
	CoachMeetingIntervalDays  int
}

func Load() Config {
	return Config{
		AdminAPIPort:             getEnvInt("ADMIN_API_PORT", 8081),
		PublicAPIPort:            getEnvInt("PUBLIC_API_PORT", 8080),
		DatabaseURL:              getEnv("DATABASE_URL", "postgresql://neondb_owner:npg_Q3SFc7RuWMCw@ep-bitter-violet-ap8nn4p3-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"),
		JWTSecret:                getEnv("JWT_SECRET", "dev-secret"),
		SMSProvider:              getEnv("SMS_PROVIDER", "mock"),
		CoachMeetingIntervalDays: getEnvInt("COACH_MEETING_INTERVAL_DAYS", 14),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
