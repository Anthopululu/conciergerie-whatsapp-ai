#!/bin/bash

# Script d'installation automatique de CapRover sur DigitalOcean Droplet
# À exécuter sur le serveur avec: bash install-caprover.sh

set -e

echo "🚀 Installation de CapRover sur DigitalOcean Droplet"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Veuillez exécuter ce script en tant que root${NC}"
    exit 1
fi

# Étape 1: Mise à jour du système
echo -e "${GREEN}📦 Mise à jour du système...${NC}"
apt update && apt upgrade -y

# Étape 2: Installation de Docker
echo -e "${GREEN}🐳 Installation de Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installé${NC}"
else
    echo -e "${YELLOW}⚠️  Docker est déjà installé${NC}"
fi

# Vérifier l'installation de Docker
docker --version

# Étape 3: Arrêter CapRover s'il existe déjà
echo -e "${GREEN}🛑 Arrêt de CapRover existant (si présent)...${NC}"
docker stop captain-caprover 2>/dev/null || true
docker rm captain-caprover 2>/dev/null || true

# Étape 4: Installation de CapRover
echo -e "${GREEN}📦 Installation de CapRover...${NC}"
docker run -d -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  --name captain-caprover \
  --restart=always \
  caprover/caprover

echo -e "${GREEN}✅ CapRover installé et démarré${NC}"

# Étape 5: Configuration du firewall
echo -e "${GREEN}🔥 Configuration du firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3000/tcp
    echo -e "${GREEN}✅ Ports ouverts dans UFW${NC}"
fi

# Étape 6: Attendre le démarrage
echo -e "${YELLOW}⏳ Attente du démarrage de CapRover (30 secondes)...${NC}"
sleep 30

# Étape 7: Vérification
echo -e "${GREEN}🔍 Vérification de l'installation...${NC}"
if docker ps | grep -q captain-caprover; then
    echo -e "${GREEN}✅ CapRover est en cours d'exécution${NC}"
    echo ""
    echo -e "${GREEN}=================================================="
    echo -e "🎉 Installation terminée avec succès!"
    echo -e "==================================================${NC}"
    echo ""
    echo -e "${YELLOW}📋 Informations importantes:${NC}"
    echo ""
    
    # Récupérer l'IP publique
    IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo -e "🌐 Accédez à CapRover sur: ${GREEN}http://${IP}${NC}"
    echo -e "   ou: ${GREEN}http://178.128.205.135${NC}"
    echo ""
    echo -e "${YELLOW}⏰ CapRover peut prendre 2-3 minutes pour être complètement prêt${NC}"
    echo -e "${YELLOW}   Si la page ne charge pas, attendez encore un peu et réessayez${NC}"
    echo ""
    echo -e "${YELLOW}📝 Pour voir les logs:${NC}"
    echo -e "   docker logs captain-caprover -f"
    echo ""
    echo -e "${YELLOW}📊 Pour vérifier le statut:${NC}"
    echo -e "   docker ps | grep captain"
    echo ""
else
    echo -e "${RED}❌ CapRover ne semble pas démarrer correctement${NC}"
    echo -e "${YELLOW}📝 Vérifiez les logs avec: docker logs captain-caprover${NC}"
    exit 1
fi


