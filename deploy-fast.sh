#!/bin/bash

# Script de déploiement rapide (sans node_modules)
# Usage: ./deploy-fast.sh

set -e

DROPLET_IP="${1:-178.128.205.135}"
REMOTE_USER="root"
REMOTE_DIR="/root/conciergerie-whatsapp-ai"

echo "🚀 Déploiement rapide (sans node_modules) sur $DROPLET_IP"
echo "=========================================================="

# Créer le répertoire sur le serveur
ssh $REMOTE_USER@$DROPLET_IP "mkdir -p $REMOTE_DIR"

# Copier uniquement les fichiers nécessaires (exclure node_modules, .git, etc.)
echo "📦 Copie des fichiers (sans node_modules, .git, dist)..."

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude '.env' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude 'concierge.db' \
  --exclude 'backups' \
  --exclude '.next' \
  --exclude 'coverage' \
  ./ $REMOTE_USER@$DROPLET_IP:$REMOTE_DIR/

echo ""
echo "✅ Fichiers copiés!"
echo ""
echo "🔧 Connectez-vous maintenant:"
echo "   ssh $REMOTE_USER@$DROPLET_IP"
echo "   cd $REMOTE_DIR"
echo "   chmod +x install-production.sh"
echo "   ./install-production.sh"
echo ""

