# C++ container with popular libraries
FROM alpine:latest

# Set working directory
WORKDIR /app

# Install GCC, CMake and build essentials (STL is included with GCC)
# Also install Python and pip for Conan, and unzip for archive extraction
RUN apk add --no-cache \
    g++ \
    cmake \
    make \
    git \
    python3 \
    py3-pip \
    coreutils \
    unzip

# Install Conan globally as root (easier for Alpine)
RUN pip3 install --break-system-packages conan

# Create non-root user for security
RUN adduser -D -u 1000 coderunner && \
    chown -R coderunner:coderunner /app

# Create Conan config directory for the user
RUN mkdir -p /home/coderunner/.conan2 && \
    chown -R coderunner:coderunner /home/coderunner/.conan2

# Switch to non-root user
USER coderunner

# Set environment
ENV CXX=g++
ENV CXXFLAGS="-std=c++20 -O2"
ENV CONAN_USER_HOME=/home/coderunner

# Default command
CMD ["sh"]
