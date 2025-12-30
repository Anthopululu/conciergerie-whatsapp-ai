#!/bin/bash

# Script d'installation production-ready pour DigitalOcean Droplet
# Usage: ./install-production.sh

set -e

echo "🚀 Installation de l'application Conciergerie WhatsApp AI"
echo "=========================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
APP_DIR="/opt/conciergerie-whatsapp-ai"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
FRONTEND_ADMIN_DIR="$APP_DIR/frontend-admin"
NGINX_DIR="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
DOMAIN="${DOMAIN:-}"  # À définir par l'utilisateur

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Vérifier que nous sommes root
if [ "$EUID" -ne 0 ]; then 
    error "Veuillez exécuter ce script en tant que root (sudo ./install-production.sh)"
fi

# Mise à jour du système
info "Mise à jour du système..."
apt-get update -qq
apt-get upgrade -y -qq

# Installation des dépendances système
info "Installation des dépendances système..."
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
    unzip

# Installation de Node.js 18.x
info "Installation de Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y -qq nodejs
fi

NODE_VERSION=$(node -v)
info "Node.js installé: $NODE_VERSION"

# Installation de PM2 globalement
info "Installation de PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
info "PM2 installé: $(pm2 -v)"

# Création du répertoire de l'application
info "Création du répertoire de l'application..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Vérifier si le code existe déjà
if [ -d "$APP_DIR/.git" ]; then
    warn "Le code existe déjà. Mise à jour..."
    cd "$APP_DIR"
    git pull || warn "Impossible de mettre à jour via git"
else
    # Demander à l'utilisateur comment obtenir le code
    echo ""
    echo "📦 Comment voulez-vous installer le code ?"
    echo "1) Cloner depuis GitHub (nécessite une URL)"
    echo "2) Copier depuis le répertoire actuel (si vous êtes dans le projet)"
    read -p "Choix (1 ou 2): " CODE_CHOICE
    
    if [ "$CODE_CHOICE" = "1" ]; then
        read -p "URL du repository GitHub: " GITHUB_URL
        if [ -n "$GITHUB_URL" ]; then
            git clone "$GITHUB_URL" "$APP_DIR" || error "Impossible de cloner le repository"
        else
            error "URL GitHub requise"
        fi
    elif [ "$CODE_CHOICE" = "2" ]; then
        # Si le script est exécuté depuis le répertoire du projet
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "$SCRIPT_DIR/package.json" ] || [ -d "$SCRIPT_DIR/backend" ]; then
            info "Copie du code depuis $SCRIPT_DIR..."
            cp -r "$SCRIPT_DIR"/* "$APP_DIR/" 2>/dev/null || true
            cp -r "$SCRIPT_DIR"/. "$APP_DIR/" 2>/dev/null || true
        else
            error "Impossible de trouver le code source. Veuillez utiliser l'option 1 ou copier le code manuellement."
        fi
    else
        error "Choix invalide"
    fi
fi

# Installation des dépendances
info "Installation des dépendances backend..."
cd "$BACKEND_DIR"
if [ -f "package.json" ]; then
    npm ci --production || npm install --production
else
    error "package.json non trouvé dans $BACKEND_DIR"
fi

info "Build du backend..."
npm run build || warn "Build backend échoué (peut être normal si pas de build script)"

info "Installation des dépendances frontend..."
cd "$FRONTEND_DIR"
if [ -f "package.json" ]; then
    npm ci || npm install
    npm run build || error "Build frontend échoué"
else
    warn "Frontend non trouvé, ignoré"
fi

info "Installation des dépendances frontend-admin..."
cd "$FRONTEND_ADMIN_DIR"
if [ -f "package.json" ]; then
    npm ci || npm install
    npm run build || error "Build frontend-admin échoué"
else
    warn "Frontend-admin non trouvé, ignoré"
fi

# Configuration de l'environnement
info "Configuration de l'environnement..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    warn "Fichier .env non trouvé. Création d'un template..."
    cat > "$BACKEND_DIR/.env" << EOF
# Configuration Production
NODE_ENV=production
PORT=3000

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_password_in_production

# Database
DB_PATH=$BACKEND_DIR/concierge.db
EOF
    warn "⚠️  IMPORTANT: Modifiez $BACKEND_DIR/.env avec vos vraies clés API !"
fi

# Configuration PM2
info "Configuration de PM2..."
cd "$APP_DIR"
if [ -f "ecosystem.config.js" ]; then
    # Mettre à jour le chemin dans ecosystem.config.js
    sed -i "s|cwd:.*|cwd: '$BACKEND_DIR',|g" ecosystem.config.js || true
    pm2 start ecosystem.config.js || warn "PM2 start échoué, essayons manuellement..."
else
    # Créer un fichier ecosystem.config.js
    cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'conciergerie-backend',
    script: './dist/server.js',
    cwd: '$BACKEND_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/conciergerie-error.log',
    out_file: '/var/log/pm2/conciergerie-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false
  }]
};
EOF
    pm2 start ecosystem.config.js
fi

# Sauvegarder la configuration PM2
pm2 save
pm2 startup systemd -u root --hp /root || warn "PM2 startup échoué"

# Création des répertoires de logs
mkdir -p /var/log/pm2
chown -R root:root /var/log/pm2

# Configuration Nginx
info "Configuration de Nginx..."

# Demander le domaine ou utiliser l'IP
if [ -z "$DOMAIN" ]; then
    echo ""
    read -p "🌐 Entrez votre domaine (ou appuyez sur Entrée pour utiliser l'IP): " DOMAIN
fi

# Obtenir l'IP publique si pas de domaine
if [ -z "$DOMAIN" ]; then
    PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com)
    DOMAIN="$PUBLIC_IP"
    warn "Utilisation de l'IP publique: $PUBLIC_IP"
    warn "Pour utiliser un domaine, configurez-le dans Nginx plus tard"
fi

# Configuration Nginx pour le backend
cat > "$NGINX_DIR/conciergerie-backend" << EOF
# Backend API
server {
    listen 80;
    server_name api.$DOMAIN $DOMAIN;

    # Augmenter les timeouts pour les requêtes longues (IA)
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF

# Configuration Nginx pour le frontend conciergerie
if [ -d "$FRONTEND_DIR/dist" ]; then
    cat > "$NGINX_DIR/conciergerie-frontend" << EOF
# Frontend Conciergerie
server {
    listen 80;
    server_name app.$DOMAIN;

    root $FRONTEND_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
fi

# Configuration Nginx pour le frontend admin
if [ -d "$FRONTEND_ADMIN_DIR/dist" ]; then
    cat > "$NGINX_DIR/conciergerie-admin" << EOF
# Frontend Admin
server {
    listen 80;
    server_name admin.$DOMAIN;

    root $FRONTEND_ADMIN_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
fi

# Activer les sites Nginx
ln -sf "$NGINX_DIR/conciergerie-backend" "$NGINX_ENABLED/conciergerie-backend"
if [ -f "$NGINX_DIR/conciergerie-frontend" ]; then
    ln -sf "$NGINX_DIR/conciergerie-frontend" "$NGINX_ENABLED/conciergerie-frontend"
fi
if [ -f "$NGINX_DIR/conciergerie-admin" ]; then
    ln -sf "$NGINX_DIR/conciergerie-admin" "$NGINX_ENABLED/conciergerie-admin"
fi

# Désactiver le site par défaut
rm -f "$NGINX_ENABLED/default"

# Tester la configuration Nginx
nginx -t || error "Configuration Nginx invalide"

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx

# Configuration du firewall
info "Configuration du firewall..."
ufw --force enable || true
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force reload

# Configuration SSL avec Let's Encrypt (si domaine configuré)
if [ "$DOMAIN" != "${PUBLIC_IP:-}" ] && [ -n "$DOMAIN" ] && [[ ! "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo ""
    read -p "🔒 Voulez-vous configurer SSL avec Let's Encrypt pour $DOMAIN ? (o/n): " SSL_CHOICE
    if [ "$SSL_CHOICE" = "o" ] || [ "$SSL_CHOICE" = "O" ]; then
        info "Configuration SSL avec Let's Encrypt..."
        certbot --nginx -d "$DOMAIN" -d "api.$DOMAIN" -d "app.$DOMAIN" -d "admin.$DOMAIN" \
            --non-interactive --agree-tos --email "admin@$DOMAIN" || \
            warn "Configuration SSL échouée. Vous pouvez le faire manuellement plus tard avec: certbot --nginx"
    fi
fi

# Script de backup automatique
info "Configuration des backups automatiques..."
mkdir -p "$APP_DIR/backups"
cat > "$APP_DIR/backup.sh" << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/conciergerie-whatsapp-ai/backups"
DB_PATH="/opt/conciergerie-whatsapp-ai/backend/concierge.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/concierge-${TIMESTAMP}.db"

if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    # Garder seulement les 7 derniers backups
    ls -t "$BACKUP_DIR"/concierge-*.db.gz | tail -n +8 | xargs rm -f
    echo "Backup créé: ${BACKUP_FILE}.gz"
fi
BACKUP_SCRIPT
chmod +x "$APP_DIR/backup.sh"

# Ajouter au crontab (backup quotidien à 2h du matin)
(crontab -l 2>/dev/null | grep -v "$APP_DIR/backup.sh"; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

# Résumé de l'installation
echo ""
echo "=========================================================="
info "Installation terminée avec succès !"
echo "=========================================================="
echo ""
echo "📋 Informations importantes:"
echo ""
echo "📍 Répertoire de l'application: $APP_DIR"
echo "🌐 Domaine/IP configuré: $DOMAIN"
echo ""
if [ "$DOMAIN" != "${PUBLIC_IP:-}" ] && [[ ! "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "🔗 URLs de l'application:"
    echo "   - Backend API: http://api.$DOMAIN ou http://$DOMAIN"
    echo "   - Frontend Conciergerie: http://app.$DOMAIN"
    echo "   - Frontend Admin: http://admin.$DOMAIN"
else
    echo "🔗 URLs de l'application:"
    echo "   - Backend API: http://$DOMAIN"
    echo "   - Frontend Conciergerie: http://$DOMAIN (port 80)"
    echo "   - Frontend Admin: http://$DOMAIN (port 80)"
fi
echo ""
echo "⚙️  Commandes utiles:"
echo "   - Voir les logs: pm2 logs conciergerie-backend"
echo "   - Redémarrer: pm2 restart conciergerie-backend"
echo "   - Status: pm2 status"
echo "   - Backup manuel: $APP_DIR/backup.sh"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Modifiez $BACKEND_DIR/.env avec vos vraies clés API"
echo "   2. Redémarrez le backend: pm2 restart conciergerie-backend"
echo "   3. Si vous avez un domaine, configurez les DNS:"
echo "      - A record: $DOMAIN -> $PUBLIC_IP"
echo "      - A record: api.$DOMAIN -> $PUBLIC_IP"
echo "      - A record: app.$DOMAIN -> $PUBLIC_IP"
echo "      - A record: admin.$DOMAIN -> $PUBLIC_IP"
echo "   4. Ensuite, configurez SSL: certbot --nginx"
echo ""
echo "✅ L'application est maintenant en production !"

