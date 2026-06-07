package main

import (
	"fmt"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"time"
)

type Ticket struct {
	ID         int        `gorm:"primaryKey;column:id"`
	NoTiket    string     `gorm:"column:ticket_id"`
	CreatedAt  time.Time  `gorm:"column:create_at"`
	ResolvedAt *time.Time `gorm:"column:resolved_at"`
}

type TicketLog struct {
	LogID      int       `gorm:"primaryKey;column:log_id"`
	TicketID   int       `gorm:"column:ticket_id"`
	ActionType string    `gorm:"column:action_type"`
	CreatedAt  time.Time `gorm:"column:created_at"`
}

func main() {
	dsn := "sqlserver://sa:heliocaesar@localhost:1433?database=Galasusdb"
	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	var txs []Ticket
	db.Find(&txs)
	for _, t := range txs {
		res := "NULL"
		if t.ResolvedAt != nil {
			res = t.ResolvedAt.Format(time.RFC3339)
		}
		fmt.Printf("Ticket %s | Created: %s | Resolved: %s\n", t.NoTiket, t.CreatedAt.Format(time.RFC3339), res)
	}

	var logs []TicketLog
	db.Find(&logs)
	for _, l := range logs {
		fmt.Printf("Log TicketID %d | Action: %s | Created: %s\n", l.TicketID, l.ActionType, l.CreatedAt.Format(time.RFC3339))
	}
}
