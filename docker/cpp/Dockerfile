# C++ container with popular libraries
FROM alpine:latest

# Set working directory
WORKDIR /app

# Install GCC, CMake and build essentials (STL is included with GCC)
# Also install Python and pip for Conan
RUN apk add --no-cache \
    g++ \
    cmake \
    make \
    git \
    python3 \
    py3-pip \
    coreutils

# Create non-root user for security
RUN adduser -D -u 1000 coderunner && \
    chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Install Conan as user
RUN pip3 install --user conan

# Set environment - add user's local bin to PATH
ENV PATH="/home/coderunner/.local/bin:${PATH}"
ENV CXX=g++
ENV CXXFLAGS="-std=c++20 -O2"


# Default command
CMD ["sh"]
