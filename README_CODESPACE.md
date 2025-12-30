# 🚀 Lancer l'application avec GitHub Codespaces

La façon la plus simple d'utiliser l'application sans rien installer !

## 📋 Étapes

### 1. Ouvrir Codespaces

1. Allez sur https://github.com/Anthopululu/conciergerie-whatsapp-ai
2. Cliquez sur le bouton vert **"Code"** en haut à droite
3. Sélectionnez l'onglet **"Codespaces"**
4. Cliquez sur **"Create codespace on main"**

### 2. Attendre le démarrage

Le codespace va se créer automatiquement (2-3 minutes).

### 3. Lancer l'application

Une fois le codespace ouvert, ouvrez un terminal et exécutez :

```bash
chmod +x start-codespace.sh
./start-codespace.sh
```

Ou manuellement :

```bash
# Backend
cd backend && npm install && npm run dev &

# Frontend Conciergerie  
cd ../frontend && npm install && npm run dev &

# Frontend Admin
cd ../frontend-admin && npm install && npm run dev &
```

### 4. Accéder à l'application

Les ports seront automatiquement exposés. Cliquez sur l'onglet **"Ports"** dans VS Code pour voir les URLs.

- **Backend** : http://localhost:3000
- **Frontend Conciergerie** : http://localhost:5173
- **Frontend Admin** : http://localhost:5174

### 5. Configurer les variables d'environnement

Créez un fichier `backend/.env` :

```env
TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token
ANTHROPIC_API_KEY=votre_anthropic_api_key
ADMIN_PASSWORD=votre_mot_de_passe
```

## ✅ C'est tout !

L'application est maintenant accessible depuis votre navigateur.

## 💡 Astuce

Pour partager votre codespace avec d'autres personnes, utilisez le bouton "Share" en haut à droite.

