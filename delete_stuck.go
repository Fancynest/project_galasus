package main

import (
	"fmt"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
)

type Transaction struct {
	TransactionID uint   `gorm:"primaryKey"`
	InvoiceNo     string `gorm:"unique"`
}

func main() {
	dsn := "sqlserver://@localhost:1433?database=Galasusdb"
	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("failed to connect database")
		return
	}

	res := db.Where("invoice_no = ? OR invoice_no = ?", "INV/2026/013", "EXP-1777021390").Delete(&Transaction{})
	fmt.Printf("Deleted %d stuck transactions\n", res.RowsAffected)
}
