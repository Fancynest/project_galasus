# Tahap 1: Build Image
FROM golang:1.22-alpine AS builder

# Set working directory di dalam container
WORKDIR /app

# Salin module file dan unduh dependensi
COPY go.mod go.sum ./
RUN go mod download

# Salin seluruh kode sumber
COPY . .

# Kompilasi aplikasi menjadi binary statis bernama 'galasus_app'
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o galasus_app main.go

# Tahap 2: Runner Image (Image sangat ringan)
FROM alpine:latest

# Install timezone data agar log waktu akurat
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta

WORKDIR /app

# Salin binary dari tahap 1
COPY --from=builder /app/galasus_app .

# Salin folder views dan public (aset web)
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

# Buat folder uploads untuk menghindari error saat menyimpan file
RUN mkdir -p public/uploads && chmod 777 public/uploads

# Expose port aplikasi (8081)
EXPOSE 8081

# Command untuk menjalankan aplikasi
CMD ["./galasus_app"]
