# Dockerfile pour Backend - Optimisé pour Fly.io
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer toutes les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le code source
COPY src ./src

# Build l'application TypeScript
RUN npm run build

# Stage de production
FROM node:18-alpine

WORKDIR /app

# Copier package.json pour installer uniquement les dépendances de production
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/dist ./dist

# Exposer le port (Fly.io utilisera le port configuré dans fly.toml)
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/server.js"]
