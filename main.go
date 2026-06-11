package main

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/time/rate"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

type User struct {
	UserID       int        `gorm:"primaryKey;column:user_id;autoIncrement" json:"user_id"`
	FullName     string     `gorm:"column:full_name" json:"full_name"`
	Email        string     `gorm:"column:email" json:"email"`
	Password     string     `gorm:"column:password" json:"-"`
	Role         string     `gorm:"column:role" json:"role"`
	Status       string     `gorm:"column:status" json:"status"`
	IsFirstLogin bool       `gorm:"column:is_first_login" json:"is_first_login"`
	LastActive   *time.Time `gorm:"column:last_active" json:"last_active"`
}

type Transaction struct {
	TransactionID int       `gorm:"primaryKey;column:transaction_id" json:"transaction_id"`
	InvoiceNo     string    `gorm:"column:invoice_no;unique" json:"invoice_no"`
	Type          string    `gorm:"column:type" json:"type"`
	ClientVendor  string    `gorm:"column:client_vendor" json:"client_vendor"`
	Amount        float64   `gorm:"column:amount" json:"amount"`
	Description   string    `gorm:"column:description" json:"description"`
	IssueDate     time.Time `gorm:"column:issue_date;default:GETDATE()" json:"issue_date"`
	DueDate       time.Time `gorm:"column:due_date" json:"due_date"`
	Status        string    `gorm:"column:status;default:'Pending'" json:"status"`
}

type Projection struct {
	ProjectionID int       `gorm:"primaryKey;column:projection_id" json:"projection_id"`
	Title        string    `gorm:"column:title" json:"title"`
	Amount       float64   `gorm:"column:amount" json:"amount"`
	DueDate      time.Time `gorm:"column:due_date" json:"due_date"`
	Category     string    `gorm:"column:category" json:"category"`
}

type Ticket struct {
	ID               int        `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	NoTiket          string     `gorm:"column:ticket_id" json:"no_tiket"`
	Pelanggan        string     `gorm:"column:pelanggan" json:"pelanggan"`
	Masalah          string     `gorm:"column:issue_description" json:"masalah"`
	Prioritas        string     `gorm:"column:priority" json:"prioritas"`
	SLA              string     `gorm:"column:sla" json:"sla"`
	SLATarget        *time.Time `gorm:"column:sla_target" json:"sla_target"`
	TeknisiID        int        `gorm:"column:assigned_user_id" json:"teknisi_id"`
	Status           string     `gorm:"column:status" json:"status"`
	CreatedAt        time.Time  `gorm:"column:create_at;autoCreateTime:false" json:"created_at"`
	Diagnostik       string     `gorm:"column:diagnostik" json:"diagnostik"`
	Tindakan         string     `gorm:"column:tindakan" json:"tindakan"`
	Inventaris       string     `gorm:"column:inventaris" json:"inventaris"`
	FotoBefore       string     `gorm:"column:foto_before" json:"foto_before"`
	FotoAfter        string     `gorm:"column:foto_after" json:"foto_after"`
	ResolvedAt       *time.Time `gorm:"column:resolved_at" json:"resolved_at"`
	LokasiPengerjaan string     `gorm:"column:lokasi_pengerjaan" json:"lokasi_pengerjaan"`
	ClientID         *int       `gorm:"column:client_id" json:"client_id"`
}

type TicketLog struct {
	LogID       int       `gorm:"primaryKey;column:log_id;autoIncrement" json:"log_id"`
	TicketID    int       `gorm:"column:ticket_id;index" json:"ticket_id"`
	UserID      int       `gorm:"column:user_id" json:"user_id"`
	UserName    string    `gorm:"column:user_name" json:"user_name"`
	ActionType  string    `gorm:"column:action_type" json:"action_type"`
	Description string    `gorm:"column:description" json:"description"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

type SystemLog struct {
	LogID       int       `gorm:"primaryKey;column:log_id;autoIncrement" json:"log_id"`
	UserID      int       `gorm:"column:user_id;index" json:"user_id"`
	UserName    string    `gorm:"column:user_name" json:"user_name"`
	Role        string    `gorm:"column:role" json:"role"`
	Module      string    `gorm:"column:module" json:"module"`
	Action      string    `gorm:"column:action" json:"action"`
	Description string    `gorm:"column:description" json:"description"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

type Notification struct {
	ID        int       `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	UserID    int       `gorm:"column:user_id;index" json:"user_id"`
	Title     string    `gorm:"column:title" json:"title"`
	Message   string    `gorm:"column:message" json:"message"`
	IsRead    bool      `gorm:"column:is_read;default:false" json:"is_read"`
	TicketID  int       `gorm:"column:ticket_id;default:0" json:"ticket_id"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

type Client struct {
	ID            int       `gorm:"primaryKey;column:client_id;autoIncrement" json:"id"`
	Name          string    `gorm:"column:company_name" json:"name"`
	PIC           string    `gorm:"column:pic_technical_name" json:"pic"`
	Phone         string    `gorm:"column:phone" json:"phone"`
	PackageType   string    `gorm:"column:package_type" json:"package_type"`
	TicketQuota   int       `gorm:"column:ticket_quota" json:"ticket_quota"`
	TicketUsed    int       `gorm:"column:ticket_used;default:0" json:"ticket_used"`
	AddOnServices string    `gorm:"column:add_on_services" json:"add_on_services"`
	ContractEnd   time.Time `gorm:"column:contract_end_date" json:"contract_end"`
	Assets        string    `gorm:"column:assets" json:"assets"`
	Status        string    `gorm:"column:status;default:'active'" json:"status"`
}

type JwtCustomClaims struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func main() {
	// [MAINTENANCE] Konfigurasi koneksi ke Database (Berpindah ke MariaDB/MySQL untuk VPS)
	dsn := "galasus:RahasiaGalasus2026@tcp(127.0.0.1:3306)/galasusdb?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Gagal konek database: ", err)
	}

	os.MkdirAll("public/uploads", os.ModePerm)

	db.AutoMigrate(&TicketLog{}, &SystemLog{})
	db.AutoMigrate(&Notification{})
	db.AutoMigrate(&User{}, &Transaction{}, &Projection{}, &Ticket{}, &Client{})

	// AUTO SEEDER: Buat akun Super Admin default jika tabel users masih kosong
	var userCount int64
	db.Model(&User{}).Count(&userCount)
	if userCount == 0 {
		hashedBytes, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
		defaultAdmin := User{
			FullName: "Super Administrator",
			Email:    "admin@galasus.com",
			Password: string(hashedBytes), // Bcrypt hashed password
			Role:     "super admin",
			Status:   "active",
		}
		db.Create(&defaultAdmin)
		fmt.Println("==========================================================")
		fmt.Println("🚀 AUTO-SEEDER: Akun God Mode berhasil diciptakan!")
		fmt.Println("📧 Email: admin@galasus.com")
		fmt.Println("🔑 Password: admin")
		fmt.Println("==========================================================")
	}
	fmt.Println("Database Galasusdb Siap.")

	e := echo.New()
	e.Use(middleware.Recover())
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(rate.Limit(20)))) // 20 requests per second limit
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	logSystemActivity := func(userID int, userName, role, module, action, desc string) {
		logEntry := SystemLog{
			UserID:      userID,
			UserName:    userName,
			Role:        role,
			Module:      module,
			Action:      action,
			Description: desc,
		}
		db.Create(&logEntry)
	}

	e.Static("/public", "public")
	e.Static("/assets", "assets")
	e.Static("/views", "views")

	// Redirect root URL ke halaman Login
	e.GET("/", func(c echo.Context) error {
		return c.Redirect(http.StatusMovedPermanently, "/views/login.html")
	})

	// [SECURITY] Konfigurasi JWT (JSON Web Token)
	// Pastikan 'SigningKey' ini diubah menjadi environment variable di server production.
	jwtConfig := echojwt.Config{
		SigningKey: []byte("RAHASIA_DAPUR_GALASUS_2026"),
	}

	// [MIDDLEWARE] Satpam Middleware
	// Fungsi ini mengecek apakah token JWT valid, user masih ada di DB, dan akunnya tidak di-suspend.
	// Wajib dipasang di semua route yang membutuhkan login.
	satpamMiddleware := func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userToken, ok := c.Get("user").(*jwt.Token)
			if !ok {
				return next(c)
			}
			claims, ok := userToken.Claims.(jwt.MapClaims)
			if !ok {
				return next(c)
			}

			userID := int(claims["user_id"].(float64))
			var user User
			if err := db.First(&user, userID).Error; err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Pengguna tidak ditemukan dalam sistem"})
			}
			if user.Status == "suspended" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Akses Ditolak: Akun Anda telah ditangguhkan."})
			}
			now := time.Now().UTC()
			db.Model(&user).Update("last_active", now)

			return next(c)
		}
	}

	e.POST("/login", func(c echo.Context) error {
		req := new(LoginRequest)
		if err := c.Bind(req); err != nil {
			return c.JSON(400, map[string]string{"message": "Format data tidak valid"})
		}
		var user User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			return c.JSON(401, map[string]string{"message": "Kredensial tidak ditemukan"})
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			return c.JSON(401, map[string]string{"message": "Kredensial tidak valid"})
		}
		if user.Status == "suspended" {
			return c.JSON(401, map[string]string{"message": "Akses Ditolak: Akun Anda sedang ditangguhkan."})
		}

		claims := &JwtCustomClaims{
			UserID: user.UserID,
			Name:   user.FullName,
			Role:   user.Role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		t, err := token.SignedString([]byte("RAHASIA_DAPUR_GALASUS_2026"))
		if err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal menghasilkan token"})
		}

		// LOG ACTIVITY: Login Success
		logSystemActivity(user.UserID, user.FullName, user.Role, "System", "Login", "Berhasil login ke dalam sistem")

		return c.JSON(200, map[string]interface{}{
			"token":          t,
			"role":           user.Role,
			"name":           user.FullName,
			"is_first_login": user.IsFirstLogin,
		})
	})

	e.POST("/change-password", func(c echo.Context) error {
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		userID := int(claims["user_id"].(float64))

		var input struct {
			NewPassword string `json:"new_password"`
		}
		if err := c.Bind(&input); err != nil || input.NewPassword == "" {
			return c.JSON(400, map[string]string{"message": "Kata sandi baru tidak valid"})
		}

		hashedBytes, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

		if err := db.Model(&User{}).Where("user_id = ?", userID).Updates(map[string]interface{}{
			"password":       string(hashedBytes),
			"is_first_login": false,
		}).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal menyimpan kata sandi baru"})
		}

		return c.JSON(200, map[string]string{"message": "Kata sandi berhasil diperbarui!"})
	}, echojwt.WithConfig(jwtConfig), satpamMiddleware)

	e.GET("/heartbeat", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"message": "OK"})
	}, echojwt.WithConfig(jwtConfig), satpamMiddleware)

	e.GET("/api/system/metrics", func(c echo.Context) error {
		// Dapatkan informasi memori (RAM)
		v, errMem := mem.VirtualMemory()
		memLoad := 0.0
		if errMem == nil {
			memLoad = v.UsedPercent
		}

		// Dapatkan uptime host
		h, errHost := host.Info()
		uptimeSeconds := uint64(0)
		if errHost == nil {
			uptimeSeconds = h.Uptime
		}

		// Hitung persentase Uptime (Simulasi sederhana dengan membulatkan menjadi 99.xx)
		// Dalam realita, uptime dihitung berdasarkan log monitoring. 
		// Karena kita ambil uptime OS secara langsung, ini adalah waktu sistem hidup.
		// Untuk dasbor, kita tampilkan dalam bentuk hari/jam atau persentase statis jika baru jalan.
		// Mari kita kembalikan raw data agar frontend yang format.
		return c.JSON(200, map[string]interface{}{
			"ram_usage_percent": fmt.Sprintf("%.1f%%", memLoad),
			"uptime_seconds":    uptimeSeconds,
			"os_name":           h.OS,
		})
	}, echojwt.WithConfig(jwtConfig), satpamMiddleware)

	// ==========================================
	// GROUP: ADMIN SISTEM & MANAJEMEN PENGGUNA
	// ==========================================
	adminGroup := e.Group("", echojwt.WithConfig(jwtConfig), satpamMiddleware)
	adminGroup.GET("/audit-logs", func(c echo.Context) error {
		var logs []SystemLog
		query := db.Order("created_at desc")
		
		startDateStr := c.QueryParam("start_date")
		endDateStr := c.QueryParam("end_date")
		
		if startDateStr != "" && endDateStr != "" {
			startDate, err1 := time.Parse("2006-01-02", startDateStr)
			endDate, err2 := time.Parse("2006-01-02", endDateStr)
			if err1 == nil && err2 == nil {
				endDate = endDate.Add(24 * time.Hour) // Include entire end date
				query = query.Where("created_at >= ? AND created_at < ?", startDate, endDate)
			}
		} else {
			query = query.Limit(100)
		}

		query.Find(&logs)
		return c.JSON(200, logs)
	})

	adminGroup.GET("/users", func(c echo.Context) error {
		var users []User
		db.Find(&users)
		return c.JSON(200, users)
	})
	adminGroup.POST("/register", func(c echo.Context) error {
		req := new(User)
		c.Bind(req)

		if !strings.HasSuffix(strings.ToLower(req.Email), "@galasus.com") {
			return c.JSON(400, map[string]string{"message": "Hanya email dengan domain @galasus.com yang diizinkan!"})
		}

		hashedBytes, _ := bcrypt.GenerateFromPassword([]byte("Galasus123!"), bcrypt.DefaultCost)
		req.Password = string(hashedBytes)
		req.Status = "active"
		req.IsFirstLogin = true
		db.Create(&req)

		// LOG ACTIVITY
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		creatorID := int(claims["user_id"].(float64))
		creatorName := claims["name"].(string)
		creatorRole := claims["role"].(string)
		logSystemActivity(creatorID, creatorName, creatorRole, "User Management", "Create User", fmt.Sprintf("Mendaftarkan pengguna baru: %s (%s)", req.FullName, req.Role))

		return c.JSON(201, req)
	})

	adminGroup.PUT("/users/:id", func(c echo.Context) error {
		id := c.Param("id")
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		currentUserIDStr := fmt.Sprintf("%.0f", claims["user_id"].(float64))

		var user User
		if err := db.First(&user, id).Error; err != nil {
			return c.JSON(404, "Pengguna tidak ditemukan")
		}

		var input struct {
			FullName string `json:"full_name"`
			Email    string `json:"email"`
			Role     string `json:"role"`
			Status   string `json:"status"`
		}
		if err := c.Bind(&input); err == nil {
			if id == currentUserIDStr && input.Status == "suspended" {
				return c.JSON(403, map[string]string{"message": "Operasi Ditolak: Anda tidak dapat menangguhkan akun Anda sendiri."})
			}
			if input.FullName != "" {
				user.FullName = input.FullName
			}
			if input.Email != "" {
				user.Email = input.Email
			}
			if input.Role != "" {
				user.Role = input.Role
			}
			if input.Status != "" {
				user.Status = input.Status
			}
		}
		db.Save(&user)
		return c.JSON(200, user)
	})

	adminGroup.GET("/api/dashboard", func(c echo.Context) error {
		var totalClients int64
		var totalTickets int64
		var totalRevenue float64
		var criticalIncidents int64

		db.Model(&Client{}).Where("status = ?", "active").Count(&totalClients)
		db.Model(&Ticket{}).Where("status != ?", "closed").Count(&totalTickets)
		db.Model(&Transaction{}).Where("invoice_no LIKE 'INV/%'").Select("COALESCE(SUM(amount), 0)").Row().Scan(&totalRevenue)
		db.Model(&Ticket{}).Where("status NOT IN ('closed', 'resolved', 'success') AND (sla_target < ? OR priority = 'Kritis' OR priority = 'kritis')", time.Now().UTC()).Count(&criticalIncidents)

		var recentClients []Client
		db.Limit(5).Order("client_id desc").Find(&recentClients)

		return c.JSON(200, map[string]interface{}{
			"statistik": map[string]interface{}{
				"proyek_aktif":   totalClients,
				"tiket_bantuan":  totalTickets,
				"pendapatan":     totalRevenue,
				"insiden_kritis": criticalIncidents,
			},
			"klien_terbaru": recentClients,
		})
	})

	adminGroup.PUT("/users/:id/reset-password", func(c echo.Context) error {
		id := c.Param("id")
		hashedBytes, _ := bcrypt.GenerateFromPassword([]byte("Galasus123!"), bcrypt.DefaultCost)
		if err := db.Model(&User{}).Where("user_id = ?", id).Updates(map[string]interface{}{
			"password":       string(hashedBytes),
			"is_first_login": true,
		}).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal mengatur ulang kata sandi"})
		}
		return c.JSON(200, map[string]string{"message": "Kata sandi berhasil dikembalikan ke standar sistem (Galasus123!)"})
	})

	adminGroup.DELETE("/users/:id", func(c echo.Context) error {
		id := c.Param("id")
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		currentUserIDStr := fmt.Sprintf("%.0f", claims["user_id"].(float64))

		if id == currentUserIDStr {
			return c.JSON(403, map[string]string{"message": "Operasi Ditolak: Anda tidak dapat menghapus akun Anda sendiri."})
		}
		db.Delete(&User{}, id)
		return c.JSON(200, "Dihapus")
	})

	// ==========================================
	// GROUP: MODUL KEUANGAN (FINANCE)
	// ==========================================
	financeGroup := e.Group("", echojwt.WithConfig(jwtConfig), satpamMiddleware)
	financeGroup.GET("/transactions", func(c echo.Context) error {
		rangeParam := c.QueryParam("range")
		var trans []Transaction
		query := db.Order("issue_date desc")

		now := time.Now()
		switch rangeParam {
		case "7days":
			query = query.Where("issue_date >= ?", now.AddDate(0, 0, -7))
		case "30days":
			query = query.Where("issue_date >= ?", now.AddDate(0, 0, -30))
		case "1year":
			// Year to Date (Jan 1st)
			query = query.Where("issue_date >= ?", time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location()))
		case "2years":
			query = query.Where("issue_date >= ?", now.AddDate(-2, 0, 0))
		default:
			// Default behavior if range is not provided or unrecognized
			query = query.Where("issue_date >= ?", now.AddDate(0, 0, -30))
		}

		query.Find(&trans)
		return c.JSON(200, trans)
	})
	financeGroup.POST("/transactions", func(c echo.Context) error {
		req := new(Transaction)
		c.Bind(req)
		var count int64
		db.Model(&Transaction{}).Count(&count)

		prefix := "INV"
		if req.Type == "Masuk" || req.Type == "Expense" {
			prefix = "EXP"
		}
		req.InvoiceNo = fmt.Sprintf("%s/%d/%03d", prefix, time.Now().Year(), count+1)
		req.IssueDate = time.Now()
		db.Create(&req)

		// LOG ACTIVITY
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		creatorID := int(claims["user_id"].(float64))
		creatorName := claims["name"].(string)
		creatorRole := claims["role"].(string)
		logSystemActivity(creatorID, creatorName, creatorRole, "Finance", "Create Transaction", fmt.Sprintf("Membuat transaksi: %s - %s", req.InvoiceNo, req.Description))

		return c.JSON(201, req)
	})
	financeGroup.PUT("/transactions/:id", func(c echo.Context) error {
		id := c.Param("id")
		var trans Transaction
		if err := db.First(&trans, id).Error; err != nil {
			return c.JSON(404, "Transaksi tidak ditemukan")
		}
		var input struct {
			Status string `json:"status"`
		}
		if err := c.Bind(&input); err == nil && input.Status != "" {
			trans.Status = input.Status
		}
		db.Save(&trans)
		return c.JSON(200, trans)
	})
	financeGroup.GET("/projections", func(c echo.Context) error {
		var projs []Projection
		db.Find(&projs)
		return c.JSON(200, projs)
	})
	financeGroup.POST("/projections", func(c echo.Context) error {
		req := new(Projection)
		if err := c.Bind(req); err != nil {
			return c.JSON(400, map[string]string{"message": "Format data tidak valid"})
		}
		if err := db.Create(&req).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal menyimpan ke basis data"})
		}
		return c.JSON(201, req)
	})
	financeGroup.POST("/projections/:id/execute", func(c echo.Context) error {
		id := c.Param("id")
		var p Projection
		if err := db.First(&p, id).Error; err != nil {
			return c.JSON(404, "Proyeksi anggaran tidak ditemukan")
		}
		trans := Transaction{
			InvoiceNo:    fmt.Sprintf("EXP/%d/%d", time.Now().Year(), time.Now().Unix()),
			Type:         "Expense",
			ClientVendor: "Eksekusi Proyeksi",
			Description:  p.Title,
			Amount:       p.Amount,
			IssueDate:    time.Now(),
			DueDate:      p.DueDate,
			Status:       "Lunas",
		}
		if err := db.Create(&trans).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal mencatat transaksi eksekusi"})
		}
		db.Delete(&p)
		return c.JSON(200, map[string]string{"message": "Proyeksi berhasil dieksekusi menjadi pengeluaran"})
	})
	financeGroup.PUT("/projections/:id", func(c echo.Context) error {
		id := c.Param("id")
		var p Projection
		if err := db.First(&p, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Proyeksi anggaran tidak ditemukan"})
		}
		req := new(Projection)
		if err := c.Bind(req); err != nil {
			return c.JSON(400, map[string]string{"message": "Format data tidak valid"})
		}
		db.Model(&p).Updates(Projection{Title: req.Title, Amount: req.Amount, DueDate: req.DueDate})
		return c.JSON(200, map[string]string{"message": "Proyeksi berhasil diperbarui"})
	})
	financeGroup.DELETE("/projections/:id", func(c echo.Context) error {
		id := c.Param("id")
		if err := db.Delete(&Projection{}, id).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal menghapus proyeksi"})
		}
		return c.JSON(200, map[string]string{"message": "Proyeksi berhasil dihapus"})
	})

	// ==========================================
	// GROUP: LAYANAN BANTUAN (SERVICE DESK)
	// ==========================================
	ticketGroup := e.Group("", echojwt.WithConfig(jwtConfig), satpamMiddleware)
	ticketGroup.GET("/tickets", func(c echo.Context) error {
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		role := claims["role"].(string)
		userID := int(claims["user_id"].(float64))

		query := db.Table("tickets").Select("tickets.*, users.full_name as teknisi_name").
			Joins("left join users on users.user_id = tickets.assigned_user_id")

		if role == "teknisi" {
			query = query.Where("tickets.status = 'open' OR tickets.assigned_user_id = ? OR tickets.id IN (SELECT ticket_id FROM ticket_logs WHERE user_id = ?)", userID, userID)
		}

		var result []map[string]interface{}
		query.Order("tickets.create_at desc").Find(&result)
		return c.JSON(200, result)
	})

	ticketGroup.POST("/tickets", func(c echo.Context) error {
		t := new(Ticket)
		c.Bind(t)
		t.Status = "open"
		if t.CreatedAt.IsZero() {
			t.CreatedAt = time.Now().UTC()
		}

		var hours int
		if _, err := fmt.Sscanf(t.SLA, "%d", &hours); err == nil && hours > 0 {
			target := t.CreatedAt.Add(time.Duration(hours) * time.Hour)
			t.SLATarget = &target
		} else {
			target := t.CreatedAt.Add(2 * time.Hour)
			t.SLATarget = &target
		}
		var count int64
		db.Model(&Ticket{}).Count(&count)
		t.NoTiket = fmt.Sprintf("#SD-%d", 1024+count)

		if err := db.Create(&t).Error; err != nil {
			return c.JSON(500, map[string]string{"message": err.Error()})
		}

		if t.ClientID != nil && *t.ClientID > 0 {
			var client Client
			if err := db.First(&client, *t.ClientID).Error; err == nil {
				client.TicketUsed += 1
				db.Save(&client)
			}
		}

		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		creatorID := int(claims["user_id"].(float64))
		creatorName := claims["name"].(string)
		creatorRole := claims["role"].(string)
		logSystemActivity(creatorID, creatorName, creatorRole, "Ticket", "Create Ticket", fmt.Sprintf("Membuat tiket bantuan baru: %s", t.NoTiket))

		return c.JSON(201, t)
	})

	ticketGroup.PUT("/tickets/take/:id", func(c echo.Context) error {
		id := c.Param("id")
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		teknisiID := int(claims["user_id"].(float64))
		teknisiName := claims["name"].(string)

		var ticket Ticket
		if err := db.First(&ticket, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Data tiket tidak ditemukan"})
		}
		ticket.Status = "on-progress"
		ticket.TeknisiID = teknisiID
		if err := db.Save(&ticket).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal mengalokasikan tiket"})
		}

		db.Create(&TicketLog{
			TicketID:    ticket.ID,
			UserID:      teknisiID,
			UserName:    teknisiName,
			ActionType:  "Diambil Alih",
			Description: "Tiket diambil alih dan mulai dikerjakan.",
			CreatedAt:   time.Now(),
		})

		return c.JSON(200, map[string]string{"message": "Tiket berhasil dialokasikan kepada Anda"})
	})

	ticketGroup.GET("/tickets/:id/logs", func(c echo.Context) error {
		id := c.Param("id")
		var logs []TicketLog
		if err := db.Where("ticket_id = ?", id).Order("created_at asc").Find(&logs).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal mengambil riwayat tiket"})
		}
		return c.JSON(200, logs)
	})

	ticketGroup.POST("/tickets/:id/logs", func(c echo.Context) error {
		id := c.Param("id")
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		userID := int(claims["user_id"].(float64))
		userName := claims["name"].(string)

		var input struct {
			Description string `json:"description"`
		}
		if err := c.Bind(&input); err != nil {
			return c.JSON(400, map[string]string{"message": "Format data tidak valid"})
		}

		var ticket Ticket
		if err := db.First(&ticket, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Tiket tidak ditemukan"})
		}

		logEntry := TicketLog{
			TicketID:    ticket.ID,
			UserID:      userID,
			UserName:    userName,
			ActionType:  "Update Progress",
			Description: input.Description,
			CreatedAt:   time.Time{}, // DB will auto create
		}
		if err := db.Create(&logEntry).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal menyimpan log"})
		}

		// Create Notification for the assigned technician if the commenter is NOT the assigned technician
		if ticket.TeknisiID != 0 && ticket.TeknisiID != userID {
			notif := Notification{
				UserID:   ticket.TeknisiID,
				Title:    "Pembaruan Tiket: " + ticket.NoTiket,
				Message:  fmt.Sprintf("%s menambahkan catatan: %s", userName, input.Description),
				IsRead:   false,
				TicketID: ticket.ID,
			}
			db.Create(&notif)
		}

		return c.JSON(201, logEntry)
	})

	ticketGroup.PUT("/tickets/:id/assign", func(c echo.Context) error {
		id := c.Param("id")
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		currentUserID := int(claims["user_id"].(float64))
		currentUserName := claims["name"].(string)

		var input struct {
			TargetUserID int `json:"target_user_id"`
		}
		if err := c.Bind(&input); err != nil {
			return c.JSON(400, map[string]string{"message": "Format data tidak valid"})
		}

		var targetUser User
		if err := db.First(&targetUser, input.TargetUserID).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Teknisi penerima tidak ditemukan"})
		}

		var ticket Ticket
		if err := db.First(&ticket, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Tiket tidak ditemukan"})
		}

		ticket.TeknisiID = targetUser.UserID
		db.Save(&ticket)

		logEntry := TicketLog{
			TicketID:    ticket.ID,
			UserID:      currentUserID,
			UserName:    currentUserName,
			ActionType:  "Handoff",
			Description: fmt.Sprintf("Tiket dipindahtangankan kepada %s", targetUser.FullName),
			CreatedAt:   time.Time{}, // DB will auto create
		}
		db.Create(&logEntry)

		// Create Notification for the target user
		notif := Notification{
			UserID:   targetUser.UserID,
			Title:    "Penugasan Tiket Baru: " + ticket.NoTiket,
			Message:  fmt.Sprintf("Tiket telah didelegasikan kepada Anda oleh %s.", currentUserName),
			IsRead:   false,
			TicketID: ticket.ID,
		}
		db.Create(&notif)

		return c.JSON(200, map[string]string{"message": "Tiket berhasil dipindahtangankan"})
	})

	ticketGroup.PUT("/tickets/:id/extend-sla", func(c echo.Context) error {
		id := c.Param("id")
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		currentUserID := int(claims["user_id"].(float64))
		currentUserName := claims["name"].(string)

		var input struct {
			Hours int `json:"hours"`
		}
		if err := c.Bind(&input); err != nil || input.Hours <= 0 {
			return c.JSON(400, map[string]string{"message": "Format jam tidak valid"})
		}

		var ticket Ticket
		if err := db.First(&ticket, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Tiket tidak ditemukan"})
		}

		if ticket.Status == "closed" || ticket.Status == "resolved" || ticket.Status == "success" {
			return c.JSON(400, map[string]string{"message": "Tiket yang sudah selesai tidak bisa diperpanjang SLA-nya"})
		}

		if ticket.SLATarget != nil {
			newTarget := ticket.SLATarget.Add(time.Duration(input.Hours) * time.Hour)
			ticket.SLATarget = &newTarget
		} else {
			newTarget := time.Now().Add(time.Duration(input.Hours) * time.Hour)
			ticket.SLATarget = &newTarget
		}
		db.Save(&ticket)

		logEntry := TicketLog{
			TicketID:    ticket.ID,
			UserID:      currentUserID,
			UserName:    currentUserName,
			ActionType:  "Update SLA",
			Description: fmt.Sprintf("Waktu SLA ditambah sebesar %d Jam", input.Hours),
			CreatedAt:   time.Now(),
		}
		db.Create(&logEntry)

		return c.JSON(200, map[string]string{"message": "Batas waktu SLA berhasil diperpanjang"})
	})

	ticketGroup.GET("/technicians", func(c echo.Context) error {
		var users []User
		db.Select("user_id, full_name, role, status").Where("role IN ?", []string{"technician", "TECHNICIAN", "teknisi"}).Find(&users)
		return c.JSON(200, users)
	})

	ticketGroup.POST("/tickets/report/:id", func(c echo.Context) error {
		id := c.Param("id")
		var ticket Ticket
		if err := db.First(&ticket, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Data tiket tidak ditemukan"})
		}

		updates := map[string]interface{}{
			"diagnostik":        c.FormValue("diagnostik"),
			"tindakan":          c.FormValue("tindakan"),
			"inventaris":        c.FormValue("inventaris"),
			"lokasi_pengerjaan": c.FormValue("lokasi"),
			"status":            "closed",
			"resolved_at":       time.Now().UTC(),
		}

		if file, err := c.FormFile("foto_before"); err == nil {
			path := filepath.Join("public/uploads", fmt.Sprintf("%d_b_%s", time.Now().Unix(), file.Filename))
			saveUploadedFile(file, path)
			updates["foto_before"] = "/" + path
		}
		if file, err := c.FormFile("foto_after"); err == nil {
			path := filepath.Join("public/uploads", fmt.Sprintf("%d_a_%s", time.Now().Unix(), file.Filename))
			saveUploadedFile(file, path)
			updates["foto_after"] = "/" + path
		}

		if err := db.Model(&ticket).Updates(updates).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal memperbarui basis data: " + err.Error()})
		}
		return c.JSON(200, map[string]string{"message": "Laporan berhasil diunggah dan tiket ditutup"})
	})

	ticketGroup.DELETE("/tickets/:id", func(c echo.Context) error {
		id := c.Param("id")
		var ticket Ticket
		if err := db.First(&ticket, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Data tiket tidak ditemukan"})
		}

		if ticket.ClientID != nil && *ticket.ClientID > 0 {
			var client Client
			if err := db.First(&client, *ticket.ClientID).Error; err == nil {
				if client.TicketUsed > 0 {
					client.TicketUsed -= 1
					db.Save(&client)
				}
			}
		}

		if ticket.FotoBefore != "" {
			os.Remove(strings.TrimPrefix(ticket.FotoBefore, "/"))
		}
		if ticket.FotoAfter != "" {
			os.Remove(strings.TrimPrefix(ticket.FotoAfter, "/"))
		}

		db.Delete(&ticket)
		return c.JSON(200, map[string]string{"message": "Tiket berhasil dihapus dan kuota layanan dikembalikan"})
	})

	// ==========================================
	// GROUP: MANAJEMEN KLIEN (CLIENT MANAGEMENT)
	// ==========================================
	clientGroup := e.Group("/clients", echojwt.WithConfig(jwtConfig), satpamMiddleware)
	clientGroup.GET("", func(c echo.Context) error {
		var clients []Client
		db.Find(&clients)
		return c.JSON(200, clients)
	})
	clientGroup.POST("", func(c echo.Context) error {
		req := new(Client)
		if err := c.Bind(req); err != nil {
			return c.JSON(400, map[string]string{"message": "Format data tidak valid"})
		}
		if err := db.Create(&req).Error; err != nil {
			return c.JSON(500, map[string]string{"message": err.Error()})
		}

		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		creatorID := int(claims["user_id"].(float64))
		creatorName := claims["name"].(string)
		creatorRole := claims["role"].(string)
		logSystemActivity(creatorID, creatorName, creatorRole, "Client Management", "Create Client", fmt.Sprintf("Mendaftarkan klien baru: %s", req.Name))

		return c.JSON(201, req)
	})

	// RUTE BARU: EDIT DETAIL KLIEN TANPA MENGHAPUS
	clientGroup.PUT("/:id", func(c echo.Context) error {
		id := c.Param("id")
		var client Client
		if err := db.First(&client, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Klien tidak ditemukan"})
		}

		var input struct {
			Name          string `json:"name"`
			PIC           string `json:"pic"`
			Phone         string `json:"phone"`
			PackageType   string `json:"package_type"`
			TicketQuota   int    `json:"ticket_quota"`
			AddOnServices string `json:"add_on_services"`
			Assets        string `json:"assets"`
			ContractEnd   string `json:"contract_end"`
		}

		if err := c.Bind(&input); err == nil {
			if input.Name != "" {
				client.Name = input.Name
			}
			if input.PIC != "" {
				client.PIC = input.PIC
			}
			if input.Phone != "" {
				client.Phone = input.Phone
			}
			if input.PackageType != "" {
				client.PackageType = input.PackageType
			}
			if input.TicketQuota > 0 {
				client.TicketQuota = input.TicketQuota
			}
			if input.AddOnServices != "" {
				client.AddOnServices = input.AddOnServices
			}
			if input.Assets != "" {
				client.Assets = input.Assets
			}
			if input.ContractEnd != "" && input.ContractEnd != "T00:00:00Z" {
				if parsedTime, err := time.Parse(time.RFC3339, input.ContractEnd); err == nil {
					client.ContractEnd = parsedTime
				}
			}
		}
		db.Save(&client)
		return c.JSON(200, map[string]string{"message": "Data Klien berhasil diperbarui!"})
	})

	clientGroup.PUT("/:id/deactivate", func(c echo.Context) error {
		id := c.Param("id")
		var client Client
		if err := db.First(&client, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Klien tidak ditemukan"})
		}
		client.Status = "inactive"
		db.Save(&client)
		return c.JSON(200, map[string]string{"message": "Status klien berhasil ditangguhkan"})
	})

	clientGroup.PUT("/:id/activate", func(c echo.Context) error {
		id := c.Param("id")
		var client Client
		if err := db.First(&client, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Klien tidak ditemukan"})
		}
		client.Status = "active"
		db.Save(&client)
		return c.JSON(200, map[string]string{"message": "Klien berhasil diaktifkan kembali"})
	})

	clientGroup.GET("/:id/report", func(c echo.Context) error {
		id := c.Param("id")
		monthStr := c.QueryParam("month")
		yearStr := c.QueryParam("year")

		if monthStr == "" || yearStr == "" {
			return c.JSON(400, map[string]string{"message": "Bulan dan tahun harus diisi"})
		}

		var client Client
		if err := db.First(&client, id).Error; err != nil {
			return c.JSON(404, map[string]string{"message": "Klien tidak ditemukan"})
		}

		var tickets []Ticket
		db.Where("client_id = ? AND MONTH(create_at) = ? AND YEAR(create_at) = ?", id, monthStr, yearStr).Order("create_at asc").Find(&tickets)

		used := len(tickets)
		quota := client.TicketQuota
		remaining := quota - used
		if remaining < 0 {
			remaining = 0
		}

		return c.JSON(200, map[string]interface{}{
			"client_name": client.Name,
			"month":       monthStr,
			"year":        yearStr,
			"quota":       quota,
			"used":        used,
			"remaining":   remaining,
			"tickets":     tickets,
		})
	})

	ticketGroup.GET("/notifications", func(c echo.Context) error {
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		userID := int(claims["user_id"].(float64))

		var notifs []Notification
		db.Where("user_id = ?", userID).Order("is_read asc, created_at desc").Limit(50).Find(&notifs)
		return c.JSON(200, notifs)
	})

	ticketGroup.PUT("/notifications/:id/read", func(c echo.Context) error {
		id := c.Param("id")
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		userID := int(claims["user_id"].(float64))

		if err := db.Model(&Notification{}).Where("id = ? AND user_id = ?", id, userID).Update("is_read", true).Error; err != nil {
			return c.JSON(500, map[string]string{"message": "Gagal mengupdate status notifikasi"})
		}
		return c.JSON(200, map[string]string{"message": "Notifikasi ditandai sudah dibaca"})
	})

	e.Logger.Fatal(e.Start("127.0.0.1:8081"))
}

func saveUploadedFile(file *multipart.FileHeader, path string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	dst, err := os.Create(path)
	if err != nil {
		return err
	}
	defer dst.Close()
	io.Copy(dst, src)
	return nil
}
