# 🚀 Guide Étape par Étape : Déployer sur DigitalOcean

Deux options pour déployer sur DigitalOcean :

## Option 1 : App Platform (Le plus simple) ⭐

### Étape 1 : Créer un compte DigitalOcean

1. Allez sur https://cloud.digitalocean.com
2. Cliquez sur **"Sign Up"**
3. Créez votre compte (email + mot de passe)
4. Vérifiez votre email

### Étape 2 : Créer une nouvelle App

1. Une fois connecté, cliquez sur **"Create"** en haut à droite
2. Sélectionnez **"Apps"**
3. Cliquez sur **"GitHub"** pour connecter votre repository

### Étape 3 : Connecter GitHub

1. Cliquez sur **"Authorize DigitalOcean"**
2. Autorisez l'accès à votre repository
3. Sélectionnez le repository : `Anthopululu/conciergerie-whatsapp-ai`
4. Cliquez sur **"Next"**

### Étape 4 : Configurer le Backend

1. DigitalOcean détecte automatiquement le dossier `backend/`
2. **Type** : Web Service
3. **Build Command** : `cd backend && npm install && npm run build`
4. **Run Command** : `cd backend && node dist/server.js`
5. **Port** : `3000`
6. Cliquez sur **"Next"**

### Étape 5 : Ajouter les Variables d'Environnement

Cliquez sur **"Edit"** et ajoutez :

```
NODE_ENV=production
PORT=3000
TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token
ANTHROPIC_API_KEY=votre_anthropic_api_key
ADMIN_PASSWORD=votre_mot_de_passe_securise
```

### Étape 6 : Configurer les Frontends

1. Cliquez sur **"Add Resource"** > **"Static Site"**
2. **Source Directory** : `frontend`
3. **Build Command** : `cd frontend && npm install && npm run build`
4. **Output Directory** : `dist`
5. Répétez pour `frontend-admin`

### Étape 7 : Déployer

1. Cliquez sur **"Next"**
2. Choisissez un nom pour votre app (ex: `conciergerie-whatsapp`)
3. Sélectionnez la région (ex: `Frankfurt` pour l'Europe)
4. Cliquez sur **"Create Resources"**
5. Attendez 5-10 minutes que le déploiement se termine

### Étape 8 : Accéder à l'Application

Une fois déployé, vous obtiendrez :
- **Backend** : `https://votre-app-backend.ondigitalocean.app`
- **Frontend** : `https://votre-app-frontend.ondigitalocean.app`
- **Admin** : `https://votre-app-admin.ondigitalocean.app`

✅ **C'est tout !** Votre app est accessible 24/7.

**Coût** : ~$5-12/mois

---

## Option 2 : Droplet VPS (Plus de contrôle)

### Étape 1 : Créer un Droplet

1. Allez sur https://cloud.digitalocean.com
2. Cliquez sur **"Create"** > **"Droplets"**
3. **Image** : Ubuntu 22.04 LTS
4. **Plan** : Basic - Regular Intel - $6/mois (1GB RAM) ou $12/mois (2GB RAM)
5. **Region** : Choisissez la plus proche (ex: Frankfurt)
6. **Authentication** : SSH Key (recommandé) ou Password
7. Cliquez sur **"Create Droplet"**
8. Attendez 1-2 minutes que le droplet soit créé

### Étape 2 : Noter l'IP du Droplet

1. Une fois créé, notez l'**IP publique** (ex: `178.128.205.135`)
2. Vous pouvez aussi créer un domaine et pointer vers cette IP

### Étape 3 : Se connecter au Droplet

Ouvrez votre terminal et connectez-vous :

```bash
ssh root@VOTRE_IP
```

Remplacez `VOTRE_IP` par l'IP de votre droplet.

### Étape 4 : Installer l'Application

Une fois connecté, exécutez :

```bash
# Cloner le repository
cd /root
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai

# Lancer l'installation automatique
chmod +x install-production.sh
./install-production.sh
```

Le script va :
- ✅ Installer Node.js, PM2, Nginx
- ✅ Installer les dépendances
- ✅ Builder les applications
- ✅ Configurer PM2 pour la production
- ✅ Configurer Nginx comme reverse proxy
- ✅ Configurer le firewall

**Temps** : 5-10 minutes

### Étape 5 : Configurer les Variables d'Environnement

```bash
nano /opt/conciergerie-whatsapp-ai/backend/.env
```

Ajoutez vos clés API :

```env
NODE_ENV=production
PORT=3000
TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token
ANTHROPIC_API_KEY=votre_anthropic_api_key
ADMIN_PASSWORD=votre_mot_de_passe_securise
```

Pour sauvegarder : `Ctrl+X`, puis `Y`, puis `Entrée`

### Étape 6 : Redémarrer le Backend

```bash
pm2 restart conciergerie-backend
```

### Étape 7 : Vérifier que tout fonctionne

```bash
# Vérifier le status
pm2 status

# Vérifier le health check
curl http://localhost:3000/health

# Voir les logs
pm2 logs conciergerie-backend
```

### Étape 8 : Accéder à l'Application

Votre application est maintenant accessible sur :
- **Backend API** : `http://VOTRE_IP`
- **Frontend Conciergerie** : `http://VOTRE_IP` (si configuré)
- **Frontend Admin** : `http://VOTRE_IP` (si configuré)

### Étape 9 : (Optionnel) Configurer un Domaine

Si vous avez un domaine (ex: `conciergerie.com`) :

1. **Dans votre registrar DNS**, ajoutez :
   - Type `A` : `@` → `VOTRE_IP`
   - Type `A` : `api` → `VOTRE_IP`
   - Type `A` : `app` → `VOTRE_IP`
   - Type `A` : `admin` → `VOTRE_IP`

2. **Attendez la propagation DNS** (5-30 minutes)

3. **Configurez SSL avec Let's Encrypt** :
   ```bash
   certbot --nginx -d conciergerie.com -d api.conciergerie.com -d app.conciergerie.com -d admin.conciergerie.com
   ```

✅ **C'est tout !** Votre app est accessible 24/7.

**Coût** : ~$6-12/mois

---

## 📊 Comparaison des Options

| Critère | App Platform | Droplet VPS |
|---------|--------------|------------|
| **Facilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Contrôle** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Coût** | $5-12/mois | $6-12/mois |
| **Scaling** | Automatique | Manuel |
| **Maintenance** | Minimale | Plus de maintenance |
| **SSL** | Automatique | Manuel (certbot) |

---

## 🎯 Recommandation

- **Pour commencer rapidement** : Utilisez **App Platform**
- **Pour plus de contrôle** : Utilisez un **Droplet VPS**

---

## 🔧 Commandes Utiles (Droplet)

### Voir les logs
```bash
pm2 logs conciergerie-backend
```

### Redémarrer l'application
```bash
pm2 restart conciergerie-backend
```

### Arrêter l'application
```bash
pm2 stop conciergerie-backend
```

### Mettre à jour l'application
```bash
cd /opt/conciergerie-whatsapp-ai
git pull
cd backend && npm install && npm run build
pm2 restart conciergerie-backend
cd ../frontend && npm install && npm run build
cd ../frontend-admin && npm install && npm run build
systemctl restart nginx
```

### Vérifier le status
```bash
pm2 status
systemctl status nginx
```

### Backup de la base de données
```bash
/opt/conciergerie-whatsapp-ai/backup.sh
```

---

## 🆘 Dépannage

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

# Redémarrer
systemctl restart nginx
```

### L'application n'est pas accessible
```bash
# Vérifier le firewall
ufw status

# Vérifier que les ports sont ouverts
ufw allow 80
ufw allow 443
```

---

## 📚 Ressources

- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [App Platform Guide](https://docs.digitalocean.com/products/app-platform/)
- [Droplet Guide](https://docs.digitalocean.com/products/droplets/)

