# Use Python slim image
FROM python:3.10-slim

# Create app directory
WORKDIR /app

# Install popular frameworks and libraries
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    requests==2.31.0 \
    numpy==1.26.0 \
    pandas==2.1.0

# Install security updates and remove package manager
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /usr/share/doc && \
    rm -rf /usr/share/man

# Remove potentially dangerous binaries
RUN rm -f /usr/bin/curl /usr/bin/wget /usr/bin/nc /usr/bin/netcat

# Create non-root user
RUN useradd -r -s /bin/false -d /app coderunner

# Set ownership
RUN chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Default command (will be overridden)
CMD ["python", "--version"]