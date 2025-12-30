#!/bin/bash

# Script d'installation automatique complète
# Usage: ./auto-install.sh

set -e

DROPLET_IP="178.128.205.135"
REMOTE_USER="root"
GITHUB_URL="https://github.com/Anthopululu/conciergerie-whatsapp-ai.git"

echo "🚀 Installation automatique sur le droplet"
echo "==========================================="
echo ""

# Vérifier la connexion SSH
echo "📡 Test de connexion au serveur..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $REMOTE_USER@$DROPLET_IP exit 2>/dev/null; then
    echo "❌ Impossible de se connecter au serveur."
    echo "   Assurez-vous que :"
    echo "   1. Vous avez la clé SSH configurée"
    echo "   2. Le serveur est accessible"
    echo ""
    echo "   Essayez manuellement : ssh $REMOTE_USER@$DROPLET_IP"
    exit 1
fi

echo "✅ Connexion OK"
echo ""

# Installation sur le serveur
echo "📦 Installation en cours sur le serveur..."
echo "   (Cela peut prendre 5-10 minutes)"
echo ""

ssh $REMOTE_USER@$DROPLET_IP << 'ENDSSH'
set -e

echo "🔧 Mise à jour du système..."
apt-get update -qq > /dev/null 2>&1
apt-get upgrade -y -qq > /dev/null 2>&1

echo "📦 Installation des dépendances système..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    sqlite3 \
    ufw \
    htop \
    unzip > /dev/null 2>&1

echo "📥 Installation de Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
fi

echo "📦 Installation de PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
fi

echo "📂 Clonage du repository..."
cd /root
if [ -d "conciergerie-whatsapp-ai" ]; then
    echo "   Repository existe déjà, mise à jour..."
    cd conciergerie-whatsapp-ai
    git pull > /dev/null 2>&1 || true
else
    git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git > /dev/null 2>&1
    cd conciergerie-whatsapp-ai
fi

echo "📦 Installation des dépendances backend..."
cd backend
npm ci --production > /dev/null 2>&1 || npm install --production > /dev/null 2>&1
npm run build > /dev/null 2>&1 || echo "   (pas de build script, continuons...)"

echo "📦 Installation et build frontend..."
cd ../frontend
npm ci > /dev/null 2>&1 || npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1 || echo "   (frontend build échoué, continuons...)"

echo "📦 Installation et build frontend-admin..."
cd ../frontend-admin
npm ci > /dev/null 2>&1 || npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1 || echo "   (frontend-admin build échoué, continuons...)"

echo "⚙️  Configuration PM2..."
cd /root/conciergerie-whatsapp-ai
if [ -f "ecosystem.config.js" ]; then
    # Mettre à jour le chemin dans ecosystem.config.js
    sed -i "s|cwd:.*|cwd: '/root/conciergerie-whatsapp-ai/backend',|g" ecosystem.config.js || true
    sed -i "s|script:.*|script: './dist/server.js',|g" ecosystem.config.js || true
fi

# Démarrer avec PM2
pm2 delete conciergerie-backend 2>/dev/null || true
pm2 start ecosystem.config.js || pm2 start backend/dist/server.js --name conciergerie-backend
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

echo "🌐 Configuration Nginx..."
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com)

# Configuration backend
cat > /etc/nginx/sites-available/conciergerie-backend << 'NGINX_BACKEND'
server {
    listen 80;
    server_name _;

    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
NGINX_BACKEND

# Configuration frontend
if [ -d "/root/conciergerie-whatsapp-ai/frontend/dist" ]; then
    cat > /etc/nginx/sites-available/conciergerie-frontend << NGINX_FRONTEND
server {
    listen 8080;
    server_name _;

    root /root/conciergerie-whatsapp-ai/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_FRONTEND
fi

# Activer les sites
ln -sf /etc/nginx/sites-available/conciergerie-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx
systemctl enable nginx > /dev/null 2>&1

echo "🔥 Configuration du firewall..."
ufw --force enable > /dev/null 2>&1 || true
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw --force reload > /dev/null 2>&1

echo "✅ Installation terminée !"
echo ""
echo "📍 Application installée dans : /root/conciergerie-whatsapp-ai"
echo "🌐 Backend accessible sur : http://$PUBLIC_IP"
echo ""
echo "⚠️  IMPORTANT : Configurez maintenant vos clés API :"
echo "   nano /root/conciergerie-whatsapp-ai/backend/.env"
echo ""
echo "   Puis redémarrez : pm2 restart conciergerie-backend"

ENDSSH

echo ""
echo "==========================================="
echo "✅ Installation terminée avec succès !"
echo "==========================================="
echo ""
echo "📋 Prochaines étapes :"
echo ""
echo "1. Connectez-vous au serveur :"
echo "   ssh root@178.128.205.135"
echo ""
echo "2. Configurez vos clés API :"
echo "   nano /root/conciergerie-whatsapp-ai/backend/.env"
echo ""
echo "   Ajoutez :"
echo "   TWILIO_ACCOUNT_SID=votre_twilio_account_sid"
echo "   TWILIO_AUTH_TOKEN=votre_twilio_auth_token"
echo "   ANTHROPIC_API_KEY=votre_anthropic_api_key"
echo "   ADMIN_PASSWORD=votre_mot_de_passe"
echo ""
echo "3. Redémarrez le backend :"
echo "   pm2 restart conciergerie-backend"
echo ""
echo "4. Vérifiez que tout fonctionne :"
echo "   curl http://localhost:3000/health"
echo ""
echo "🌐 Votre application est accessible sur :"
echo "   http://178.128.205.135"
echo ""

