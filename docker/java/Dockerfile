FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Install Maven for dependency management
USER root
RUN apk add --no-cache maven

# Create lib directory for future dependencies
RUN mkdir -p /app/lib

# Set environment variables
ENV JAVA_OPTS="-Xmx128m"
ENV CLASSPATH=/app:/app/lib/*

# Create a non-root user
RUN adduser -D -u 1000 coderunner && \
    chown -R coderunner:coderunner /app

USER coderunner

CMD ["java"]
