package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"kare-rehber/backend/internal/auth"
	"kare-rehber/backend/internal/config"
	"kare-rehber/backend/internal/db"
	"kare-rehber/backend/internal/domain"
)

// Mock seed: müşterinin uygulamayı dolu hissetmesi için her tablo için bol
// gerçekçi veri üretir. İdempotent değildir — TRUNCATE ile tüm tabloları
// sıfırlar, sonra yeniden doldurur. Üretimde KULLANMA.

const (
	password    = "Demo1234!"
	numCoords   = 12
	numCoaches  = 24
	numStudents = 120
	smsPerUser  = 3
)

var (
	cities = []string{
		"İstanbul", "Ankara", "İzmir", "Bursa", "Antalya",
		"Konya", "Gaziantep", "Şanlıurfa", "Kayseri", "Mersin",
		"Diyarbakır", "Adana", "Eskişehir", "Trabzon", "Samsun",
		"Erzurum", "Malatya", "Denizli", "Manisa", "Sakarya",
	}
	grades = []string{
		"9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf",
		"Mezun (TYT)", "Mezun (AYT)",
	}
	schools = []string{
		"Anadolu Lisesi", "Fen Lisesi", "İmam Hatip Lisesi",
		"Sosyal Bilimler Lisesi", "Meslek Lisesi", "Özel Maarif Koleji",
		"Bilim Lisesi", "Proje Anadolu Lisesi",
	}
	specialties = []string{
		"Matematik", "Türkçe", "Fizik", "Kimya", "Biyoloji",
		"Edebiyat", "Tarih", "Coğrafya", "Sayısal Genel", "Sözel Genel",
		"Eşit Ağırlık", "Rehberlik & Motivasyon",
	}
	maleFirstNames = []string{
		"Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim",
		"Ömer", "Yusuf", "Furkan", "Emre", "Burak", "Kerem", "Eren", "Ege",
		"Çağrı", "Bilal", "Murat", "Onur", "Selim", "Kaan", "Berk",
	}
	femaleFirstNames = []string{
		"Zeynep", "Elif", "Ayşe", "Fatma", "Merve", "Esra", "Büşra",
		"Sümeyye", "Hatice", "Şeyma", "Rabia", "Sena", "Nisa", "Beyza",
		"İrem", "Yasemin", "Selin", "Damla", "Defne", "Gizem",
	}
	lastNames = []string{
		"Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım",
		"Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan",
		"Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Polat",
		"Erdoğan", "Korkmaz", "Çakır",
	}
	meetingTopics = []string{
		"Haftalık ders takip görüşmesi",
		"Deneme sınavı sonuç değerlendirmesi",
		"Motivasyon ve hedef güncelleme",
		"TYT konu eksiklerinin analizi",
		"AYT zaman planlaması",
		"Aile ile ortak değerlendirme",
		"Devamsızlık ve disiplin görüşmesi",
		"Sınav kaygısı üzerine destek görüşmesi",
		"Kariyer ve bölüm tercihi sohbeti",
		"Çalışma ortamı ve dijital alışkanlık görüşmesi",
	}
	meetingContents = []string{
		"Öğrenci son hafta planını %%80 oranında uyguladığını belirtti. Matematik denemelerindeki net sayısı önceki haftaya göre 4 net arttı. AYT Fizik konularında 'Hareket' bölümünde zorlandığını ifade etti, beraber konu özetini çıkarttık.",
		"Sınav kaygısının arttığı bir dönemde olduğunu söyledi. Nefes egzersizleri ve sınav öncesi rutinler hakkında konuştuk. Önümüzdeki hafta için günlük 25 dk meditasyon hedefi koyduk.",
		"Aileyle yaşanan iletişim sorunları gündeme geldi. Velinin de katılacağı bir görüşme planladık, çalışma saatlerinin yeniden düzenlenmesi konusunda mutabık kaldık.",
		"Tercih dönemi yaklaştığı için 3 hedef bölüm üzerinden konuştuk: Bilgisayar Müh., Endüstri Müh., Yazılım Müh. Geçen yılki taban puanları paylaşıldı, öğrencinin hedef net aralığı revize edildi.",
		"Deneme analizi yaptık: Türkçe paragrafta zaman problemi yaşıyor. Önümüzdeki hafta her gün 10 paragraf + süre tutarak çalışma planı çıkardık.",
		"Öğrencinin motivasyonu yüksek, ancak uyku düzeni bozulmuş. Akşam 23:30'da telefon kapatma kuralı koyduk, sabah ders rutinini netleştirdik.",
		"Sosyal medyada geçirdiği süreyi azaltmak istediğini söyledi. Birlikte ekran süresi limitlerini ayarladık. Bir sonraki görüşmede tekrar değerlendireceğiz.",
	}
	meetingEvaluations = []string{
		"Genel gelişim olumlu. Disiplin yüksek, geri bildirimlere açık.",
		"Kararsızlık dönemini atlatma sürecinde. Bir sonraki görüşmede aile de dahil edilmeli.",
		"Performans dalgalı; deneme sonuçları beklentinin altında. Plan revizyonu gerekli.",
		"Çok iyi seviyede. Mevcut tempoyu sürdürebilirse hedef bölüme rahat ulaşır.",
		"Motivasyon düşüklüğü gözleniyor, koordinatöre yönlendirildi.",
		"Hedef üniversitesini netleştirdi, planlama tutarlı, devam edilebilir.",
	}
	messageStarters = []string{
		"Merhabalar, oğlumun bu haftaki görüşme notunu göremedim. Yardımcı olabilir misiniz?",
		"İyi günler, çocuğumun koç ataması ne zaman tamamlanır?",
		"Şifremi unuttum, yeniden gönderebilir misiniz?",
		"Görüşmelerin sıklığı hakkında bilgi alabilir miyim?",
		"Çocuğumun bu ay verdiği denemeleri toplu görmek mümkün mü?",
		"Vakıf koordinatörü ile görüşmek istiyorum, randevu alabilir miyim?",
		"Sistem giriş bilgileri SMS olarak gelmedi, kontrol edebilir misiniz?",
		"Öğrencimin görüşme notunda bir bilgi yanlış görünüyor, düzeltebilir miyiz?",
	}
	messageReplies = []string{
		"Merhaba, ilettiğiniz konuyu inceledim. Koçunuzla iletişime geçip 24 saat içinde dönüş yapacağız.",
		"Ön kaydınız sisteme düştü, kesin kayıt sürecini koordinatörümüz başlatacak.",
		"Yeni şifre az önce telefonunuza SMS olarak gönderildi.",
		"Görüşmeler 2 haftada bir yapılmaktadır. Eksik görüşme olursa size bilgi vereceğiz.",
		"Talebinizi koordinatöre ilettim, en kısa sürede sizinle iletişime geçecekler.",
		"İlgili görüşme notunu güncelleyerek tekrar onaya gönderdim, panelde görünür olacak.",
	}
)

type seeder struct {
	pool   *pgxpool.Pool
	ctx    context.Context
	rng    *rand.Rand
	hash   string
	now    time.Time
	admins []int64
}

func main() {
	cfg := config.Load()
	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		fatal("db connect", err)
	}
	defer pool.Close()

	pwHash, err := auth.HashPassword(password)
	if err != nil {
		fatal("hash password", err)
	}

	s := &seeder{
		pool: pool,
		ctx:  ctx,
		rng:  rand.New(rand.NewSource(42)),
		hash: pwHash,
		now:  time.Now().UTC(),
	}

	slog.Info("mock-seed başladı", "db", cfg.DatabaseURL)

	if err := s.truncateAll(); err != nil {
		fatal("truncate", err)
	}
	if err := s.run(); err != nil {
		fatal("seed", err)
	}

	slog.Info("mock-seed tamamlandı",
		"admin_email", "admin@kare.local",
		"password", password,
		"coordinators", numCoords,
		"coaches", numCoaches,
		"students", numStudents,
	)
}

func fatal(msg string, err error) {
	slog.Error(msg, "err", err)
	os.Exit(1)
}

func (s *seeder) truncateAll() error {
	// CASCADE ile bütün bağlı tablolar da temizlenir; sequence sıfırlanır.
	_, err := s.pool.Exec(s.ctx, `
		TRUNCATE TABLE
			audit_logs,
			messages,
			meetings,
			matches,
			sms_logs,
			coaches,
			students,
			users
		RESTART IDENTITY CASCADE
	`)
	return err
}

func (s *seeder) run() error {
	// 1. Adminler
	adminID, err := s.createUser(userParams{
		role:      domain.RoleAdmin,
		firstName: "Admin",
		lastName:  "Kare",
		phone:     "+905550000000",
		birthdate: date(1985, 4, 12),
		email:     ptr("admin@kare.local"),
		active:    true,
	})
	if err != nil {
		return fmt.Errorf("admin: %w", err)
	}
	s.admins = append(s.admins, adminID)

	secondaryAdminID, err := s.createUser(userParams{
		role:      domain.RoleAdmin,
		firstName: "Sistem",
		lastName:  "Yöneticisi",
		phone:     "+905550000001",
		birthdate: date(1988, 7, 23),
		email:     ptr("yonetici@kare.local"),
		active:    true,
	})
	if err != nil {
		return fmt.Errorf("admin2: %w", err)
	}
	s.admins = append(s.admins, secondaryAdminID)

	// 2. Koordinatörler
	coordIDs := make([]int64, 0, numCoords)
	coordNames := []string{
		"Ulu Vakfı", "Hayrat Vakfı", "Bilge Eğitim Vakfı",
		"İlim Yayma Vakfı", "Türkiye Diyanet Vakfı", "Maarif Vakfı",
		"Anadolu Gençlik Vakfı", "İrfan Vakfı", "Marmara Eğitim Vakfı",
		"Hilal Vakfı", "Şahin Eğitim Vakfı", "Akademi Vakfı",
	}
	for i := 0; i < numCoords; i++ {
		first := pick(s.rng, []string{"Vakıf", "Koordinatör"})
		last := coordNames[i]
		id, err := s.createUser(userParams{
			role:      domain.RoleCoordinator,
			firstName: first,
			lastName:  last,
			phone:     fmt.Sprintf("+90553000%04d", 1000+i),
			birthdate: date(1970+s.rng.Intn(15), 1+s.rng.Intn(12), 1+s.rng.Intn(28)),
			email:     ptr(fmt.Sprintf("koordinator%d@kare.local", i+1)),
			active:    s.rng.Float64() < 0.85,
		})
		if err != nil {
			return fmt.Errorf("coord %d: %w", i, err)
		}
		coordIDs = append(coordIDs, id)
	}

	// 3. Koçlar
	coachIDs := make([]int64, 0, numCoaches)
	coachApproved := make([]bool, 0, numCoaches)
	for i := 0; i < numCoaches; i++ {
		female := s.rng.Float64() < 0.55
		first := pickName(s.rng, female)
		last := pick(s.rng, lastNames)
		approved := s.rng.Float64() < 0.85
		active := approved && s.rng.Float64() < 0.95
		uid, err := s.createUser(userParams{
			role:      domain.RoleCoach,
			firstName: first,
			lastName:  last,
			phone:     fmt.Sprintf("+90554000%04d", 1000+i),
			birthdate: date(1980+s.rng.Intn(20), 1+s.rng.Intn(12), 1+s.rng.Intn(28)),
			email:     ptr(fmt.Sprintf("%s.%s.%d@kare.local", lowerASCII(first), lowerASCII(last), i+1)),
			active:    active,
		})
		if err != nil {
			return fmt.Errorf("coach user %d: %w", i, err)
		}
		spec := pick(s.rng, specialties)
		if _, err := s.pool.Exec(s.ctx,
			`INSERT INTO coaches (user_id, specialty, is_approved) VALUES ($1,$2,$3)`,
			uid, spec, approved,
		); err != nil {
			return fmt.Errorf("coach row %d: %w", i, err)
		}
		coachIDs = append(coachIDs, uid)
		coachApproved = append(coachApproved, approved)
	}

	// 4. Öğrenci + veli + students satırı
	type studentEntry struct {
		ID       int64
		ParentID int64
		City     string
		Active   bool
	}
	students := make([]studentEntry, 0, numStudents)
	for i := 0; i < numStudents; i++ {
		female := s.rng.Float64() < 0.5
		first := pickName(s.rng, female)
		last := pick(s.rng, lastNames)
		city := pick(s.rng, cities)
		active := s.rng.Float64() < 0.85

		sUID, err := s.createUser(userParams{
			role:      domain.RoleStudent,
			firstName: first,
			lastName:  last,
			phone:     fmt.Sprintf("+90555000%04d", 1000+i),
			birthdate: date(2004+s.rng.Intn(6), 1+s.rng.Intn(12), 1+s.rng.Intn(28)),
			email:     nil,
			active:    active,
		})
		if err != nil {
			return fmt.Errorf("student user %d: %w", i, err)
		}

		parentFemale := s.rng.Float64() < 0.55
		parentFirst := pickName(s.rng, parentFemale)
		pUID, err := s.createUser(userParams{
			role:      domain.RoleParent,
			firstName: parentFirst,
			lastName:  last,
			phone:     fmt.Sprintf("+90556000%04d", 1000+i),
			birthdate: date(1970+s.rng.Intn(15), 1+s.rng.Intn(12), 1+s.rng.Intn(28)),
			email:     ptr(fmt.Sprintf("veli.%d@kare.local", i+1)),
			active:    active,
		})
		if err != nil {
			return fmt.Errorf("parent user %d: %w", i, err)
		}

		school := pick(s.rng, schools)
		grade := pick(s.rng, grades)
		if _, err := s.pool.Exec(s.ctx,
			`INSERT INTO students (user_id, school, grade, city, parent_id) VALUES ($1,$2,$3,$4,$5)`,
			sUID, school, grade, city, pUID,
		); err != nil {
			return fmt.Errorf("student row %d: %w", i, err)
		}

		students = append(students, studentEntry{ID: sUID, ParentID: pUID, City: city, Active: active})
	}

	// 5. Eşleştirmeler: her aktif öğrenciyi onaylı koçlardan birine + bir koordinatöre ata.
	approvedCoachIDs := make([]int64, 0, numCoaches)
	for i, id := range coachIDs {
		if coachApproved[i] {
			approvedCoachIDs = append(approvedCoachIDs, id)
		}
	}
	for i, st := range students {
		// %85 öğrenci koç eşlemesi olsun, kalanı "eşleşmeyi bekliyor".
		if s.rng.Float64() < 0.85 && len(approvedCoachIDs) > 0 {
			coach := approvedCoachIDs[i%len(approvedCoachIDs)]
			if _, err := s.pool.Exec(s.ctx,
				`INSERT INTO matches (student_id, target_id, type, assigned_at, assigned_by)
				 VALUES ($1,$2,'coach',$3,$4)`,
				st.ID, coach, s.daysAgo(7+s.rng.Intn(120)), s.admins[0],
			); err != nil {
				return fmt.Errorf("coach match %d: %w", i, err)
			}
		}
		if s.rng.Float64() < 0.80 {
			coord := coordIDs[s.rng.Intn(len(coordIDs))]
			if _, err := s.pool.Exec(s.ctx,
				`INSERT INTO matches (student_id, target_id, type, assigned_at, assigned_by)
				 VALUES ($1,$2,'coordinator',$3,$4)`,
				st.ID, coord, s.daysAgo(10+s.rng.Intn(180)), s.admins[0],
			); err != nil {
				return fmt.Errorf("coord match %d: %w", i, err)
			}
		}
	}

	// 6. Görüşmeler: her eşleşmiş öğrenciye birkaç görüşme, çeşitli statüde.
	coachOfStudent := map[int64]int64{}
	mrows, err := s.pool.Query(s.ctx,
		`SELECT student_id, target_id FROM matches WHERE type='coach'`)
	if err != nil {
		return fmt.Errorf("read coach matches: %w", err)
	}
	for mrows.Next() {
		var sID, cID int64
		if err := mrows.Scan(&sID, &cID); err != nil {
			mrows.Close()
			return fmt.Errorf("scan match: %w", err)
		}
		coachOfStudent[sID] = cID
	}
	mrows.Close()

	statuses := []domain.MeetingStatus{
		domain.MeetingStatusDraft,
		domain.MeetingStatusPending,
		domain.MeetingStatusApproved,
		domain.MeetingStatusApproved,
		domain.MeetingStatusApproved,
	}
	totalMeetings := 0
	for sID, cID := range coachOfStudent {
		n := 2 + s.rng.Intn(6) // 2..7 görüşme
		for j := 0; j < n; j++ {
			st := statuses[s.rng.Intn(len(statuses))]
			content := pick(s.rng, meetingContents)
			topic := pick(s.rng, meetingTopics)
			eval := pick(s.rng, meetingEvaluations)
			dt := s.daysAgo(j*14 + s.rng.Intn(7))
			if _, err := s.pool.Exec(s.ctx,
				`INSERT INTO meetings (student_id, coach_id, meeting_date, content, evaluation, status, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
				sID, cID, dt, topic+"\n\n"+content, eval, st, dt,
			); err != nil {
				return fmt.Errorf("meeting: %w", err)
			}
			totalMeetings++
		}
	}

	// 7. SMS logları: yeni kayıt bilgileri + zaman içinde uyarı vs.
	allUsers := []struct {
		ID    int64
		Phone string
	}{}
	urows, err := s.pool.Query(s.ctx,
		`SELECT id, phone FROM users WHERE role IN ('coach','student','parent','coordinator')`)
	if err != nil {
		return fmt.Errorf("read users for sms: %w", err)
	}
	for urows.Next() {
		var id int64
		var phone string
		if err := urows.Scan(&id, &phone); err != nil {
			urows.Close()
			return err
		}
		allUsers = append(allUsers, struct {
			ID    int64
			Phone string
		}{id, phone})
	}
	urows.Close()

	smsBodies := []string{
		"KARE Eğitim sistemine hoş geldiniz. Giriş linkiniz: https://kare.ulued.org/giris — Kullanıcı adı telefon, parola doğum tarihiniz.",
		"Şifreniz başarıyla güncellendi. Lütfen kimseyle paylaşmayınız.",
		"Bu hafta yapmanız gereken görüşme henüz tamamlanmadı. Lütfen panelden planlayınız.",
		"Yeni bir görüşme notu admin tarafından onaylandı. Panelden görüntüleyebilirsiniz.",
		"Görüşmeniz koordinatörünüze iletildi. Geri dönüş yapılacaktır.",
		"Sistem üzerinden yeni mesajınız var. Lütfen panelden kontrol ediniz.",
	}
	statusOpts := []domain.SMSStatus{
		domain.SMSStatusSent, domain.SMSStatusSent, domain.SMSStatusSent,
		domain.SMSStatusFailed,
	}
	smsCount := 0
	for _, u := range allUsers {
		for j := 0; j < smsPerUser; j++ {
			st := statusOpts[s.rng.Intn(len(statusOpts))]
			body := smsBodies[s.rng.Intn(len(smsBodies))]
			sentAt := s.daysAgo(s.rng.Intn(120))
			if _, err := s.pool.Exec(s.ctx,
				`INSERT INTO sms_logs (user_id, phone, body, status, sent_at)
				 VALUES ($1,$2,$3,$4,$5)`,
				u.ID, u.Phone, body, st, sentAt,
			); err != nil {
				return fmt.Errorf("sms: %w", err)
			}
			smsCount++
		}
	}

	// 8. Mesajlar: hem velilerden hem öğrencilerden admin/koordinatöre.
	threadCount := 0
	for i := 0; i < 40; i++ {
		var senderID int64
		if i%2 == 0 {
			// veli
			senderID = students[s.rng.Intn(len(students))].ParentID
		} else {
			// öğrenci
			senderID = students[s.rng.Intn(len(students))].ID
		}
		var recipientRole domain.MessageRecipientRole
		var recipientID *int64
		if s.rng.Float64() < 0.6 {
			recipientRole = domain.MessageRecipientAdmin
			recipientID = nil // admin pool
		} else {
			recipientRole = domain.MessageRecipientCoordinator
			cid := coordIDs[s.rng.Intn(len(coordIDs))]
			recipientID = &cid
		}
		body := pick(s.rng, messageStarters)
		createdAt := s.daysAgo(s.rng.Intn(45))
		var rootID int64
		row := s.pool.QueryRow(s.ctx,
			`INSERT INTO messages (sender_id, recipient_role, recipient_id, body, thread_id, created_at)
			 VALUES ($1,$2,$3,$4,NULL,$5) RETURNING id`,
			senderID, recipientRole, recipientID, body, createdAt,
		)
		if err := row.Scan(&rootID); err != nil {
			return fmt.Errorf("message root: %w", err)
		}
		threadCount++

		// 0..3 yanıt
		replies := s.rng.Intn(4)
		for r := 0; r < replies; r++ {
			var replierID int64
			if r%2 == 0 {
				if recipientID != nil {
					replierID = *recipientID
				} else {
					replierID = s.admins[s.rng.Intn(len(s.admins))]
				}
			} else {
				replierID = senderID
			}
			replyAt := createdAt.Add(time.Duration(1+r) * 6 * time.Hour)
			var readAt *time.Time
			if r < replies-1 || s.rng.Float64() < 0.5 {
				t := replyAt.Add(2 * time.Hour)
				readAt = &t
			}
			if _, err := s.pool.Exec(s.ctx,
				`INSERT INTO messages (sender_id, recipient_role, recipient_id, body, thread_id, read_at, created_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				replierID, recipientRole, recipientID, pick(s.rng, messageReplies), rootID, readAt, replyAt,
			); err != nil {
				return fmt.Errorf("message reply: %w", err)
			}
		}
	}

	// 9. Audit log örnekleri
	auditCount := 0
	mrows2, err := s.pool.Query(s.ctx,
		`SELECT id FROM meetings ORDER BY random() LIMIT 30`)
	if err != nil {
		return fmt.Errorf("read meetings for audit: %w", err)
	}
	for mrows2.Next() {
		var mid int64
		if err := mrows2.Scan(&mid); err != nil {
			mrows2.Close()
			return err
		}
		diff, _ := json.Marshal(map[string]any{
			"before": map[string]any{"status": "pending"},
			"after":  map[string]any{"status": "approved"},
			"fields": []string{"status"},
		})
		actor := s.admins[s.rng.Intn(len(s.admins))]
		if _, err := s.pool.Exec(s.ctx,
			`INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, diff, created_at)
			 VALUES ('meeting',$1,'approve',$2,$3,$4)`,
			mid, actor, diff, s.daysAgo(s.rng.Intn(30)),
		); err != nil {
			mrows2.Close()
			return fmt.Errorf("audit: %w", err)
		}
		auditCount++
	}
	mrows2.Close()

	slog.Info("özet",
		"meetings", totalMeetings,
		"sms", smsCount,
		"threads", threadCount,
		"audits", auditCount,
	)
	return nil
}

type userParams struct {
	role      domain.Role
	firstName string
	lastName  string
	phone     string
	birthdate time.Time
	email     *string
	active    bool
}

func (s *seeder) createUser(p userParams) (int64, error) {
	var id int64
	row := s.pool.QueryRow(s.ctx,
		`INSERT INTO users (role, first_name, last_name, phone, birthdate, email, password_hash, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		p.role, p.firstName, p.lastName, p.phone, p.birthdate, p.email, s.hash, p.active,
	)
	if err := row.Scan(&id); err != nil {
		return 0, err
	}
	return id, nil
}

func (s *seeder) daysAgo(d int) time.Time {
	return s.now.Add(-time.Duration(d) * 24 * time.Hour)
}

func date(y, m, d int) time.Time {
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC)
}

func ptr[T any](v T) *T { return &v }

func pick[T any](r *rand.Rand, items []T) T {
	return items[r.Intn(len(items))]
}

func pickName(r *rand.Rand, female bool) string {
	if female {
		return pick(r, femaleFirstNames)
	}
	return pick(r, maleFirstNames)
}

// lowerASCII Türkçe karakterleri ASCII'ye dönüştürür (email için).
func lowerASCII(s string) string {
	repl := map[rune]rune{
		'ç': 'c', 'Ç': 'c',
		'ğ': 'g', 'Ğ': 'g',
		'ı': 'i', 'İ': 'i',
		'ö': 'o', 'Ö': 'o',
		'ş': 's', 'Ş': 's',
		'ü': 'u', 'Ü': 'u',
	}
	out := make([]rune, 0, len(s))
	for _, r := range s {
		if v, ok := repl[r]; ok {
			out = append(out, v)
			continue
		}
		if r >= 'A' && r <= 'Z' {
			out = append(out, r+32)
			continue
		}
		out = append(out, r)
	}
	return string(out)
}
