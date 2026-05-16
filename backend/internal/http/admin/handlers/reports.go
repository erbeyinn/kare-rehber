package handlers

import (
	"net/http"
	"strconv"
	"time"

	"kare-rehber/backend/internal/domain"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/service"
)

type ReportsHandler struct {
	reports         *service.ReportService
	defaultInterval int
}

func NewReportsHandler(reports *service.ReportService, defaultInterval int) *ReportsHandler {
	if defaultInterval <= 0 {
		defaultInterval = 14
	}
	return &ReportsHandler{reports: reports, defaultInterval: defaultInterval}
}

type overdueCoachView struct {
	ID            int64   `json:"id"`
	FirstName     string  `json:"first_name"`
	LastName      string  `json:"last_name"`
	Phone         string  `json:"phone"`
	StudentCount  int     `json:"student_count"`
	LastMeetingAt *string `json:"last_meeting_at,omitempty"`
	DaysOverdue   int     `json:"days_overdue"`
}

func (h *ReportsHandler) OverdueCoaches(w http.ResponseWriter, r *http.Request) {
	days := h.defaultInterval
	if v := r.URL.Query().Get("days"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid days")
			return
		}
		days = n
	}
	rows, err := h.reports.OverdueCoaches(r.Context(), days)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "report failed")
		return
	}
	out := make([]overdueCoachView, 0, len(rows))
	for _, o := range rows {
		v := overdueCoachView{
			ID:           o.Coach.ID,
			FirstName:    o.Coach.FirstName,
			LastName:     o.Coach.LastName,
			Phone:        o.Coach.Phone,
			StudentCount: o.StudentCount,
			DaysOverdue:  o.DaysOverdue,
		}
		if o.LastMeetingAt != nil {
			s := o.LastMeetingAt.Format("2006-01-02")
			v.LastMeetingAt = &s
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{
		"items": out,
		"days":  days,
	})
}

type overviewView struct {
	StudentsTotal     int `json:"students_total"`
	StudentsActive    int `json:"students_active"`
	StudentsInactive  int `json:"students_inactive"`
	CoachesTotal      int `json:"coaches_total"`
	CoachesActive     int `json:"coaches_active"`
	CoachesInactive   int `json:"coaches_inactive"`
	CoordinatorsTotal int `json:"coordinators_total"`
	AdminsTotal       int `json:"admins_total"`
	MeetingsThisWeek  int `json:"meetings_this_week"`
	PendingApprovals  int `json:"pending_approvals"`
}

func (h *ReportsHandler) Overview(w http.ResponseWriter, r *http.Request) {
	o, err := h.reports.Overview(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "overview failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, overviewView{
		StudentsTotal:     o.StudentsTotal,
		StudentsActive:    o.StudentsActive,
		StudentsInactive:  o.StudentsInactive,
		CoachesTotal:      o.CoachesTotal,
		CoachesActive:     o.CoachesActive,
		CoachesInactive:   o.CoachesInactive,
		CoordinatorsTotal: o.CoordinatorsTotal,
		AdminsTotal:       o.AdminsTotal,
		MeetingsThisWeek:  o.MeetingsThisWeek,
		PendingApprovals:  o.PendingApprovals,
	})
}

type studentStatView struct {
	ID            int64   `json:"id"`
	FirstName     string  `json:"first_name"`
	LastName      string  `json:"last_name"`
	City          *string `json:"city,omitempty"`
	IsActive      bool    `json:"is_active"`
	MeetingCount  int     `json:"meeting_count"`
	LastMeetingAt *string `json:"last_meeting_at,omitempty"`
	CoachID       *int64  `json:"coach_id,omitempty"`
	CoachName     *string `json:"coach_name,omitempty"`
}

func (h *ReportsHandler) StudentStats(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var f service.StudentStatsFilter
	if v := q.Get("city"); v != "" {
		f.City = &v
	}
	if v := q.Get("coach_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid coach_id")
			return
		}
		f.CoachID = &id
	}
	rows, err := h.reports.StudentStats(r.Context(), f)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "report failed")
		return
	}
	out := make([]studentStatView, 0, len(rows))
	for _, row := range rows {
		v := studentStatView{
			ID:           row.StudentID,
			FirstName:    row.FirstName,
			LastName:     row.LastName,
			City:         row.City,
			IsActive:     row.IsActive,
			MeetingCount: row.MeetingCount,
			CoachID:      row.CoachID,
			CoachName:    row.CoachName,
		}
		if row.LastMeetingAt != nil {
			s := row.LastMeetingAt.Format("2006-01-02")
			v.LastMeetingAt = &s
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

type coachStatView struct {
	ID            int64   `json:"id"`
	FirstName     string  `json:"first_name"`
	LastName      string  `json:"last_name"`
	IsActive      bool    `json:"is_active"`
	StudentCount  int     `json:"student_count"`
	MeetingsTotal int     `json:"meetings_total"`
	Last30Days    int     `json:"last_30_days"`
	LastMeetingAt *string `json:"last_meeting_at,omitempty"`
}

func (h *ReportsHandler) CoachStats(w http.ResponseWriter, r *http.Request) {
	rows, err := h.reports.CoachStats(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "report failed")
		return
	}
	out := make([]coachStatView, 0, len(rows))
	for _, row := range rows {
		v := coachStatView{
			ID:            row.CoachID,
			FirstName:     row.FirstName,
			LastName:      row.LastName,
			IsActive:      row.IsActive,
			StudentCount:  row.StudentCount,
			MeetingsTotal: row.MeetingsTotal,
			Last30Days:    row.Last30Days,
		}
		if row.LastMeetingAt != nil {
			s := row.LastMeetingAt.Format("2006-01-02")
			v.LastMeetingAt = &s
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

type cityView struct {
	City         string `json:"city"`
	StudentCount int    `json:"student_count"`
	CoachCount   int    `json:"coach_count"`
}

func (h *ReportsHandler) Cities(w http.ResponseWriter, r *http.Request) {
	rows, err := h.reports.CityDistribution(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "report failed")
		return
	}
	out := make([]cityView, 0, len(rows))
	for _, c := range rows {
		out = append(out, cityView{City: c.City, StudentCount: c.StudentCount, CoachCount: c.CoachCount})
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

type meetingStatsView struct {
	From         string             `json:"from"`
	To           string             `json:"to"`
	Total        int                `json:"total"`
	Daily        []dailyPointView   `json:"daily"`
	StatusCounts map[string]int     `json:"status_counts"`
}

type dailyPointView struct {
	Day   string `json:"day"`
	Count int    `json:"count"`
}

func (h *ReportsHandler) MeetingStats(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	to := time.Now()
	from := to.AddDate(0, 0, -29)
	if v := q.Get("from"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "from must be YYYY-MM-DD")
			return
		}
		from = t
	}
	if v := q.Get("to"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "to must be YYYY-MM-DD")
			return
		}
		to = t
	}
	if to.Sub(from) > 366*24*time.Hour {
		httputil.WriteError(w, http.StatusBadRequest, "date range too wide (max 366 days)")
		return
	}
	stats, err := h.reports.MeetingStats(r.Context(), from, to)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "report failed")
		return
	}
	v := meetingStatsView{
		From:         stats.From.Format("2006-01-02"),
		To:           stats.To.Format("2006-01-02"),
		Total:        stats.Total,
		StatusCounts: make(map[string]int, len(stats.StatusCounts)),
		Daily:        make([]dailyPointView, 0, len(stats.Daily)),
	}
	for _, st := range []domain.MeetingStatus{domain.MeetingStatusDraft, domain.MeetingStatusPending, domain.MeetingStatusApproved} {
		v.StatusCounts[string(st)] = stats.StatusCounts[st]
	}
	for _, d := range stats.Daily {
		v.Daily = append(v.Daily, dailyPointView{Day: d.Day.Format("2006-01-02"), Count: d.Count})
	}
	httputil.WriteJSON(w, http.StatusOK, v)
}

type missingMeetingView struct {
	ID            int64   `json:"id"`
	FirstName     string  `json:"first_name"`
	LastName      string  `json:"last_name"`
	City          *string `json:"city,omitempty"`
	CoachID       *int64  `json:"coach_id,omitempty"`
	CoachName     *string `json:"coach_name,omitempty"`
	LastMeetingAt *string `json:"last_meeting_at,omitempty"`
	DaysOverdue   int     `json:"days_overdue"`
}

func (h *ReportsHandler) MissingMeetings(w http.ResponseWriter, r *http.Request) {
	days := h.defaultInterval
	if v := r.URL.Query().Get("days"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid days")
			return
		}
		days = n
	}
	rows, err := h.reports.MissingMeetings(r.Context(), days)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "report failed")
		return
	}
	out := make([]missingMeetingView, 0, len(rows))
	for _, row := range rows {
		v := missingMeetingView{
			ID:          row.StudentID,
			FirstName:   row.FirstName,
			LastName:    row.LastName,
			City:        row.City,
			CoachID:     row.CoachID,
			CoachName:   row.CoachName,
			DaysOverdue: row.DaysOverdue,
		}
		if row.LastMeetingAt != nil {
			s := row.LastMeetingAt.Format("2006-01-02")
			v.LastMeetingAt = &s
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{
		"items": out,
		"days":  days,
	})
}

