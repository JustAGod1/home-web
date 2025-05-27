# Stage 1: Build the Go backend
FROM golang:1.24-alpine AS go-builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server cmd/home-web/main.go  

# Stage 2: Build the Vite frontend
FROM node:18-alpine AS vite-builder

WORKDIR /app

# Copy package files
COPY front/package.json front/package-lock.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY front/ ./

# Build the frontend
RUN npm run build

# Stage 3: Final production image
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy Go binary from builder
COPY --from=go-builder /app/server ./server

# Copy static files from vite builder
COPY --from=vite-builder /app/dist ./static

# Environment variables
ENV PORT=8080
ENV STATIC_DIR=/app/static
ENV EXECUTABLE_PATH=/path/to/your/executable

# Expose the port
EXPOSE 8080

# Run the server
CMD ["./server"]
