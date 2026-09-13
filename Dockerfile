FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o galasus_app main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta

WORKDIR /app

COPY --from=builder /app/galasus_app .
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

RUN mkdir -p public/uploads && chmod 777 public/uploads

EXPOSE 8081

CMD ["./galasus_app"]
