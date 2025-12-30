#!/bin/bash
# Installation rapide de CapRover - Copiez-collez tout ce script dans votre terminal SSH

echo "🚀 Installation de CapRover..."

# Installer Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Installation de Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# Arrêter CapRover s'il existe
docker stop captain-caprover 2>/dev/null
docker rm captain-caprover 2>/dev/null

# Installer CapRover
echo "📦 Installation de CapRover..."
docker run -d -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  --name captain-caprover \
  --restart=always \
  caprover/caprover

echo "✅ Installation terminée!"
echo "⏳ Attendez 2-3 minutes puis allez sur: http://178.128.205.135"
echo "📊 Vérifiez avec: docker ps | grep captain"


