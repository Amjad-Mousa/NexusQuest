# Expo/React Native mobile app Dockerfile
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install expo CLI globally
RUN npm install -g expo-cli

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the mobile app source
COPY . .

# Expo / Metro ports
EXPOSE 19000 19001 8081

# Start Expo dev server
CMD ["npm", "run", "start"]
