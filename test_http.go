package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

func main() {
	// Login
	loginData := map[string]string{
		"email":    "admin@galasus.com",
		"password": "Galasus123!",
	}
	b, _ := json.Marshal(loginData)
	resp, err := http.Post("http://127.0.0.1:8081/login", "application/json", bytes.NewBuffer(b))
	if err != nil {
		fmt.Println("Login Error:", err)
		return
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	
	var res map[string]interface{}
	json.Unmarshal(body, &res)
	token, ok := res["token"].(string)
	if !ok {
		fmt.Println("No token:", string(body))
		return
	}
	fmt.Println("Token:", token)

	// Create Ticket
	ticketData := map[string]interface{}{
		"pelanggan": "Test Pelanggan",
		"masalah":   "Test Masalah",
		"prioritas": "Kritis",
		"sla":       "2 Jam",
		"created_at": "2026-06-05T01:00:00Z",
	}
	b2, _ := json.Marshal(ticketData)
	req, _ := http.NewRequest("POST", "http://127.0.0.1:8081/tickets", bytes.NewBuffer(b2))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp2, err := client.Do(req)
	if err != nil {
		fmt.Println("Create Error:", err)
		return
	}
	defer resp2.Body.Close()
	body2, _ := ioutil.ReadAll(resp2.Body)
	fmt.Println("Create Response Status:", resp2.StatusCode)
	fmt.Println("Create Response Body:", string(body2))
}
