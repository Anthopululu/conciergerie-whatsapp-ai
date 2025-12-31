FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including dev dependencies for build)
# Use npm install since we're in a workspace context
RUN npm install

# Copy backend source files
COPY backend/ ./

# Build the backend
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]

