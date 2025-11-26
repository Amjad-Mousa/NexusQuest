# Go container with popular frameworks
FROM golang:1.23-alpine

# Set working directory
WORKDIR /app

# Install git (required for go modules)
RUN apk add --no-cache git

# Initialize a module directory that can be used
RUN mkdir -p /go-modules && \
    cd /go-modules && \
    go mod init temp && \
    go get -d github.com/gin-gonic/gin@v1.9.1 && \
    go get -d gorm.io/gorm@v1.25.5 && \
    go get -d github.com/go-chi/chi/v5@v5.0.10 && \
    go get -d github.com/gorilla/mux@v1.8.1 && \
    go get -d github.com/labstack/echo/v4@v4.11.3

# Create non-root user for security
RUN adduser -D -u 1000 coderunner && \
    chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Set environment
ENV GO111MODULE=on
ENV GOPROXY=https://proxy.golang.org,direct

# Default command
CMD ["go"]
