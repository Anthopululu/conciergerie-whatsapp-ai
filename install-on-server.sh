#!/bin/bash

# Script à exécuter DIRECTEMENT sur le serveur
# Copiez ce script sur le serveur et exécutez-le

set -e

echo "🚀 Installation automatique"
echo "=========================="
echo ""

echo "🔧 Mise à jour du système..."
apt-get update -qq
apt-get upgrade -y -qq

echo "📦 Installation des dépendances..."
apt-get install -y -qq curl wget git build-essential nginx certbot python3-certbot-nginx sqlite3 ufw

echo "📥 Installation de Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y -qq nodejs
fi

echo "📦 Installation de PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo "📂 Clonage du repository..."
cd /root
if [ -d "conciergerie-whatsapp-ai" ]; then
    cd conciergerie-whatsapp-ai
    git pull
else
    git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
    cd conciergerie-whatsapp-ai
fi

echo "📦 Installation backend..."
cd backend
npm ci --production || npm install --production
npm run build 2>/dev/null || echo "   (pas de build, continuons...)"

echo "📦 Installation frontend..."
cd ../frontend
npm ci || npm install
npm run build 2>/dev/null || echo "   (build frontend échoué, continuons...)"

echo "📦 Installation frontend-admin..."
cd ../frontend-admin
npm ci || npm install
npm run build 2>/dev/null || echo "   (build frontend-admin échoué, continuons...)"

echo "⚙️  Configuration PM2..."
cd /root/conciergerie-whatsapp-ai
pm2 delete conciergerie-backend 2>/dev/null || true
pm2 start backend/dist/server.js --name conciergerie-backend
pm2 save
pm2 startup systemd -u root --hp /root

echo "🌐 Configuration Nginx..."
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com)

cat > /etc/nginx/sites-available/conciergerie-backend << 'EOF'
server {
    listen 80;
    server_name _;
    proxy_read_timeout 300s;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/conciergerie-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "🔥 Configuration firewall..."
ufw --force enable || true
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force reload

echo ""
echo "✅ Installation terminée !"
echo ""
echo "🌐 Application accessible sur : http://$PUBLIC_IP"
echo ""
echo "⚠️  Configurez maintenant vos clés API :"
echo "   nano /root/conciergerie-whatsapp-ai/backend/.env"
echo ""
echo "   Puis : pm2 restart conciergerie-backend"

