# Dockerfile pour Frontend Conciergerie - Optimisé pour Fly.io
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY index.html ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY src ./src
COPY public ./public 2>/dev/null || true

# Build l'application
RUN npm run build

# Stage de production avec Nginx
FROM nginx:alpine

# Copier les fichiers buildés
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration Nginx pour SPA et proxy API
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gestion des routes SPA \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Proxy pour les appels API vers le backend \
    location /api { \
        proxy_pass http://conciergerie-backend.fly.dev; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
