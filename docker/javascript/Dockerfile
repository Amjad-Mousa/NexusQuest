# Node.js/JavaScript container with popular frameworks
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install popular JavaScript/Node.js frameworks and libraries
RUN npm init -y && \
    npm install --save \
    express@4.18.2 \
    axios@1.6.0 \
    lodash@4.17.21 \
    moment@2.29.4 \
    cors@2.8.5 \
    dotenv@16.3.1 \
    uuid@9.0.1 && \
    npm cache clean --force

# Create non-root user for security (use different UID to avoid conflicts)
RUN useradd -m -u 1001 coderunner && \
    chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Set environment variables
ENV NODE_ENV=production

# Default command
CMD ["node"]
