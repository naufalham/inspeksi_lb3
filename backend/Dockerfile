FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema + seed
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY src ./src/

# Create directories for SQLite DB and uploads
RUN mkdir -p /app/data /app/uploads

# Expose port
EXPOSE 5000

# Startup: push DB schema + seed (jika DB kosong) + start server
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
