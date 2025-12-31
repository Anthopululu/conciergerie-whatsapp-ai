# 💬 Application Conciergerie WhatsApp avec IA

Application complète permettant à une conciergerie de recevoir des messages WhatsApp de clients et d'y répondre avec l'assistance de l'IA Claude 3.5 Haiku.

## ✨ Fonctionnalités

- **Multi-conciergerie** : Support de plusieurs conciergeries avec isolation complète des données
- **Réponses IA automatiques** : Génération automatique de réponses basées sur les FAQs configurées
- **Mode manuel/automatique** : Basculement entre réponses IA automatiques et interventions manuelles par conversation
- **Dashboard Conciergerie** : Interface pour gérer les conversations avec les clients
- **Dashboard Admin** : Interface pour gérer les conciergeries, FAQs, et configurations
- **FAQs personnalisées** : Chaque conciergerie peut configurer ses propres FAQs
- **Statistiques** : Tableau de bord avec métriques (messages, conversations, temps de réponse)
- **Recherche** : Recherche dans les conversations et messages
- **Historique complet** : Toutes les conversations sont sauvegardées dans SQLite

## 🏗️ Architecture

```
Client WhatsApp
    ↓
Twilio WhatsApp API
    ↓
Backend (Node.js + Express)
    ├─→ Claude 3.5 Haiku (réponses automatiques avec FAQs)
    ├─→ SQLite (multi-conciergeries, conversations, FAQs)
    ├─→ Dashboard Conciergerie React (port 5173)
    └─→ Dashboard Admin React (port 5174)
```

## 📋 Prérequis

- Node.js 18+ installé
- Compte Twilio avec WhatsApp configuré
- Compte Anthropic avec clé API Claude

## 🚀 Installation locale

### 1. Cloner le repository

```bash
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai
```

### 2. Installer les dépendances

```bash
# Backend
cd backend
npm install

# Frontend Conciergerie
cd ../frontend
npm install

# Frontend Admin
cd ../frontend-admin
npm install
```

### 3. Configuration

Créer un fichier `.env` à la racine du projet :

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Anthropic Claude
ANTHROPIC_API_KEY=your_api_key

# Server
PORT=3000
NODE_ENV=development

# Admin credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### 4. Lancer l'application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend Conciergerie
cd frontend
npm run dev

# Terminal 3 - Frontend Admin
cd frontend-admin
npm run dev
```

L'application sera accessible sur :
- **Backend** : http://localhost:3000
- **Frontend Conciergerie** : http://localhost:5173
- **Frontend Admin** : http://localhost:5174

## 🌐 Déploiement sur Render

### Backend

1. Créer un nouveau **Web Service** sur Render
2. Connecter le repository GitHub
3. Configuration :
   - **Root Directory** : `backend`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `node dist/server.js`
   - **Environment** : Node
4. Ajouter les variables d'environnement (voir section Configuration)

### Frontend Conciergerie

1. Créer un nouveau **Static Site** sur Render
2. Connecter le repository GitHub
3. Configuration :
   - **Root Directory** : `frontend`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`
4. Ajouter la variable d'environnement :
   - `VITE_API_URL` : URL de votre backend Render (ex: `https://conciergerie-backend.onrender.com`)

### Frontend Admin

1. Créer un nouveau **Static Site** sur Render
2. Connecter le repository GitHub
3. Configuration :
   - **Root Directory** : `frontend-admin`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`
4. Ajouter la variable d'environnement :
   - `VITE_API_URL` : URL de votre backend Render

### Configuration Twilio

1. Dans la console Twilio, configurer le webhook :
   - **URL** : `https://votre-backend.onrender.com/webhook/whatsapp`
   - **Method** : `HTTP POST`
2. Dans l'interface admin, configurer les credentials Twilio pour chaque conciergerie

Voir `CONFIGURER_TWILIO.md` pour plus de détails.

## 🔐 Identifiants par défaut

Après le premier déploiement, initialisez les données de test :

```bash
curl -X POST https://votre-backend.onrender.com/api/setup/seed
```

Cela créera :
- **Admin** : `admin@example.com` / `admin123`
- **Conciergerie 1** : `parc@conciergerie.fr` / `parc123`
- **Conciergerie 2** : `jardins@conciergerie.fr` / `jardins123`

Voir `INITIALISER_DONNEES.md` pour plus de détails.

## 📚 API Endpoints

### Authentification

- `POST /api/auth/login` - Connexion conciergerie
- `POST /api/auth/logout` - Déconnexion conciergerie
- `GET /api/auth/me` - Vérifier la session
- `POST /api/admin/auth/login` - Connexion admin
- `POST /api/admin/auth/logout` - Déconnexion admin

### Conversations

- `GET /api/conversations` - Liste des conversations
- `GET /api/conversations/:id/messages` - Messages d'une conversation
- `POST /api/conversations/:id/send` - Envoyer un message
- `PATCH /api/conversations/:id/auto-reply` - Modifier le mode IA/Humain

### FAQs

- `GET /api/faqs` - Liste des FAQs
- `POST /api/faqs` - Créer une FAQ
- `PATCH /api/faqs/:id` - Modifier une FAQ
- `DELETE /api/faqs/:id` - Supprimer une FAQ

### Statistiques

- `GET /api/statistics` - Statistiques de la conciergerie

### Recherche

- `GET /api/search?q=query` - Rechercher dans les conversations

### Webhook Twilio

- `POST /webhook/whatsapp` - Recevoir les messages WhatsApp

## 🗄️ Base de données

SQLite avec les tables suivantes :
- `conciergeries` - Informations des conciergeries
- `conversations` - Conversations avec les clients
- `messages` - Messages des conversations
- `faqs` - FAQs par conciergerie
- `phone_routing` - Routage des numéros de téléphone
- `response_templates` - Templates de réponses rapides
- `conversation_tags` - Tags pour les conversations
- `conversation_notes` - Notes internes sur les conversations

## 🛠️ Technologies utilisées

- **Backend** : Node.js, Express, TypeScript, SQLite (sql.js)
- **Frontend** : React, TypeScript, Vite
- **IA** : Anthropic Claude 3.5 Haiku
- **WhatsApp** : Twilio WhatsApp API

## 📖 Documentation supplémentaire

- `CONFIGURER_TWILIO.md` - Guide de configuration Twilio
- `DIAGNOSTIC_WHATSAPP.md` - Guide de diagnostic pour les problèmes WhatsApp
- `INITIALISER_DONNEES.md` - Guide pour initialiser les données de test

## 📝 Licence

MIT
