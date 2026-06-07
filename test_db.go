package main

import (
	"fmt"
	"time"

	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
)

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
}

func main() {
	dsn := "sqlserver://sa:heliocaesar@localhost:1433?database=Galasusdb"
	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("DB Connect Error:", err)
		return
	}

	err = db.AutoMigrate(&Ticket{})
	if err != nil {
		fmt.Println("Migrate Error:", err)
	}

	now := time.Now()
	t := Ticket{
		NoTiket: "#SD-TEST",
		Pelanggan: "Test",
		Masalah: "Test",
		Prioritas: "Kritis",
		SLA: "2 Jam",
		SLATarget: &now,
		Status: "open",
		CreatedAt: now,
	}

	if err := db.Create(&t).Error; err != nil {
		fmt.Println("Insert Error:", err)
	} else {
		fmt.Println("Insert Success! ID:", t.ID)
	}
}
