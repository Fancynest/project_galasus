package main

import (
	"fmt"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"time"
)

type Transaction struct {
	TransactionID int       `gorm:"primaryKey;column:transaction_id;autoIncrement" json:"transaction_id"`
	Type          string    `gorm:"column:type" json:"type"`
	ClientVendor  string    `gorm:"column:client_vendor" json:"client_vendor"`
	InvoiceNo     string    `gorm:"column:invoice_no" json:"invoice_no"`
	Description   string    `gorm:"column:description" json:"description"`
	Amount        float64   `gorm:"column:amount" json:"amount"`
	DueDate       time.Time `gorm:"column:due_date" json:"due_date"`
	IssueDate     time.Time `gorm:"column:issue_date;autoCreateTime" json:"issue_date"`
	Status        string    `gorm:"column:status" json:"status"`
}

func main() {
	dsn := "sqlserver://sa:heliocaesar@localhost:1433?database=Galasusdb"
	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	var txs []Transaction
	db.Find(&txs)
	for _, t := range txs {
		fmt.Printf("ID: %s | Type: '%s' | Amount: %.2f | Status: '%s'\n", t.InvoiceNo, t.Type, t.Amount, t.Status)
	}
}
