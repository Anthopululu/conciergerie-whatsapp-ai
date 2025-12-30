#!/bin/bash

# Script de déploiement Fly.io complet
# Exécutez ce script depuis la racine du projet

set -e

echo "🚀 Déploiement sur Fly.io"
echo "========================"
echo ""

# Vérifier que Fly CLI est installé
if ! command -v fly &> /dev/null; then
    echo "📦 Installation de Fly CLI..."
    curl -L https://fly.io/install.sh | sh
    echo "✅ Fly CLI installé"
    echo "🔐 Connectez-vous avec: fly auth login"
    exit 1
fi

echo "✅ Fly CLI est installé"
echo ""

# Vérifier la connexion
if ! fly auth whoami &>/dev/null; then
    echo "🔐 Vous n'êtes pas connecté à Fly.io"
    echo "   Connectez-vous avec: fly auth login"
    exit 1
fi

echo "✅ Connecté à Fly.io: $(fly auth whoami)"
echo ""

# Étape 1: Déployer le Backend
echo "1️⃣  Déploiement du Backend..."
cd backend

if [ ! -f "fly.toml" ]; then
    echo "   Initialisation Fly.io pour le backend..."
    fly launch --no-deploy --name conciergerie-backend --region cdg
fi

echo "   Configuration des secrets..."
echo "   ⚠️  Vous devez configurer les secrets manuellement avec:"
echo "   fly secrets set TWILIO_ACCOUNT_SID=your_account_sid"
echo "   fly secrets set TWILIO_AUTH_TOKEN=your_auth_token"
echo "   fly secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886"
echo "   fly secrets set ANTHROPIC_API_KEY=your_api_key"
echo "   fly secrets set PORT=3000"
echo "   fly secrets set NODE_ENV=production"
echo "   fly secrets set ADMIN_EMAIL=admin@example.com"
echo "   fly secrets set ADMIN_PASSWORD=your_secure_password"
echo ""
read -p "   Appuyez sur Entrée après avoir configuré les secrets..."

echo "   Déploiement du backend..."
fly deploy

BACKEND_URL=$(fly status --json 2>/dev/null | grep -o '"hostname":"[^"]*' | head -1 | cut -d'"' -f4 || echo "conciergerie-backend.fly.dev")
echo "   ✅ Backend déployé: https://${BACKEND_URL}"
cd ..

# Étape 2: Déployer le Frontend Conciergerie
echo ""
echo "2️⃣  Déploiement du Frontend Conciergerie..."
cd frontend

# Mettre à jour le Dockerfile avec l'URL du backend
sed -i.bak "s|proxy_pass http://conciergerie-backend.fly.dev;|proxy_pass https://${BACKEND_URL};|g" Dockerfile
rm -f Dockerfile.bak

if [ ! -f "fly.toml" ]; then
    echo "   Initialisation Fly.io pour le frontend..."
    fly launch --no-deploy --name conciergerie-frontend --region cdg
fi

echo "   Déploiement du frontend..."
fly deploy
cd ..

# Étape 3: Déployer le Frontend Admin
echo ""
echo "3️⃣  Déploiement du Frontend Admin..."
cd frontend-admin

# Mettre à jour le Dockerfile avec l'URL du backend
sed -i.bak "s|proxy_pass http://conciergerie-backend.fly.dev;|proxy_pass https://${BACKEND_URL};|g" Dockerfile
rm -f Dockerfile.bak

if [ ! -f "fly.toml" ]; then
    echo "   Initialisation Fly.io pour le frontend admin..."
    fly launch --no-deploy --name conciergerie-admin --region cdg
fi

echo "   Déploiement du frontend admin..."
fly deploy
cd ..

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📋 URLs de vos applications:"
fly apps list | grep conciergerie
echo ""
echo "🌐 Accédez à vos apps avec: fly open"


