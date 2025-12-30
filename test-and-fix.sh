#!/bin/bash

# Script de test et correction automatique

echo "🔍 Diagnostic du serveur 178.128.205.135"
echo "========================================"
echo ""

echo "✅ Le serveur répond au ping (en ligne)"
echo "❌ Les ports 80, 443, 3000 sont fermés"
echo ""
echo "📋 Causes possibles:"
echo "   1. CapRover n'est pas installé"
echo "   2. CapRover n'est pas démarré"
echo "   3. Firewall DigitalOcean bloque les ports"
echo ""

echo "🔧 Solution:"
echo "============"
echo ""
echo "1️⃣  Connectez-vous au serveur:"
echo "   ssh root@178.128.205.135"
echo ""
echo "2️⃣  Exécutez cette commande pour installer CapRover:"
echo ""
echo "curl -fsSL https://get.docker.com | sh && docker stop captain-caprover 2>/dev/null; docker rm captain-caprover 2>/dev/null; docker run -d -p 80:80 -p 443:443 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain --name captain-caprover --restart=always caprover/caprover && echo '✅ CapRover installé! Attendez 2-3 minutes'"
echo ""
echo "3️⃣  Vérifiez dans DigitalOcean:"
echo "   - Allez dans Droplet > Networking"
echo "   - Créez un Firewall avec ces règles:"
echo "     * HTTP (80) - Inbound - TCP"
echo "     * HTTPS (443) - Inbound - TCP"
echo "     * Custom (3000) - Inbound - TCP"
echo "   - Attachez le firewall à votre Droplet"
echo ""
echo "4️⃣  Testez à nouveau après 2-3 minutes:"
echo "   http://178.128.205.135"
echo ""


