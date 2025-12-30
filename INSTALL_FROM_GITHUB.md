# Installation depuis GitHub

## Installation rapide sur le droplet

Connectez-vous au droplet et exécutez ces commandes :

```bash
ssh root@178.128.205.135
```

Puis :

```bash
# Cloner le repository
cd /root
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai

# Rendre le script exécutable
chmod +x install-production.sh

# Lancer l'installation
./install-production.sh
```

Le script va :
- ✅ Installer Node.js, PM2, Nginx
- ✅ Installer les dépendances
- ✅ Builder les applications
- ✅ Configurer PM2
- ✅ Configurer Nginx
- ✅ Configurer le firewall

## Après l'installation

1. **Configurer les variables d'environnement :**
```bash
nano /opt/conciergerie-whatsapp-ai/backend/.env
```

Ajoutez vos clés API :
```env
TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token
ANTHROPIC_API_KEY=votre_anthropic_api_key
ADMIN_PASSWORD=votre_mot_de_passe_securise
```

2. **Redémarrer le backend :**
```bash
pm2 restart conciergerie-backend
```

3. **Vérifier que tout fonctionne :**
```bash
curl http://localhost:3000/health
```

## Mise à jour future

Pour mettre à jour l'application :

```bash
cd /opt/conciergerie-whatsapp-ai
git pull
cd backend && npm ci && npm run build
cd ../frontend && npm ci && npm run build
cd ../frontend-admin && npm ci && npm run build
pm2 restart conciergerie-backend
systemctl restart nginx
```

