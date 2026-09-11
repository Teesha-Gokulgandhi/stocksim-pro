# ================= BACKEND DOCKERFILE =================
FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev --silent

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/admin/market-status', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["npm", "start"]
