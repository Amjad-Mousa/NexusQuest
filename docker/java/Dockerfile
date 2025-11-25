FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Set environment variables
ENV JAVA_OPTS="-Xmx128m"

# Create a non-root user
RUN adduser -D -u 1000 coderunner

USER coderunner

CMD ["java"]
