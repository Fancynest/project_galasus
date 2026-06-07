package main

import (
	"fmt"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"time"
)

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

func main() {
	dsn := "sqlserver://sa:Gabriel99%40@localhost:1433?database=GalasusDB"
	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("Error connecting to db:", err)
		return
	}

	var clients []Client
	db.Find(&clients)
	fmt.Printf("Total clients in DB: %d\n", len(clients))
	for _, c := range clients {
		fmt.Printf("- Client: %s | Status: %s | ContractEnd: %v\n", c.Name, c.Status, c.ContractEnd)
	}
}
