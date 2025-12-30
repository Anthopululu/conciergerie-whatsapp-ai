# Utiliser l'application depuis GitHub

Plusieurs façons d'utiliser l'application directement depuis GitHub :

## 🚀 Option 1 : GitHub Codespaces (Recommandé - Le plus simple)

GitHub Codespaces vous permet de lancer l'application dans le cloud directement depuis GitHub, sans rien installer localement.

### Comment lancer :

1. **Ouvrez votre repository sur GitHub** : https://github.com/Anthopululu/conciergerie-whatsapp-ai

2. **Cliquez sur le bouton vert "Code"** en haut à droite

3. **Sélectionnez l'onglet "Codespaces"**

4. **Cliquez sur "Create codespace on main"**

5. **Attendez que l'environnement se lance** (2-3 minutes)

6. **Une fois lancé, ouvrez un terminal** et exécutez :

```bash
# Installer les dépendances (si pas déjà fait)
cd backend && npm install
cd ../frontend && npm install  
cd ../frontend-admin && npm install

# Démarrer le backend
cd backend && npm run dev &

# Démarrer le frontend conciergerie
cd ../frontend && npm run dev &

# Démarrer le frontend admin
cd ../frontend-admin && npm run dev &
```

7. **Les URLs seront automatiquement partagées** dans l'onglet "Ports" de VS Code

### Avantages :
- ✅ Aucune installation locale nécessaire
- ✅ Fonctionne sur n'importe quel appareil (ordinateur, tablette, téléphone)
- ✅ Environnement pré-configuré
- ✅ Gratuit pour les comptes personnels (60h/mois)

---

## 🌐 Option 2 : Déployer automatiquement avec GitHub Actions

Configurez un déploiement automatique à chaque push sur GitHub.

### Configuration :

1. **Créez un fichier `.github/workflows/deploy.yml`** (déjà créé mais nécessite permissions)

2. **Configurez vos secrets** dans GitHub :
   - Allez dans Settings > Secrets and variables > Actions
   - Ajoutez vos clés API :
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `ANTHROPIC_API_KEY`

3. **À chaque push**, l'application se déploiera automatiquement

---

## 📦 Option 3 : Cloner et lancer localement

### Depuis votre machine :

```bash
# Cloner le repository
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai

# Installer les dépendances
cd backend && npm install
cd ../frontend && npm install
cd ../frontend-admin && npm install

# Démarrer les services
cd backend && npm run dev &
cd ../frontend && npm run dev &
cd ../frontend-admin && npm run dev &
```

### Depuis un serveur (DigitalOcean, etc.) :

```bash
# Se connecter au serveur
ssh root@votre-serveur

# Cloner le repository
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai

# Suivre les instructions d'installation
chmod +x install-production.sh
./install-production.sh
```

---

## 🐳 Option 4 : Utiliser Docker depuis GitHub

### Lancer avec Docker Compose :

```bash
# Cloner le repository
git clone https://github.com/Anthopululu/conciergerie-whatsapp-ai.git
cd conciergerie-whatsapp-ai

# Lancer avec Docker Compose
docker-compose up -d
```

---

## 🔗 Option 5 : Utiliser les Releases GitHub

1. **Créez une release** sur GitHub avec les fichiers compilés
2. **Téléchargez la release** et décompressez
3. **Lancez l'application** directement

---

## 📱 Option 6 : GitHub Pages (Frontends uniquement)

Pour héberger les frontends statiques sur GitHub Pages :

1. **Build les frontends** :
```bash
cd frontend && npm run build
cd ../frontend-admin && npm run build
```

2. **Activez GitHub Pages** dans les settings du repository
3. **Sélectionnez le dossier `dist`** comme source

⚠️ **Note** : Le backend devra être hébergé ailleurs (Railway, Render, etc.)

---

## 🎯 Recommandation

**Pour tester rapidement** : Utilisez **GitHub Codespaces** (Option 1)
- Le plus simple
- Aucune configuration nécessaire
- Fonctionne immédiatement

**Pour la production** : Utilisez **l'installation sur serveur** (Option 3)
- Plus de contrôle
- Meilleures performances
- Voir `INSTALL_DROPLET.md` pour les instructions

---

## 🔐 Configuration des variables d'environnement

Dans tous les cas, vous devrez configurer vos clés API :

1. **Créez un fichier `.env`** dans le dossier `backend/` :
```env
TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token
ANTHROPIC_API_KEY=votre_anthropic_api_key
ADMIN_PASSWORD=votre_mot_de_passe
```

2. **Pour Codespaces** : Utilisez les "Repository secrets" dans GitHub Settings

---

## 📚 Ressources

- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

