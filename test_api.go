package main

import (
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	// Buat token palsu untuk Farhan (user_id 60)
	claims := jwt.MapClaims{
		"user_id": 60,
		"name":    "Farhan",
		"role":    "technician",
		"exp":     time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte("RAHASIA_DAPUR_GALASUS_2026"))

	req, _ := http.NewRequest("GET", "http://127.0.0.1:8081/notifications", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println("Status:", resp.StatusCode)
	fmt.Println("Response:", string(body))
}
