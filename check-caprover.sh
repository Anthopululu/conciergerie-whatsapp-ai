#!/bin/bash

# Script pour vérifier et installer CapRover

echo "🔍 Vérification de CapRover..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Installation en cours..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    echo "✅ Docker installé"
else
    echo "✅ Docker est installé"
fi

# Vérifier si CapRover est en cours d'exécution
if docker ps | grep -q caprover; then
    echo "✅ CapRover est en cours d'exécution"
    docker ps | grep caprover
else
    echo "⚠️  CapRover n'est pas en cours d'exécution"
    
    # Vérifier si le conteneur existe mais est arrêté
    if docker ps -a | grep -q caprover; then
        echo "🔄 Redémarrage de CapRover..."
        docker start $(docker ps -a | grep caprover | awk '{print $1}')
    else
        echo "📦 Installation de CapRover..."
        docker run -d -p 80:80 -p 443:443 -p 3000:3000 \
          -v /var/run/docker.sock:/var/run/docker.sock \
          -v /captain:/captain \
          --name captain-caprover \
          --restart=always \
          caprover/caprover
        
        echo "⏳ Attendez 2-3 minutes que CapRover démarre..."
        echo "💡 Vérifiez avec: docker logs captain-caprover"
    fi
fi

# Vérifier les ports
echo ""
echo "🔍 Vérification des ports ouverts:"
netstat -tuln | grep -E ':(80|443|3000)'

echo ""
echo "📋 Statut des conteneurs Docker:"
docker ps -a


