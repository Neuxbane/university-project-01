# Stage 1: Build the UI (Vue 3 + Vite)
FROM node:22-alpine AS ui-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
ARG VITE_BACKEND_PORT=3000
ENV VITE_BACKEND_PORT=$VITE_BACKEND_PORT
RUN npm run build

# Stage 2: Backend (Node.js + Express + Prisma) & Production App
FROM node:22-alpine
WORKDIR /app/server

RUN apk add --no-cache openssl

COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install
RUN npx prisma generate

COPY server/ ./

# Copy built frontend from Stage 1 into /app/client/dist
# This matches server/src/app.js path: path.join(__dirname, '../../client/dist')
COPY --from=ui-builder /app/client/dist /app/client/dist

# Ensure uploads directory exists
RUN mkdir -p /app/server/uploads

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
