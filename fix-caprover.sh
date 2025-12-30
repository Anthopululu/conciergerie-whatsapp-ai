#!/bin/bash

# Script de réparation automatique de CapRover
# Fait tout automatiquement : installation, configuration, diagnostic

set -e

echo "🔧 Réparation automatique de CapRover"
echo "======================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Installer Docker si nécessaire
echo -e "${GREEN}1️⃣  Vérification de Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}   Installation de Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    echo -e "${GREEN}   ✅ Docker installé${NC}"
else
    echo -e "${GREEN}   ✅ Docker déjà installé: $(docker --version)${NC}"
fi

# 2. Arrêter et supprimer l'ancien conteneur si existe
echo -e "${GREEN}2️⃣  Nettoyage de l'ancienne installation...${NC}"
docker stop captain-caprover 2>/dev/null || true
docker rm captain-caprover 2>/dev/null || true
echo -e "${GREEN}   ✅ Nettoyage terminé${NC}"

# 3. Installer CapRover
echo -e "${GREEN}3️⃣  Installation de CapRover...${NC}"
docker run -d -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  --name captain-caprover \
  --restart=always \
  caprover/caprover

echo -e "${GREEN}   ✅ CapRover installé${NC}"

# 4. Configurer le firewall local
echo -e "${GREEN}4️⃣  Configuration du firewall local...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    ufw allow 3000/tcp 2>/dev/null || true
    echo -e "${GREEN}   ✅ Ports ouverts dans UFW${NC}"
fi

# 5. Attendre le démarrage
echo -e "${YELLOW}5️⃣  Attente du démarrage de CapRover (60 secondes)...${NC}"
for i in {60..1}; do
    echo -ne "\r   ⏳ $i secondes restantes...   "
    sleep 1
done
echo -e "\r   ✅ Attente terminée                    "

# 6. Vérification
echo ""
echo -e "${GREEN}6️⃣  Vérification de l'installation...${NC}"
echo ""

if docker ps | grep -q captain-caprover; then
    echo -e "${GREEN}✅ CapRover est en cours d'exécution!${NC}"
    echo ""
    docker ps | grep captain-caprover
    echo ""
    echo -e "${GREEN}======================================"
    echo -e "🎉 Installation réussie!"
    echo -e "======================================${NC}"
    echo ""
    echo -e "${YELLOW}📋 Prochaines étapes:${NC}"
    echo ""
    echo -e "1. Ouvrez votre navigateur"
    echo -e "2. Allez sur: ${GREEN}http://178.128.205.135${NC}"
    echo -e "3. Si ça ne fonctionne pas, attendez encore 1-2 minutes"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT - Vérifiez dans DigitalOcean:${NC}"
    echo -e "   - Allez dans votre Droplet > Networking"
    echo -e "   - Vérifiez que les ports 80, 443, 3000 sont ouverts"
    echo -e "   - Si un firewall existe, ajoutez ces règles:"
    echo -e "     * HTTP (80) - Inbound"
    echo -e "     * HTTPS (443) - Inbound"
    echo -e "     * Custom (3000) - Inbound"
    echo ""
    echo -e "${YELLOW}📊 Pour voir les logs:${NC}"
    echo -e "   docker logs captain-caprover -f"
    echo ""
    echo -e "${YELLOW}📊 Pour vérifier le statut:${NC}"
    echo -e "   docker ps | grep captain"
    echo ""
else
    echo -e "${RED}❌ CapRover ne démarre pas correctement${NC}"
    echo ""
    echo -e "${YELLOW}📋 Logs d'erreur:${NC}"
    docker logs captain-caprover --tail 30 2>&1 || true
    echo ""
    echo -e "${YELLOW}💡 Essayez de redémarrer:${NC}"
    echo -e "   docker restart captain-caprover"
    echo -e "   docker logs captain-caprover -f"
fi


