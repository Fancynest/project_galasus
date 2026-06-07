package main

import (
	"fmt"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
)

func main() {
	dsn := "sqlserver://sa:heliocaesar@localhost:1433?database=Galasusdb"
	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("DB Connect Error:", err)
		return
	}

	var results []map[string]interface{}
	err = db.Raw("SELECT TOP 1 * FROM tickets ORDER BY id DESC").Scan(&results).Error
	if err != nil {
		fmt.Println("Query Error:", err)
	} else {
		fmt.Printf("Last Ticket: %+v\n", results)
	}
}
