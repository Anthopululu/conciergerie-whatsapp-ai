# Application Conciergerie WhatsApp avec IA

Application complète permettant à une conciergerie de recevoir des messages WhatsApp de clients et d'y répondre avec l'assistance de l'IA Claude.

## Fonctionnalités

- **Multi-conciergerie** : Support de plusieurs conciergeries avec isolation complète des données
- **Authentification** : Système de login sécurisé avec tokens de session
- Réception de messages WhatsApp via Twilio
- Réponses automatiques générées par Claude 3.5 Haiku
- **FAQ personnalisée** : Chaque conciergerie peut configurer ses propres FAQs pour des réponses contextuelles
- **Dashboard Conciergerie** : Interface pour gérer les conversations avec les clients
- **Dashboard Admin** : Interface pour gérer les demandes de fonctionnalités
- Réponses IA automatiques envoyées directement aux clients (basées sur les FAQs)
- Possibilité d'intervention manuelle par la conciergerie
- Historique complet des conversations dans SQLite
- Système de feature requests pour proposer de nouvelles fonctionnalités
- Interface temps réel avec polling automatique

## Architecture

```
Client WhatsApp
    ↓
Twilio WhatsApp API
    ↓
Backend (Node.js + Express)
    ├─→ Claude 3.5 Haiku (réponses automatiques avec FAQs)
    ├─→ SQLite (multi-conciergeries, conversations, FAQs, feature requests)
    ├─→ Dashboard Conciergerie React (port 5173) - avec authentification
    └─→ Dashboard Admin React (port 5174)
```

## Prérequis

- Node.js 18+ installé
- Compte Twilio avec WhatsApp configuré
- Compte Anthropic avec clé API Claude

## Installation

### 1. Installer les dépendances

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

### 2. Configuration

Créer un fichier `.env` à la racine du projet avec vos credentials :

```bash
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Anthropic
ANTHROPIC_API_KEY=your_api_key

# Server
PORT=3000
```

### 3. Démarrer l'application

**Terminal 1 - Backend :**
```bash
cd backend
npm run dev
```
Le serveur démarre sur `http://localhost:3000`

**Terminal 2 - Dashboard Conciergerie :**
```bash
cd frontend
npm run dev
```
Le dashboard conciergerie s'ouvre sur `http://localhost:5173`

**Terminal 3 - Dashboard Admin :**
```bash
cd frontend-admin
npm run dev
```
Le dashboard admin s'ouvre sur `http://localhost:5174`

## Configuration Twilio Webhook

Pour recevoir des messages WhatsApp, il faut configurer le webhook Twilio :

### Option 1 : Utiliser ngrok (développement local)

1. Installer ngrok : https://ngrok.com/download

2. Démarrer ngrok :
```bash
ngrok http 3000
```

3. Copier l'URL HTTPS fournie (exemple : `https://abc123.ngrok.io`)

4. Configurer le webhook Twilio :
   - Aller sur https://console.twilio.com/us1/develop/sms/whatsapp/sandbox
   - Dans "WHEN A MESSAGE COMES IN", coller : `https://abc123.ngrok.io/webhook/whatsapp`
   - Sauvegarder

### Option 2 : Déployer en production

Déployer sur Railway, Render, ou autre plateforme, puis utiliser l'URL publique.

## Tester l'application

### 1. Envoyer un message test

1. Sur Twilio Console : https://console.twilio.com/us1/develop/sms/whatsapp/sandbox
2. Envoyer le code d'activation au numéro Twilio depuis WhatsApp (exemple : `join <code>`)
3. Une fois connecté, envoyer un message comme : "Bonjour, je voudrais réserver une table pour ce soir"

### 2. Se connecter au Dashboard Conciergerie

1. Ouvrir le dashboard conciergerie : http://localhost:5173
2. Se connecter avec les identifiants par défaut :
   - Email : `demo@example.com`
   - Mot de passe : `demo123`
3. La conversation apparaît dans la liste de gauche
4. Le message du client s'affiche
5. L'IA répond automatiquement au client (en utilisant les FAQs si pertinent)
6. Vous pouvez intervenir manuellement en tapant un message et en cliquant "Envoyer"

### 2.5. Configurer les FAQs (optionnel)

1. Dans le dashboard conciergerie, cliquer sur l'onglet "FAQ"
2. Cliquer sur "+ Ajouter une FAQ"
3. Remplir la question et la réponse
4. Cliquer sur "Ajouter"
5. L'IA utilisera automatiquement ces FAQs pour répondre aux clients

### 3. Gérer les demandes de fonctionnalités

1. Ouvrir le dashboard admin : http://localhost:5174
2. Cliquer sur "+ Nouvelle demande"
3. Remplir le titre, la description et la priorité
4. Cliquer sur "Soumettre"
5. La demande apparaît dans la liste avec son statut
6. Vous pouvez changer le statut ou supprimer la demande

## Structure du Projet

```
/
├── .env                          # Credentials (Twilio, Anthropic)
├── .gitignore                    # Fichiers à ignorer (dont .env)
├── concierge.db                  # Base de données SQLite
├── README.md                     # Ce fichier
├── backend/
│   ├── src/
│   │   ├── server.ts            # Serveur Express principal
│   │   ├── database.ts          # Gestion SQLite
│   │   ├── claude.ts            # Intégration Claude AI
│   │   └── twilio.ts            # Envoi messages WhatsApp
│   ├── package.json
│   └── tsconfig.json
├── frontend/                     # Dashboard Conciergerie (port 5173)
│   ├── src/
│   │   ├── App.tsx              # Application principale avec login
│   │   ├── components/
│   │   │   ├── ConversationList.tsx  # Liste conversations
│   │   │   ├── ChatWindow.tsx        # Fenêtre de chat
│   │   │   ├── FAQ.tsx               # Gestion des FAQs
│   │   │   └── Login.tsx             # Page de connexion
│   │   └── types.ts             # Types TypeScript
│   ├── package.json
│   └── vite.config.ts
└── frontend-admin/               # Dashboard Admin (port 5174)
    ├── src/
    │   ├── App.tsx              # Application admin
    │   ├── components/
    │   │   └── FeatureRequests.tsx   # Gestion feature requests
    │   └── types.ts             # Types TypeScript
    ├── package.json
    └── vite.config.ts
```

## API Endpoints

### Backend (http://localhost:3000)

**Authentification :**
- `POST /api/admin/conciergeries` - Créer une conciergerie (admin)
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/logout` - Se déconnecter
- `GET /api/auth/me` - Vérifier la session

**Conversations :** (requiert authentification)
- `POST /webhook/whatsapp` - Webhook Twilio (reçoit messages)
- `GET /api/conversations` - Liste les conversations de la conciergerie connectée
- `GET /api/conversations/:id/messages` - Messages d'une conversation
- `POST /api/conversations/:id/send` - Envoyer un message

**FAQs :** (requiert authentification)
- `GET /api/faqs` - Liste les FAQs de la conciergerie connectée
- `POST /api/faqs` - Créer une FAQ
- `PATCH /api/faqs/:id` - Modifier une FAQ
- `DELETE /api/faqs/:id` - Supprimer une FAQ

**Feature Requests :**
- `GET /api/feature-requests` - Liste toutes les demandes
- `POST /api/feature-requests` - Créer une demande
- `PATCH /api/feature-requests/:id` - Modifier le statut d'une demande
- `DELETE /api/feature-requests/:id` - Supprimer une demande

## Base de Données

### Table `conciergeries`
- `id` : ID auto-incrémenté
- `name` : Nom de la conciergerie
- `email` : Email de connexion (unique)
- `password_hash` : Hash SHA-256 du mot de passe
- `created_at` : Date de création

### Table `conversations`
- `id` : ID auto-incrémenté
- `conciergerie_id` : ID de la conciergerie (FK)
- `phone_number` : Numéro WhatsApp client
- `created_at` : Date création
- `last_message_at` : Dernière activité

### Table `messages`
- `id` : ID auto-incrémenté
- `conversation_id` : Référence conversation
- `sender` : 'client' ou 'concierge'
- `message` : Contenu du message
- `ai_suggestion` : Suggestion Claude (si message client)
- `created_at` : Date du message

### Table `faqs`
- `id` : ID auto-incrémenté
- `conciergerie_id` : ID de la conciergerie (FK)
- `question` : Question
- `answer` : Réponse
- `created_at` : Date de création
- `updated_at` : Date de modification

### Table `feature_requests`
- `id` : ID auto-incrémenté
- `conciergerie_id` : ID de la conciergerie créatrice (FK)
- `title` : Titre de la demande
- `description` : Description détaillée
- `status` : 'pending' | 'in_progress' | 'completed' | 'rejected'
- `priority` : 'low' | 'medium' | 'high'
- `created_at` : Date de création
- `updated_at` : Date de modification

## Coûts estimés

### Twilio
- Sandbox : **Gratuit** (pour tests)
- Production : ~0.005$ par message

### Claude 3.5 Haiku
- ~0.25$ par million de tokens (~$0.0005 par message de 200 tokens)
- Pour 1000 messages/mois : ~0.50$
- $5 de crédit gratuit pour les nouveaux comptes

**Total mensuel pour 1000 messages : ~5.50$**

## Dépannage

### Le webhook ne reçoit pas de messages
- Vérifier que ngrok est actif
- Vérifier l'URL webhook sur Twilio Console
- Regarder les logs backend : `cd backend && npm run dev`

### Erreur Claude
- Vérifier la clé API dans `.env` (ANTHROPIC_API_KEY)
- Vérifier le crédit Anthropic : https://console.anthropic.com/

### Messages non envoyés
- Vérifier les credentials Twilio dans `.env`
- Regarder les logs Twilio : https://console.twilio.com/monitor/logs/errors

## Différences entre les dashboards

### Dashboard Conciergerie (http://localhost:5173)
- Pour les opérateurs de conciergerie
- **Authentification requise** : Chaque conciergerie a son propre compte
- Gestion des conversations WhatsApp avec les clients
- **Gestion des FAQs** : Configurer des questions/réponses pour l'IA
- Visualisation des messages et interventions manuelles
- L'IA répond automatiquement aux clients en utilisant les FAQs configurées

### Dashboard Admin (http://localhost:5174)
- Pour les administrateurs système
- Gestion des demandes de fonctionnalités (feature requests)
- Statistiques sur les demandes (total, en attente, en cours, terminées)
- Création, modification et suppression de demandes
- Attribution de priorités et suivi de statut

## Prochaines étapes

Pour améliorer l'application :
1. Ajouter WebSockets pour mises à jour en temps réel
2. Ajouter authentification pour les dashboards
3. Ajouter un système de templates de réponses
4. Déployer en production (Railway, Render, AWS)
5. Ajouter des analytics (nombre de messages, temps de réponse)

## Support

## Déploiement en Production

Pour déployer l'application en production, consultez les guides :

- **[DEPLOY_SIMPLE.md](./DEPLOY_SIMPLE.md)** - Comparaison des méthodes simples ⭐
- **[DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)** - Guide Railway (le plus simple)
- **[DEPLOY_AWS.md](./DEPLOY_AWS.md)** - Guide AWS (Amplify, App Runner, etc.)
- **[DEPLOY_FLYIO.md](./DEPLOY_FLYIO.md)** - Guide Fly.io avec Dockerfiles
- **[DEPLOYMENT_DIGITALOCEAN.md](./DEPLOYMENT_DIGITALOCEAN.md)** - Guide DigitalOcean
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guide général (VPS, PM2, etc.)

### Options de déploiement disponibles :
- **Railway** (le plus simple, ~$5-20/mois) ⭐ Recommandé
- **AWS Amplify** (gratuit pour commencer, très simple) ⭐ Recommandé
- **AWS App Runner** (simple, ~$7-25/mois)
- **Render** (très simple, ~$7-25/mois)
- **Fly.io** (avec Dockerfiles, ~$5-15/mois)
- **DigitalOcean App Platform** (~$12-25/mois)
- **DigitalOcean Droplet + CapRover** (~$6-12/mois)
- **VPS classique** avec PM2

## Support

Pour toute question, vérifier :
- Documentation Twilio : https://www.twilio.com/docs/whatsapp
- Documentation Anthropic Claude : https://docs.anthropic.com/
