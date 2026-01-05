# ---------- FRONTEND BUILD ----------
FROM node:20-alpine AS frontend_builder
WORKDIR /app/frontend

# Accept build argument
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------- RUNTIME IMAGE (backend) ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# copy only package files then install prod deps
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# copy backend sources
COPY backend/ ./

# copy built frontend into backend public folder
COPY --from=frontend_builder /app/frontend/dist ./public

EXPOSE 3001
CMD ["node", "index.js"]