# Installation sur DigitalOcean Droplet

Guide pour installer l'application sur votre droplet DigitalOcean.

## 🚀 Installation Automatique

### Option 1 : Depuis votre machine locale (recommandé)

1. **Copiez le script d'installation sur le droplet :**
```bash
scp install-production.sh root@178.128.205.135:/root/
```

2. **Connectez-vous au droplet :**
```bash
ssh root@178.128.205.135
```

3. **Exécutez le script d'installation :**
```bash
chmod +x install-production.sh
./install-production.sh
```

Le script va :
- ✅ Installer Node.js 18, PM2, Nginx
- ✅ Installer les dépendances
- ✅ Builder les applications
- ✅ Configurer PM2 pour la production
- ✅ Configurer Nginx comme reverse proxy
- ✅ Configurer le firewall
- ✅ Optionnel : Configurer SSL avec Let's Encrypt

### Option 2 : Installation manuelle depuis le droplet

1. **Connectez-vous au droplet :**
```bash
ssh root@178.128.205.135
```

2. **Clonez le repository (ou copiez le code) :**
```bash
# Si vous avez un repository GitHub
git clone https://github.com/votre-username/conciergerie-whatsapp-ai.git /opt/conciergerie-whatsapp-ai

# OU copiez le code depuis votre machine locale
# Depuis votre machine locale :
scp -r . root@178.128.205.135:/opt/conciergerie-whatsapp-ai/
```

3. **Exécutez le script d'installation :**
```bash
cd /opt/conciergerie-whatsapp-ai
chmod +x install-production.sh
./install-production.sh
```

## ⚙️ Configuration Post-Installation

### 1. Configurer les variables d'environnement

Éditez le fichier `.env` du backend :
```bash
nano /opt/conciergerie-whatsapp-ai/backend/.env
```

Ajoutez vos vraies clés API :
```env
NODE_ENV=production
PORT=3000

TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token

ANTHROPIC_API_KEY=votre_anthropic_api_key

ADMIN_USERNAME=admin
ADMIN_PASSWORD=votre_mot_de_passe_securise
```

### 2. Redémarrer le backend
```bash
pm2 restart conciergerie-backend
```

### 3. Vérifier que tout fonctionne
```bash
# Vérifier le status PM2
pm2 status

# Vérifier les logs
pm2 logs conciergerie-backend

# Tester le health check
curl http://localhost:3000/health
```

## 🌐 Configuration DNS (si vous avez un domaine)

Si vous avez un domaine (ex: `conciergerie.com`), configurez les DNS :

1. **Dans votre registrar DNS, ajoutez :**
   - `A` record : `@` → `178.128.205.135`
   - `A` record : `api` → `178.128.205.135`
   - `A` record : `app` → `178.128.205.135`
   - `A` record : `admin` → `178.128.205.135`

2. **Attendez la propagation DNS (5-30 minutes)**

3. **Configurez SSL avec Let's Encrypt :**
```bash
certbot --nginx -d conciergerie.com -d api.conciergerie.com -d app.conciergerie.com -d admin.conciergerie.com
```

## 📊 Commandes Utiles

### PM2 (Gestion du backend)
```bash
# Voir le status
pm2 status

# Voir les logs
pm2 logs conciergerie-backend

# Redémarrer
pm2 restart conciergerie-backend

# Arrêter
pm2 stop conciergerie-backend

# Démarrer
pm2 start conciergerie-backend

# Monitoring
pm2 monit
```

### Nginx
```bash
# Tester la configuration
nginx -t

# Redémarrer
systemctl restart nginx

# Voir les logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Backups
```bash
# Backup manuel
/opt/conciergerie-whatsapp-ai/backup.sh

# Voir les backups
ls -lh /opt/conciergerie-whatsapp-ai/backups/
```

## 🔒 Sécurité

### Firewall
Le script configure automatiquement UFW avec :
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)

### Mise à jour du système
```bash
apt-get update && apt-get upgrade -y
```

### Changer le mot de passe root
```bash
passwd
```

## 🐛 Dépannage

### Le backend ne démarre pas
```bash
# Vérifier les logs
pm2 logs conciergerie-backend --lines 50

# Vérifier le fichier .env
cat /opt/conciergerie-whatsapp-ai/backend/.env

# Vérifier que le port 3000 n'est pas utilisé
netstat -tulpn | grep 3000
```

### Nginx ne fonctionne pas
```bash
# Vérifier la configuration
nginx -t

# Vérifier les logs
tail -f /var/log/nginx/error.log

# Vérifier que Nginx écoute
netstat -tulpn | grep nginx
```

### Les frontends ne se chargent pas
```bash
# Vérifier que les builds existent
ls -la /opt/conciergerie-whatsapp-ai/frontend/dist/
ls -la /opt/conciergerie-whatsapp-ai/frontend-admin/dist/

# Rebuild si nécessaire
cd /opt/conciergerie-whatsapp-ai/frontend && npm run build
cd /opt/conciergerie-whatsapp-ai/frontend-admin && npm run build
```

## 📈 Monitoring Production

### Health Check
```bash
curl http://localhost:3000/health
```

### Métriques système
```bash
# CPU et mémoire
htop

# Espace disque
df -h

# Logs système
journalctl -xe
```

## 🔄 Mise à jour de l'application

1. **Sauvegarder la base de données :**
```bash
/opt/conciergerie-whatsapp-ai/backup.sh
```

2. **Mettre à jour le code :**
```bash
cd /opt/conciergerie-whatsapp-ai
git pull  # Si vous utilisez git
# OU copiez le nouveau code depuis votre machine
```

3. **Rebuild et redémarrer :**
```bash
cd /opt/conciergerie-whatsapp-ai/backend
npm ci
npm run build
pm2 restart conciergerie-backend

cd /opt/conciergerie-whatsapp-ai/frontend
npm ci
npm run build

cd /opt/conciergerie-whatsapp-ai/frontend-admin
npm ci
npm run build
```

4. **Redémarrer Nginx :**
```bash
systemctl restart nginx
```

## ✅ Checklist Post-Installation

- [ ] Variables d'environnement configurées (`.env`)
- [ ] Backend redémarré et fonctionnel
- [ ] Health check répond : `curl http://localhost:3000/health`
- [ ] Frontends accessibles via Nginx
- [ ] SSL configuré (si domaine)
- [ ] Backups automatiques configurés
- [ ] Firewall configuré
- [ ] Monitoring en place

## 🆘 Support

En cas de problème :
1. Vérifiez les logs : `pm2 logs` et `journalctl -xe`
2. Vérifiez le health check : `curl http://localhost:3000/health`
3. Vérifiez la configuration Nginx : `nginx -t`

