#!/bin/bash

# Script de diagnostic pour CapRover

echo "🔍 Diagnostic CapRover"
echo "======================"
echo ""

# 1. Vérifier Docker
echo "1️⃣  Vérification de Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker est installé: $(docker --version)"
else
    echo "❌ Docker n'est PAS installé"
    echo "   Installez avec: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 2. Vérifier si CapRover tourne
echo ""
echo "2️⃣  Vérification de CapRover..."
if docker ps | grep -q captain-caprover; then
    echo "✅ CapRover est en cours d'exécution"
    docker ps | grep captain-caprover
else
    echo "❌ CapRover n'est PAS en cours d'exécution"
    
    # Vérifier si le conteneur existe mais est arrêté
    if docker ps -a | grep -q captain-caprover; then
        echo "⚠️  Le conteneur existe mais est arrêté"
        echo "   Démarrez avec: docker start captain-caprover"
    else
        echo "⚠️  Le conteneur n'existe pas"
        echo "   Installez avec:"
        echo "   docker run -d -p 80:80 -p 443:443 -p 3000:3000 \\"
        echo "     -v /var/run/docker.sock:/var/run/docker.sock \\"
        echo "     -v /captain:/captain \\"
        echo "     --name captain-caprover \\"
        echo "     --restart=always \\"
        echo "     caprover/caprover"
    fi
fi

# 3. Vérifier les ports
echo ""
echo "3️⃣  Vérification des ports..."
if netstat -tuln 2>/dev/null | grep -q ':80 '; then
    echo "✅ Port 80 est ouvert"
else
    echo "❌ Port 80 n'est PAS ouvert"
fi

if netstat -tuln 2>/dev/null | grep -q ':443 '; then
    echo "✅ Port 443 est ouvert"
else
    echo "❌ Port 443 n'est PAS ouvert"
fi

if netstat -tuln 2>/dev/null | grep -q ':3000 '; then
    echo "✅ Port 3000 est ouvert"
else
    echo "❌ Port 3000 n'est PAS ouvert"
fi

# 4. Vérifier le firewall
echo ""
echo "4️⃣  Vérification du firewall..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    echo "UFW Status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        echo "⚠️  UFW est actif - Vérifiez les règles:"
        ufw status numbered
    fi
fi

# 5. Vérifier les logs CapRover
echo ""
echo "5️⃣  Derniers logs CapRover (si disponible)..."
if docker ps -a | grep -q captain-caprover; then
    echo "📋 Dernières lignes des logs:"
    docker logs captain-caprover --tail 20 2>&1
else
    echo "⚠️  Aucun conteneur CapRover trouvé"
fi

# 6. Vérifier les conteneurs Docker
echo ""
echo "6️⃣  Tous les conteneurs Docker:"
docker ps -a

# 7. Instructions DigitalOcean
echo ""
echo "7️⃣  Vérifications à faire dans DigitalOcean:"
echo "   - Allez dans votre Droplet > Networking"
echo "   - Vérifiez que les ports 80, 443, 3000 sont ouverts"
echo "   - Ajoutez des règles de firewall si nécessaire"

echo ""
echo "======================"
echo "✅ Diagnostic terminé"


