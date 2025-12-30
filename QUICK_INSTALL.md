# 🚀 Installation Rapide sur Droplet

## Méthode la plus simple

### 1. Depuis votre machine locale, copiez le script sur le droplet :

```bash
scp install-production.sh root@178.128.205.135:/root/
```

### 2. Connectez-vous au droplet :

```bash
ssh root@178.128.205.135
```

### 3. Exécutez l'installation :

```bash
chmod +x install-production.sh
./install-production.sh
```

Le script va vous demander :
- Comment obtenir le code (GitHub ou copie locale)
- Votre domaine (ou appuyez sur Entrée pour utiliser l'IP)

### 4. Après l'installation, configurez vos clés API :

```bash
nano /opt/conciergerie-whatsapp-ai/backend/.env
```

Ajoutez vos vraies clés :
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `ANTHROPIC_API_KEY`
- `ADMIN_PASSWORD`

### 5. Redémarrez le backend :

```bash
pm2 restart conciergerie-backend
```

### 6. Vérifiez que tout fonctionne :

```bash
curl http://localhost:3000/health
```

## ✅ C'est tout !

Votre application est maintenant accessible sur :
- **Backend API** : `http://178.128.205.135` (ou votre domaine)
- **Frontend Conciergerie** : `http://app.178.128.205.135` (si configuré)
- **Frontend Admin** : `http://admin.178.128.205.135` (si configuré)

## 📝 Commandes utiles

```bash
# Voir les logs
pm2 logs conciergerie-backend

# Redémarrer
pm2 restart conciergerie-backend

# Status
pm2 status
```

