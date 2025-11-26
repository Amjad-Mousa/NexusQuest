# C++ container with popular libraries
FROM alpine:latest

# Set working directory
WORKDIR /app

# Install GCC, CMake and build essentials (STL is included with GCC)
RUN apk add --no-cache \
    g++ \
    cmake \
    make \
    git

# Create non-root user for security
RUN adduser -D -u 1000 coderunner && \
    chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Set environment
ENV CXX=g++
ENV CXXFLAGS="-std=c++20 -O2"

# Default command
CMD ["sh"]
