#!/bin/bash

# Script pour déployer l'application sur le droplet DigitalOcean
# Usage: ./deploy-to-droplet.sh [IP_OU_DOMAINE]

set -e

DROPLET_IP="${1:-178.128.205.135}"
REMOTE_USER="root"
REMOTE_DIR="/root/conciergerie-whatsapp-ai"

echo "🚀 Déploiement sur le droplet $DROPLET_IP"
echo "=========================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le répertoire racine du projet"
    exit 1
fi

echo "📦 Copie des fichiers vers le droplet..."
# Créer le répertoire sur le serveur et copier les fichiers
ssh $REMOTE_USER@$DROPLET_IP "mkdir -p $REMOTE_DIR"
scp -r . $REMOTE_USER@$DROPLET_IP:$REMOTE_DIR/

echo "✅ Fichiers copiés avec succès!"
echo ""
echo "🔧 Maintenant, connectez-vous au droplet et exécutez l'installation:"
echo ""
echo "   ssh $REMOTE_USER@$DROPLET_IP"
echo "   cd $REMOTE_DIR"
echo "   chmod +x install-production.sh"
echo "   ./install-production.sh"
echo ""

