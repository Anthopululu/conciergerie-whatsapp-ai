# 🚀 Déployer sur DigitalOcean App Platform

Guide pour déployer l'application sur DigitalOcean App Platform.

## ⚠️ Problème : "No components detected"

Si vous voyez cette erreur, c'est parce que DigitalOcean ne détecte pas automatiquement les composants dans les sous-dossiers.

## ✅ Solution : Utiliser le fichier de configuration

### Étape 1 : Vérifier que le fichier `.do/app.yaml` existe

Le fichier de configuration est déjà créé dans le repository. Il spécifie :
- Le backend (service Node.js)
- Le frontend (static site)
- Le frontend-admin (static site)

### Étape 2 : Déployer depuis GitHub

1. **Allez sur** https://cloud.digitalocean.com
2. **Cliquez sur "Create"** > **"Apps"**
3. **Sélectionnez "GitHub"**
4. **Autorisez DigitalOcean** à accéder à votre repository
5. **Sélectionnez** : `Anthopululu/conciergerie-whatsapp-ai`
6. **Sélectionnez la branche** : `main`
7. **DigitalOcean devrait maintenant détecter** le fichier `.do/app.yaml`

### Étape 3 : Vérifier la configuration

DigitalOcean devrait afficher :
- ✅ **Backend** (Web Service)
- ✅ **Frontend** (Static Site)
- ✅ **Frontend Admin** (Static Site)

### Étape 4 : Configurer les Variables d'Environnement

Cliquez sur **"Edit"** pour chaque service et ajoutez vos secrets :

**Pour le Backend :**
- `TWILIO_ACCOUNT_SID` (Secret)
- `TWILIO_AUTH_TOKEN` (Secret)
- `ANTHROPIC_API_KEY` (Secret)
- `ADMIN_PASSWORD` (Secret)

**Comment ajouter un secret :**
1. Cliquez sur le service "backend"
2. Allez dans l'onglet "Environment Variables"
3. Cliquez sur "Add Variable"
4. Sélectionnez "Secret" comme type
5. Entrez le nom et la valeur

### Étape 5 : Ajuster les Routes (si nécessaire)

Par défaut, le fichier configure :
- Backend : `/` (route principale)
- Frontend : `/app`
- Admin : `/admin`

Si vous préférez des sous-domaines séparés, modifiez le fichier `.do/app.yaml`.

### Étape 6 : Déployer

1. Cliquez sur **"Next"**
2. Choisissez un nom pour votre app (ex: `conciergerie-whatsapp`)
3. Sélectionnez la région (ex: `Frankfurt`)
4. Cliquez sur **"Create Resources"**
5. Attendez 5-10 minutes que le déploiement se termine

### Étape 7 : Accéder à l'Application

Une fois déployé, vous obtiendrez :
- **Backend** : `https://votre-app.ondigitalocean.app`
- **Frontend** : `https://votre-app.ondigitalocean.app/app`
- **Admin** : `https://votre-app.ondigitalocean.app/admin`

---

## 🔧 Configuration Alternative : Sous-domaines Séparés

Si vous préférez des URLs séparées pour chaque service, modifiez `.do/app.yaml` :

```yaml
services:
  - name: backend
    routes:
      - path: /api

static_sites:
  - name: frontend
    routes:
      - path: /

  - name: frontend-admin
    routes:
      - path: /admin
```

---

## 🐛 Dépannage

### Erreur : "No components detected"

**Solution :**
1. Vérifiez que le fichier `.do/app.yaml` existe dans votre repository
2. Vérifiez que vous avez bien sélectionné la branche `main`
3. Si le fichier n'est pas détecté, créez-le manuellement dans DigitalOcean :
   - Cliquez sur "Edit" dans la configuration
   - Ajoutez manuellement les composants :
     - Backend : Source Directory = `backend`
     - Frontend : Source Directory = `frontend`
     - Admin : Source Directory = `frontend-admin`

### Erreur : "Build failed"

**Vérifiez :**
1. Les commandes de build dans `.do/app.yaml`
2. Les variables d'environnement sont bien configurées
3. Les logs de build dans DigitalOcean

### Le backend ne démarre pas

**Vérifiez :**
1. Les variables d'environnement sont bien définies
2. Le port est bien configuré (3000)
3. Les logs dans DigitalOcean Dashboard

---

## 📝 Structure du Fichier `.do/app.yaml`

```yaml
name: conciergerie-whatsapp-ai        # Nom de l'application
region: fra                           # Région (Frankfurt)

services:                             # Services backend
  - name: backend
    source_dir: backend               # Dossier source
    run_command: node dist/server.js  # Commande de démarrage
    build_command: npm install && npm run build  # Commande de build
    http_port: 3000                  # Port HTTP
    envs:                            # Variables d'environnement
      - key: NODE_ENV
        value: production

static_sites:                        # Sites statiques (frontends)
  - name: frontend
    source_dir: frontend
    build_command: npm install && npm run build
    output_dir: dist                 # Dossier de sortie après build
```

---

## 🔄 Mise à jour de l'Application

Pour mettre à jour l'application après un changement :

1. **Poussez vos changements** sur GitHub
2. **DigitalOcean détecte automatiquement** le changement
3. **Un nouveau déploiement se lance** automatiquement
4. Ou **cliquez sur "Deploy"** dans le dashboard DigitalOcean

---

## 💰 Coûts

- **Backend** : ~$5/mois (basic-xxs)
- **Frontend** : Gratuit (static sites)
- **Frontend Admin** : Gratuit (static sites)
- **Total** : ~$5/mois

---

## 📚 Ressources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)

