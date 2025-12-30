#!/bin/bash

# Script de déploiement pour l'application Conciergerie WhatsApp

set -e

echo "🚀 Déploiement de l'application Conciergerie WhatsApp..."

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node --version)${NC}"

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Le fichier .env n'existe pas. Création depuis .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Veuillez configurer le fichier .env avant de continuer${NC}"
        exit 1
    else
        echo -e "${RED}❌ Fichier .env.example introuvable${NC}"
        exit 1
    fi
fi

# Build Backend
echo -e "${GREEN}📦 Build du backend...${NC}"
cd backend
npm install
npm run build
cd ..

# Build Frontend Conciergerie
echo -e "${GREEN}📦 Build du frontend conciergerie...${NC}"
cd frontend
npm install
npm run build
cd ..

# Build Frontend Admin
echo -e "${GREEN}📦 Build du frontend admin...${NC}"
cd frontend-admin
npm install
npm run build
cd ..

# Créer le dossier logs si nécessaire
mkdir -p logs

# Vérifier si PM2 est installé
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}🔄 Redémarrage de l'application avec PM2...${NC}"
    
    # Arrêter l'application si elle tourne déjà
    pm2 stop conciergerie-backend 2>/dev/null || true
    pm2 delete conciergerie-backend 2>/dev/null || true
    
    # Démarrer l'application
    pm2 start ecosystem.config.js
    
    # Sauvegarder la configuration PM2
    pm2 save
    
    echo -e "${GREEN}✅ Application déployée avec succès!${NC}"
    echo -e "${GREEN}📊 Statut: pm2 status${NC}"
    echo -e "${GREEN}📝 Logs: pm2 logs conciergerie-backend${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 n'est pas installé. Installation recommandée pour la production.${NC}"
    echo -e "${YELLOW}   Installez PM2 avec: npm install -g pm2${NC}"
    echo -e "${YELLOW}   Puis démarrez avec: pm2 start ecosystem.config.js${NC}"
fi

echo -e "${GREEN}✨ Déploiement terminé!${NC}"


