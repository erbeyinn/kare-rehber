package service

import (
	"context"
	"sort"
	"time"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

type ReportService struct {
	coaches  *repository.CoachRepo
	matches  *repository.MatchRepo
	meetings *repository.MeetingRepo
	students *repository.StudentRepo
	users    *repository.UserRepo
}

func NewReportService(
	coaches *repository.CoachRepo,
	matches *repository.MatchRepo,
	meetings *repository.MeetingRepo,
	students *repository.StudentRepo,
	users *repository.UserRepo,
) *ReportService {
	return &ReportService{coaches: coaches, matches: matches, meetings: meetings, students: students, users: users}
}

type Overview struct {
	StudentsTotal     int
	StudentsActive    int
	StudentsInactive  int
	CoachesTotal      int
	CoachesActive     int
	CoachesInactive   int
	CoordinatorsTotal int
	AdminsTotal       int
	MeetingsThisWeek  int
	PendingApprovals  int
}

// Overview aggregates the headline numbers for the admin dashboard.
func (s *ReportService) Overview(ctx context.Context) (*Overview, error) {
	o := &Overview{}
	counts, err := s.users.CountByRole(ctx)
	if err != nil {
		return nil, err
	}
	for _, c := range counts {
		switch c.Role {
		case domain.RoleStudent:
			o.StudentsTotal = c.Total
			o.StudentsActive = c.Active
			o.StudentsInactive = c.Inactive
		case domain.RoleCoach:
			o.CoachesTotal = c.Total
			o.CoachesActive = c.Active
			o.CoachesInactive = c.Inactive
		case domain.RoleCoordinator:
			o.CoordinatorsTotal = c.Total
		case domain.RoleAdmin:
			o.AdminsTotal = c.Total
		}
	}
	// Week starts Monday (Turkish convention).
	now := time.Now()
	weekStart := startOfWeek(now)
	n, err := s.meetings.CountSince(ctx, weekStart)
	if err != nil {
		return nil, err
	}
	o.MeetingsThisWeek = n
	pending, err := s.meetings.CountPendingApproval(ctx)
	if err != nil {
		return nil, err
	}
	o.PendingApprovals = pending
	return o, nil
}

type StudentStatsFilter struct {
	City    *string
	CoachID *int64
}

type StudentStatRow struct {
	StudentID     int64
	FirstName     string
	LastName      string
	City          *string
	IsActive      bool
	MeetingCount  int
	LastMeetingAt *time.Time
	CoachID       *int64
	CoachName     *string
}

// StudentStats returns per-student meeting totals plus last meeting date,
// optionally filtered by city or assigned coach.
func (s *ReportService) StudentStats(ctx context.Context, f StudentStatsFilter) ([]*StudentStatRow, error) {
	rows, err := s.students.ListFiltered(ctx, repository.StudentListFilter{City: f.City})
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return []*StudentStatRow{}, nil
	}

	studentIDs := make([]int64, 0, len(rows))
	for _, sw := range rows {
		studentIDs = append(studentIDs, sw.User.ID)
	}
	totals, err := s.meetings.StudentMeetingTotals(ctx, studentIDs)
	if err != nil {
		return nil, err
	}
	matchesByStudent, err := s.matches.ListByStudents(ctx, studentIDs)
	if err != nil {
		return nil, err
	}
	coachMatchByStudent := make(map[int64]int64)
	coachIDSet := make(map[int64]struct{})
	for _, m := range matchesByStudent {
		if m.Type == domain.MatchTypeCoach {
			coachMatchByStudent[m.StudentID] = m.TargetID
			coachIDSet[m.TargetID] = struct{}{}
		}
	}
	coachIDs := make([]int64, 0, len(coachIDSet))
	for id := range coachIDSet {
		coachIDs = append(coachIDs, id)
	}
	coachUsers, err := s.users.ListByIDs(ctx, coachIDs)
	if err != nil {
		return nil, err
	}

	out := make([]*StudentStatRow, 0, len(rows))
	for _, sw := range rows {
		row := &StudentStatRow{
			StudentID: sw.User.ID,
			FirstName: sw.User.FirstName,
			LastName:  sw.User.LastName,
			City:      sw.Student.City,
			IsActive:  sw.User.IsActive,
		}
		if t, ok := totals[sw.User.ID]; ok {
			row.MeetingCount = t.Total
			row.LastMeetingAt = t.LastMeetingAt
		}
		if cid, ok := coachMatchByStudent[sw.User.ID]; ok {
			c := cid
			row.CoachID = &c
			if u, ok := coachUsers[cid]; ok {
				name := u.FirstName + " " + u.LastName
				row.CoachName = &name
			}
		}
		if f.CoachID != nil {
			if row.CoachID == nil || *row.CoachID != *f.CoachID {
				continue
			}
		}
		out = append(out, row)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].MeetingCount < out[j].MeetingCount
	})
	return out, nil
}

type CoachStatRow struct {
	CoachID       int64
	FirstName     string
	LastName      string
	IsActive      bool
	IsApproved    bool
	StudentCount  int
	MeetingsTotal int
	Last30Days    int
	LastMeetingAt *time.Time
}

// CoachStats returns one row per approved coach with assignment/meeting volume.
func (s *ReportService) CoachStats(ctx context.Context) ([]*CoachStatRow, error) {
	approved := true
	coaches, err := s.coaches.List(ctx, &approved)
	if err != nil {
		return nil, err
	}
	if len(coaches) == 0 {
		return []*CoachStatRow{}, nil
	}
	ids := make([]int64, 0, len(coaches))
	for _, c := range coaches {
		ids = append(ids, c.User.ID)
	}
	counts, err := s.matches.CountStudentsByTarget(ctx, ids, domain.MatchTypeCoach)
	if err != nil {
		return nil, err
	}
	since30 := time.Now().Add(-30 * 24 * time.Hour)
	totals, err := s.meetings.CoachMeetingTotals(ctx, ids, since30)
	if err != nil {
		return nil, err
	}
	lastMeet, err := s.meetings.LastMeetingByCoach(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]*CoachStatRow, 0, len(coaches))
	for _, c := range coaches {
		row := &CoachStatRow{
			CoachID:      c.User.ID,
			FirstName:    c.User.FirstName,
			LastName:     c.User.LastName,
			IsActive:     c.User.IsActive,
			IsApproved:   c.Coach.IsApproved,
			StudentCount: counts[c.User.ID],
		}
		if t, ok := totals[c.User.ID]; ok {
			row.MeetingsTotal = t.Total
			row.Last30Days = t.Last30Days
		}
		if l, ok := lastMeet[c.User.ID]; ok {
			lp := l
			row.LastMeetingAt = &lp
		}
		out = append(out, row)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].MeetingsTotal > out[j].MeetingsTotal
	})
	return out, nil
}

type CityDistributionRow struct {
	City         string
	StudentCount int
	CoachCount   int
}

// CityDistribution returns student counts per city. Coach counts are
// per-city via the city of students that coach is assigned to, since coaches
// themselves don't carry a city field.
func (s *ReportService) CityDistribution(ctx context.Context) ([]*CityDistributionRow, error) {
	cityCounts, err := s.students.StudentCountsByCity(ctx)
	if err != nil {
		return nil, err
	}
	if len(cityCounts) == 0 {
		return []*CityDistributionRow{}, nil
	}

	// To compute coach-per-city, join students -> matches(type=coach)
	// then unique by (city, coach_id).
	students, err := s.students.ListFiltered(ctx, repository.StudentListFilter{})
	if err != nil {
		return nil, err
	}
	studentIDs := make([]int64, 0, len(students))
	cityByStudent := make(map[int64]string, len(students))
	for _, sw := range students {
		studentIDs = append(studentIDs, sw.User.ID)
		if sw.Student.City != nil && *sw.Student.City != "" {
			cityByStudent[sw.User.ID] = *sw.Student.City
		}
	}
	matches, err := s.matches.ListByStudents(ctx, studentIDs)
	if err != nil {
		return nil, err
	}
	coachesByCity := make(map[string]map[int64]struct{})
	for _, m := range matches {
		if m.Type != domain.MatchTypeCoach {
			continue
		}
		city, ok := cityByStudent[m.StudentID]
		if !ok {
			continue
		}
		if _, exists := coachesByCity[city]; !exists {
			coachesByCity[city] = map[int64]struct{}{}
		}
		coachesByCity[city][m.TargetID] = struct{}{}
	}

	out := make([]*CityDistributionRow, 0, len(cityCounts))
	for _, c := range cityCounts {
		row := &CityDistributionRow{
			City:         c.City,
			StudentCount: c.Count,
		}
		if set, ok := coachesByCity[c.City]; ok {
			row.CoachCount = len(set)
		}
		out = append(out, row)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].StudentCount > out[j].StudentCount
	})
	return out, nil
}

type MeetingStats struct {
	From         time.Time
	To           time.Time
	Daily        []DailyMeetingPoint
	StatusCounts map[domain.MeetingStatus]int
	Total        int
}

type DailyMeetingPoint struct {
	Day   time.Time
	Count int
}

// MeetingStats returns daily count buckets + status distribution between
// from..to (inclusive, day-aligned). Empty days are filled with 0 so the
// frontend can render a complete series.
func (s *ReportService) MeetingStats(ctx context.Context, from, to time.Time) (*MeetingStats, error) {
	from = startOfDay(from)
	to = endOfDay(to)
	if to.Before(from) {
		from, to = to, from
	}
	buckets, err := s.meetings.DailyCountsBetween(ctx, from, to)
	if err != nil {
		return nil, err
	}
	byDay := make(map[string]int, len(buckets))
	for _, b := range buckets {
		key := b.Day.Format("2006-01-02")
		byDay[key] = b.Count
	}
	out := &MeetingStats{
		From:         from,
		To:           to,
		StatusCounts: map[domain.MeetingStatus]int{},
	}
	for d := startOfDay(from); !d.After(to); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		count := byDay[key]
		out.Daily = append(out.Daily, DailyMeetingPoint{Day: d, Count: count})
		out.Total += count
	}
	statusRows, err := s.meetings.CountByStatusBetween(ctx, from, to)
	if err != nil {
		return nil, err
	}
	for _, sc := range statusRows {
		out.StatusCounts[sc.Status] = sc.Count
	}
	return out, nil
}

type MissingMeetingRow struct {
	StudentID     int64
	FirstName     string
	LastName      string
	City          *string
	CoachID       *int64
	CoachName     *string
	LastMeetingAt *time.Time
	DaysOverdue   int
}

// MissingMeetings returns active students whose last meeting is older than
// intervalDays (or never met). Mirrors OverdueCoaches but from the student
// perspective. Only includes students with an assigned coach — students
// without a coach are flagged elsewhere (matching workbench).
func (s *ReportService) MissingMeetings(ctx context.Context, intervalDays int) ([]*MissingMeetingRow, error) {
	if intervalDays < 0 {
		intervalDays = 0
	}
	active := true
	students, err := s.students.ListFiltered(ctx, repository.StudentListFilter{ActiveOnly: &active})
	if err != nil {
		return nil, err
	}
	if len(students) == 0 {
		return []*MissingMeetingRow{}, nil
	}
	ids := make([]int64, 0, len(students))
	for _, sw := range students {
		ids = append(ids, sw.User.ID)
	}
	totals, err := s.meetings.StudentMeetingTotals(ctx, ids)
	if err != nil {
		return nil, err
	}
	matchesByStudent, err := s.matches.ListByStudents(ctx, ids)
	if err != nil {
		return nil, err
	}
	coachByStudent := make(map[int64]int64)
	coachIDSet := make(map[int64]struct{})
	assignedAtByStudent := make(map[int64]time.Time)
	for _, m := range matchesByStudent {
		if m.Type == domain.MatchTypeCoach {
			coachByStudent[m.StudentID] = m.TargetID
			coachIDSet[m.TargetID] = struct{}{}
			assignedAtByStudent[m.StudentID] = m.AssignedAt
		}
	}
	coachIDs := make([]int64, 0, len(coachIDSet))
	for id := range coachIDSet {
		coachIDs = append(coachIDs, id)
	}
	coachUsers, err := s.users.ListByIDs(ctx, coachIDs)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	out := make([]*MissingMeetingRow, 0, len(students))
	for _, sw := range students {
		cid, hasCoach := coachByStudent[sw.User.ID]
		if !hasCoach {
			continue
		}
		row := &MissingMeetingRow{
			StudentID: sw.User.ID,
			FirstName: sw.User.FirstName,
			LastName:  sw.User.LastName,
			City:      sw.Student.City,
		}
		c := cid
		row.CoachID = &c
		if u, ok := coachUsers[cid]; ok {
			n := u.FirstName + " " + u.LastName
			row.CoachName = &n
		}
		var days int
		if t, ok := totals[sw.User.ID]; ok && t.LastMeetingAt != nil {
			days = daysBetween(*t.LastMeetingAt, now)
			if days <= intervalDays {
				continue
			}
			lm := *t.LastMeetingAt
			row.LastMeetingAt = &lm
		} else {
			if a, ok := assignedAtByStudent[sw.User.ID]; ok {
				days = daysBetween(a, now)
			}
		}
		row.DaysOverdue = days
		out = append(out, row)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].DaysOverdue > out[j].DaysOverdue
	})
	return out, nil
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func endOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 23, 59, 59, int(time.Second-time.Nanosecond), t.Location())
}

// startOfWeek returns the Monday 00:00 in the local timezone for the given
// instant.
func startOfWeek(t time.Time) time.Time {
	d := startOfDay(t)
	wd := int(d.Weekday())
	// Sunday = 0; we want Monday-based week.
	if wd == 0 {
		wd = 7
	}
	return d.AddDate(0, 0, -(wd - 1))
}

type OverdueCoach struct {
	Coach         domain.User
	StudentCount  int
	LastMeetingAt *time.Time
	DaysOverdue   int
}

// OverdueCoaches returns every active+approved coach that either has never had
// a meeting (yet has at least one matched student) or whose last meeting is
// older than intervalDays. Sorted by DaysOverdue desc — the most neglected
// first.
func (s *ReportService) OverdueCoaches(ctx context.Context, intervalDays int) ([]*OverdueCoach, error) {
	if intervalDays < 0 {
		intervalDays = 0
	}
	approved := true
	rows, err := s.coaches.List(ctx, &approved)
	if err != nil {
		return nil, err
	}

	active := make([]*repository.CoachWithUser, 0, len(rows))
	coachIDs := make([]int64, 0, len(rows))
	for _, cw := range rows {
		if !cw.User.IsActive {
			continue
		}
		active = append(active, cw)
		coachIDs = append(coachIDs, cw.User.ID)
	}
	if len(active) == 0 {
		return []*OverdueCoach{}, nil
	}

	counts, err := s.matches.CountStudentsByTarget(ctx, coachIDs, domain.MatchTypeCoach)
	if err != nil {
		return nil, err
	}
	lastMeet, err := s.meetings.LastMeetingByCoach(ctx, coachIDs)
	if err != nil {
		return nil, err
	}
	oldestMatch, err := s.matches.OldestAssignmentByTarget(ctx, coachIDs, domain.MatchTypeCoach)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	out := make([]*OverdueCoach, 0, len(active))
	for _, cw := range active {
		uid := cw.User.ID
		studentCount := counts[uid]
		if studentCount == 0 {
			// no students yet → not overdue by definition
			continue
		}
		last, hasLast := lastMeet[uid]
		var days int
		var lastPtr *time.Time
		if hasLast {
			days = daysBetween(last, now)
			if days <= intervalDays {
				continue
			}
			l := last
			lastPtr = &l
		} else {
			// never met — measure from oldest match if available, else 0.
			if assigned, ok := oldestMatch[uid]; ok {
				days = daysBetween(assigned, now)
			}
		}
		out = append(out, &OverdueCoach{
			Coach:         cw.User,
			StudentCount:  studentCount,
			LastMeetingAt: lastPtr,
			DaysOverdue:   days,
		})
	}

	sort.SliceStable(out, func(i, j int) bool {
		return out[i].DaysOverdue > out[j].DaysOverdue
	})
	return out, nil
}

func daysBetween(from, to time.Time) int {
	diff := to.Sub(from)
	days := int(diff / (24 * time.Hour))
	if days < 0 {
		return 0
	}
	return days
}
