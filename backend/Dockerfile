# ============================================================
# Stage 1: Build Go Binary
# ============================================================
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build statically compiled binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server cmd/api/main.go

# ============================================================
# Stage 2: Minimal Runtime Image
# ============================================================
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates and tzdata
RUN apk add --no-cache ca-certificates tzdata

# Copy compiled binary from builder
COPY --from=builder /app/server /app/server

# Copy SQL schemas if needed for seeding/migrations
COPY --from=builder /app/sql /app/sql

# Create uploads directory with permissions
RUN mkdir -p /app/uploads/pets /app/uploads/users

# Expose Go server port
EXPOSE 3000

ENV SERVER_PORT=3000
ENV GIN_MODE=release

CMD ["/app/server"]
