# 🚀 Installation Ultra-Simple

## Étape 1 : Connectez-vous au serveur

Ouvrez votre terminal et tapez :

```bash
ssh root@178.128.205.135
```

## Étape 2 : Copiez-collez ces commandes UNE PAR UNE

### Commande 1 : Télécharger le script d'installation
```bash
curl -o install.sh https://raw.githubusercontent.com/Anthopululu/conciergerie-whatsapp-ai/main/install-on-server.sh
```

### Commande 2 : Rendre le script exécutable
```bash
chmod +x install.sh
```

### Commande 3 : Lancer l'installation (ça prend 5-10 minutes)
```bash
./install.sh
```

## Étape 3 : Configurer vos clés API

Une fois l'installation terminée, configurez vos clés :

```bash
nano /root/conciergerie-whatsapp-ai/backend/.env
```

Ajoutez vos clés (remplacez par vos vraies clés) :
```
TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token
ANTHROPIC_API_KEY=votre_anthropic_api_key
ADMIN_PASSWORD=votre_mot_de_passe
```

Pour sauvegarder : `Ctrl+X`, puis `Y`, puis `Entrée`

## Étape 4 : Redémarrer le backend

```bash
pm2 restart conciergerie-backend
```

## Étape 5 : Vérifier que ça marche

```bash
curl http://localhost:3000/health
```

Si vous voyez `{"status":"healthy"...}`, c'est bon ! ✅

## 🌐 Accéder à l'application

Ouvrez votre navigateur et allez sur :
```
http://178.128.205.135
```

---

## Alternative : Installation manuelle (si le script ne fonctionne pas)

Si le script ne fonctionne pas, copiez-collez ces commandes une par une :

```bash
# 1. Mise à jour
apt-get update && apt-get upgrade -y

# 2. Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 3. Installer PM2
npm install -g pm2

# 4. Installer Nginx
apt-get install -y nginx

# 5. Cloner le projet
cd /root
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai

# 6. Installer les dépendances
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
cd ../frontend-admin && npm install && npm run build

# 7. Démarrer avec PM2
cd /root/conciergerie-whatsapp-ai
pm2 start backend/dist/server.js --name conciergerie-backend
pm2 save
pm2 startup

# 8. Configurer Nginx
cat > /etc/nginx/sites-available/conciergerie << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -s /etc/nginx/sites-available/conciergerie /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 9. Ouvrir les ports
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

Puis configurez vos clés API comme à l'étape 3 ci-dessus.

