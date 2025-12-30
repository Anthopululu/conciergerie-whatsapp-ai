# Guide de Déploiement DigitalOcean

Guide complet pour déployer l'application Conciergerie WhatsApp sur DigitalOcean.

## Options DigitalOcean

### Option 1 : App Platform (Recommandé - Le Plus Simple)
- ✅ Déploiement automatique depuis GitHub
- ✅ SSL automatique
- ✅ Scaling automatique
- ✅ Monitoring intégré
- 💰 ~12-25$/mois

### Option 2 : Droplet + CapRover (Recommandé - Économique)
- ✅ Interface graphique simple
- ✅ Contrôle total
- ✅ SSL automatique
- 💰 ~6-12$/mois

### Option 3 : Droplet Classique + PM2
- ✅ Contrôle total
- ✅ Configuration manuelle
- 💰 ~6-12$/mois

---

## Option 1 : App Platform (Le Plus Simple)

### 1. Créer un Compte DigitalOcean

1. Aller sur [digitalocean.com](https://www.digitalocean.com)
2. Créer un compte (obtenez $200 de crédit avec un lien de parrainage)
3. Vérifier votre email

### 2. Créer l'Application Backend

1. Dans le dashboard DigitalOcean, aller dans **App Platform**
2. Cliquer sur **Create App**
3. Connecter votre repository GitHub
4. Sélectionner le repository `conciergerie-whatsapp-ai`
5. Branch : `main`

**Configuration Backend :**
- **Type** : Web Service
- **Source Directory** : `backend`
- **Build Command** : `npm install && npm run build`
- **Run Command** : `npm start`
- **HTTP Port** : `3000`
- **Environment Variables** :
  ```
  TWILIO_ACCOUNT_SID=your_account_sid
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
  ANTHROPIC_API_KEY=your_api_key
  PORT=3000
  NODE_ENV=production
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=your_secure_password
  ```

### 3. Créer l'Application Frontend Conciergerie

1. Dans la même app, cliquer sur **Add Component** > **Static Site**
2. **Source Directory** : `frontend`
3. **Build Command** : `npm install && npm run build`
4. **Output Directory** : `dist`
5. **Routes** : Ajouter une route `/api/*` qui pointe vers le backend

### 4. Créer l'Application Frontend Admin

1. **Add Component** > **Static Site**
2. **Source Directory** : `frontend-admin`
3. **Build Command** : `npm install && npm run build`
4. **Output Directory** : `dist`
5. **Routes** : Ajouter une route `/api/*` qui pointe vers le backend

### 5. Configuration des Domaines

1. Dans **Settings** > **Domains**
2. Ajouter vos domaines :
   - `api.votre-domaine.com` → Backend
   - `app.votre-domaine.com` → Frontend Conciergerie
   - `admin.votre-domaine.com` → Frontend Admin
3. DigitalOcean configure automatiquement SSL

### 6. Déploiement

1. Cliquer sur **Deploy**
2. DigitalOcean build et déploie automatiquement
3. À chaque push sur `main`, l'app se met à jour automatiquement

**Avantages :**
- ✅ Zéro configuration serveur
- ✅ SSL automatique
- ✅ Scaling automatique
- ✅ Monitoring intégré
- ✅ Logs en temps réel

---

## Option 2 : Droplet + CapRover (Économique et Simple)

### 1. Créer un Droplet

1. Dans DigitalOcean, aller dans **Droplets**
2. Cliquer sur **Create Droplet**
3. Configuration recommandée :
   - **Image** : Ubuntu 22.04 LTS
   - **Plan** : Basic ($6/mois - 1GB RAM suffit pour commencer)
   - **Datacenter** : Choisir le plus proche de vos utilisateurs
   - **Authentication** : SSH Key (recommandé) ou Password
4. Cliquer sur **Create Droplet**

### 2. Se Connecter au Droplet

```bash
# Récupérer l'IP du droplet depuis le dashboard
ssh root@VOTRE_IP_DROPLET

# Ou avec une clé SSH
ssh -i ~/.ssh/id_rsa root@VOTRE_IP_DROPLET
```

### 3. Installer CapRover

```bash
# Installer Docker (requis pour CapRover)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installer CapRover
docker run -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  caprover/caprover

# Attendre 2-3 minutes que CapRover démarre
```

### 4. Configuration Initiale CapRover

1. Ouvrir `http://VOTRE_IP_DROPLET` dans votre navigateur
2. Suivre l'assistant de configuration :
   - Définir un mot de passe admin
   - Optionnel : Configurer un domaine (ex: `captain.votre-domaine.com`)

### 5. Créer les Applications dans CapRover

#### Application Backend

1. **Apps** > **One-Click Apps/Databases** > **Create New App**
2. Nom : `conciergerie-backend`
3. **App Configs** > **Deployment** :
   - Méthode : **GitHub**
   - Repository : `Anthopululu/conciergerie-whatsapp-ai`
   - Branch : `main`
   - Dockerfile Location : `backend/Dockerfile`
4. **App Configs** > **Environment Variables** :
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ANTHROPIC_API_KEY=your_api_key
   PORT=3000
   NODE_ENV=production
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_secure_password
   ```
5. **HTTP Settings** :
   - Activer HTTPS
   - Ajouter domaine : `api.votre-domaine.com`
6. **App Configs** > **Volumes** (pour persister la DB) :
   - Host Path : `/captain/data/conciergerie-backend`
   - Container Path : `/app/concierge.db`
7. **Save & Update**

#### Application Frontend Conciergerie

1. Créer une nouvelle app : `conciergerie-frontend`
2. **Deployment** :
   - Méthode : **GitHub**
   - Dockerfile Location : `frontend/Dockerfile`
3. **HTTP Settings** :
   - Activer HTTPS
   - Domaine : `app.votre-domaine.com`
4. **Save & Update**

#### Application Frontend Admin

1. Créer une nouvelle app : `conciergerie-admin`
2. **Deployment** :
   - Méthode : **GitHub**
   - Dockerfile Location : `frontend-admin/Dockerfile`
3. **HTTP Settings** :
   - Activer HTTPS
   - Domaine : `admin.votre-domaine.com`
4. **Save & Update**

### 6. Configuration DNS

Dans votre registrar de domaine (ex: Namecheap, GoDaddy) :

```
Type A Records:
api.votre-domaine.com    → VOTRE_IP_DROPLET
app.votre-domaine.com    → VOTRE_IP_DROPLET
admin.votre-domaine.com  → VOTRE_IP_DROPLET
```

CapRover configure automatiquement SSL avec Let's Encrypt !

**Coût total : ~$6-12/mois** (juste le droplet)

---

## Option 3 : Droplet Classique + PM2

### 1. Créer un Droplet

Même processus que l'Option 2, étape 1.

### 2. Préparation du Serveur

```bash
# Se connecter au droplet
ssh root@VOTRE_IP_DROPLET

# Mettre à jour le système
apt update && apt upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Installer PM2
npm install -g pm2

# Installer Nginx
apt install nginx -y

# Installer Certbot pour SSL
apt install certbot python3-certbot-nginx -y
```

### 3. Cloner le Projet

```bash
cd /var/www
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai
```

### 4. Configuration

```bash
# Créer le fichier .env
nano .env
```

Contenu :
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ANTHROPIC_API_KEY=your_api_key
PORT=3000
NODE_ENV=production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
```

### 5. Build et Déploiement

```bash
# Utiliser le script de déploiement
chmod +x deploy.sh
./deploy.sh
```

Ou manuellement :
```bash
# Backend
cd backend
npm install
npm run build
cd ..

# Frontend
cd frontend
npm install
npm run build
cd ..

# Frontend Admin
cd frontend-admin
npm install
npm run build
cd ..

# Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Configuration Nginx

Créer `/etc/nginx/sites-available/api.votre-domaine.com` :

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

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
}
```

Créer `/etc/nginx/sites-available/app.votre-domaine.com` :

```nginx
server {
    listen 80;
    server_name app.votre-domaine.com;
    root /var/www/conciergerie-whatsapp-ai/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Créer `/etc/nginx/sites-available/admin.votre-domaine.com` :

```nginx
server {
    listen 80;
    server_name admin.votre-domaine.com;
    root /var/www/conciergerie-whatsapp-ai/frontend-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activer les sites :
```bash
ln -s /etc/nginx/sites-available/api.votre-domaine.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/app.votre-domaine.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/admin.votre-domaine.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 7. Configuration SSL

```bash
certbot --nginx -d api.votre-domaine.com
certbot --nginx -d app.votre-domaine.com
certbot --nginx -d admin.votre-domaine.com
```

---

## Configuration du Webhook Twilio

Dans votre console Twilio :
1. **Messaging** > **Settings** > **WhatsApp Sandbox Settings**
2. Webhook URL : `https://api.votre-domaine.com/webhook/whatsapp`
3. Méthode : **HTTP POST**

---

## Mise à Jour

### Avec App Platform
- Automatique à chaque push sur `main`

### Avec CapRover
- Automatique si activé dans les settings
- Ou manuellement : **App Configs** > **Deployment** > **Deploy**

### Avec Droplet Classique
```bash
cd /var/www/conciergerie-whatsapp-ai
git pull
./deploy.sh
# ou
pm2 restart conciergerie-backend
```

---

## Monitoring et Logs

### App Platform
- Logs disponibles dans le dashboard DigitalOcean
- Monitoring automatique

### CapRover
- Logs dans l'interface CapRover
- Monitoring dans **App Configs** > **Monitoring**

### PM2
```bash
pm2 logs conciergerie-backend
pm2 status
pm2 monit
```

---

## Sauvegarde

### App Platform
- DigitalOcean fait des snapshots automatiques
- Vous pouvez aussi sauvegarder la DB manuellement

### CapRover / Droplet
```bash
# Sauvegarder la base de données
cp /var/www/conciergerie-whatsapp-ai/backend/concierge.db \
   /root/backups/concierge-$(date +%Y%m%d).db

# Automatiser avec cron (tous les jours à 2h)
crontab -e
# Ajouter :
0 2 * * * cp /var/www/conciergerie-whatsapp-ai/backend/concierge.db /root/backups/concierge-$(date +\%Y\%m\%d).db
```

### Snapshots DigitalOcean
1. Dans le dashboard, aller sur votre Droplet
2. **Snapshots** > **Take Snapshot**
3. Les snapshots sont facturés séparément (~$0.06/GB/mois)

---

## Recommandation

**Pour débuter :** Option 2 (Droplet + CapRover)
- Simple à configurer
- Économique ($6-12/mois)
- Interface graphique intuitive
- SSL automatique

**Pour production :** Option 1 (App Platform)
- Zéro maintenance
- Scaling automatique
- Monitoring intégré
- Plus cher mais plus simple

**Pour contrôle total :** Option 3 (Droplet + PM2)
- Configuration manuelle complète
- Maximum de contrôle
- Nécessite plus de connaissances

---

## Support DigitalOcean

- Documentation : https://docs.digitalocean.com
- Community : https://www.digitalocean.com/community
- Support : Disponible dans le dashboard


