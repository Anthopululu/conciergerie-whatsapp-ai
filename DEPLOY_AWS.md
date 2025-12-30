# Guide de Déploiement AWS

AWS offre plusieurs options pour déployer votre application. Voici les plus simples.

---

## 🥇 Option 1 : AWS Amplify (LE PLUS SIMPLE)

AWS Amplify est la solution la plus simple pour déployer des applications full-stack sur AWS.

### Avantages
- ✅ Gratuit pour commencer (généralement gratuit jusqu'à 15GB/mois)
- ✅ Déploiement automatique depuis GitHub
- ✅ SSL automatique
- ✅ CDN global (rapide partout)
- ✅ Interface graphique simple
- ✅ Pas de configuration serveur

### Étapes

1. **Créer un compte AWS**
   - Allez sur https://aws.amazon.com
   - Créez un compte (nécessite une carte bancaire mais gratuit pour commencer)

2. **Accéder à AWS Amplify**
   - Allez sur https://console.aws.amazon.com/amplify
   - Cliquez sur **"New app"** > **"Host web app"**

3. **Connecter GitHub**
   - Sélectionnez **GitHub**
   - Autorisez AWS Amplify à accéder à vos repositories
   - Sélectionnez : `Anthopululu/conciergerie-whatsapp-ai`
   - Branch : `main`

4. **Configurer le Backend**
   - Cliquez sur **"Add environment"** ou **"Add backend"**
   - **App name** : `conciergerie-backend`
   - **Repository** : Même repo
   - **Branch** : `main`
   - **Root directory** : `backend`
   - **Build settings** :
     ```yaml
     version: 1
     backend:
       phases:
         build:
           commands:
             - npm install
             - npm run build
       artifacts:
         baseDirectory: dist
         files:
           - '**/*'
     ```
   - **Start command** : `npm start`

5. **Variables d'Environnement**
   - Dans les settings du backend, ajoutez :
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

6. **Déployer les Frontends**
   - Créez une nouvelle app Amplify pour chaque frontend
   - **Root directory** : `frontend` (puis `frontend-admin`)
   - Amplify détecte automatiquement Vite/React
   - Build settings automatiques

7. **Configurer les Routes API**
   - Dans chaque frontend, allez dans **"Rewrites and redirects"**
   - Ajoutez une règle :
     - **Source** : `/api/<*>`
     - **Target** : `https://votre-backend.amplifyapp.com/api/<*>`
     - **Type** : 200 (Rewrite)

**Coût** : Généralement gratuit jusqu'à 15GB de transfert/mois, puis ~$0.15/GB

---

## 🥈 Option 2 : AWS Elastic Beanstalk (Simple)

Elastic Beanstalk simplifie le déploiement d'applications sur AWS.

### Avantages
- ✅ Gestion automatique de l'infrastructure
- ✅ Scaling automatique
- ✅ SSL automatique
- ✅ Monitoring intégré

### Étapes

1. **Installer EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialiser le Backend**
   ```bash
   cd backend
   eb init -p "Node.js 18" conciergerie-backend --region us-east-1
   ```

3. **Créer l'Environnement**
   ```bash
   eb create conciergerie-backend-env
   ```

4. **Configurer les Variables d'Environnement**
   ```bash
   eb setenv TWILIO_ACCOUNT_SID=your_account_sid \
            TWILIO_AUTH_TOKEN=your_auth_token \
            TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886 \
            ANTHROPIC_API_KEY=your_api_key \
            PORT=3000 \
            NODE_ENV=production \
            ADMIN_EMAIL=admin@example.com \
            ADMIN_PASSWORD=your_secure_password
   ```

5. **Déployer**
   ```bash
   eb deploy
   ```

**Coût** : ~$15-30/mois selon la taille de l'instance

---

## 🥉 Option 3 : AWS Lightsail (Économique)

Lightsail est l'option la plus économique d'AWS, similaire à DigitalOcean.

### Avantages
- ✅ Prix fixe et prévisible
- ✅ Simple à configurer
- ✅ $3.50-10/mois pour commencer

### Étapes

1. **Créer une Instance Lightsail**
   - Allez sur https://lightsail.aws.amazon.com
   - **Create instance**
   - **Platform** : Node.js
   - **Instance plan** : $5/mois (1GB RAM) ou $10/mois (2GB RAM)
   - **Region** : Choisissez la plus proche

2. **Se Connecter via SSH**
   - Cliquez sur votre instance
   - **Connect using SSH**

3. **Installer l'Application**
   ```bash
   # Cloner le repo
   git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
   cd conciergerie-whatsapp-ai/backend
   
   # Installer
   npm install
   npm run build
   
   # Configurer .env
   nano .env
   # Ajoutez vos variables d'environnement
   
   # Démarrer avec PM2
   npm install -g pm2
   pm2 start dist/server.js --name conciergerie-backend
   pm2 save
   pm2 startup
   ```

4. **Configurer le Domaine**
   - Dans Lightsail, allez dans **Networking**
   - Créez un **Static IP** et attachez-le à votre instance
   - Configurez votre domaine pour pointer vers cette IP

**Coût** : $5-10/mois par instance

---

## 🎯 Option 4 : AWS App Runner (Très Simple - Nouveau)

App Runner est la solution la plus simple d'AWS, similaire à Railway.

### Avantages
- ✅ Très simple à configurer
- ✅ Scaling automatique
- ✅ SSL automatique
- ✅ Pas de gestion d'infrastructure

### Étapes

1. **Créer un Service App Runner**
   - Allez sur https://console.aws.amazon.com/apprunner
   - **Create service**

2. **Configuration**
   - **Source** : GitHub
   - **Repository** : `Anthopululu/conciergerie-whatsapp-ai`
   - **Branch** : `main`
   - **Root directory** : `backend`
   - **Build command** : `npm install && npm run build`
   - **Start command** : `npm start`
   - **Port** : `3000`

3. **Variables d'Environnement**
   - Ajoutez toutes vos variables dans l'interface

4. **Déployer**
   - Cliquez sur **Create & deploy**

**Coût** : ~$7-25/mois selon l'usage

---

## 📊 Comparaison AWS

| Solution | Difficulté | Coût | Temps Setup | Recommandé |
|----------|-----------|------|-------------|------------|
| **Amplify** | ⭐ Très Facile | Gratuit/$0.15/GB | 15 min | ✅ OUI |
| **App Runner** | ⭐ Très Facile | $7-25/mois | 10 min | ✅ OUI |
| **Elastic Beanstalk** | ⭐⭐ Facile | $15-30/mois | 20 min | ⚠️ Moyen |
| **Lightsail** | ⭐⭐⭐ Moyen | $5-10/mois | 30 min | ⚠️ Si budget serré |

---

## 🚀 Ma Recommandation AWS : Amplify

**Pourquoi Amplify ?**
- Le plus simple sur AWS
- Gratuit pour commencer
- Déploiement automatique depuis GitHub
- SSL et CDN automatiques
- Interface graphique intuitive

---

## 💡 Pourquoi je n'avais pas proposé AWS initialement ?

AWS est excellent mais :
- ⚠️ Plus complexe que Railway/Render pour débuter
- ⚠️ Nécessite un compte AWS (carte bancaire)
- ⚠️ Interface parfois intimidante pour les débutants
- ⚠️ Beaucoup d'options peuvent être confuses

**Mais** AWS Amplify et App Runner sont maintenant très simples et comparables à Railway !

---

## 📝 Guide Détaillé AWS Amplify

Voir la section Option 1 ci-dessus pour les instructions complètes.

Souhaitez-vous que je crée un guide plus détaillé pour AWS Amplify ou App Runner ?


