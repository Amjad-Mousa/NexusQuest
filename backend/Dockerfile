# Use Node.js base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json first for dependency install
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose backend port
EXPOSE 3001

# Command for production (will be overridden by docker-compose for dev)
CMD ["npm", "run", "dev"]
