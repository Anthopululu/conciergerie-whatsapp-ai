# 🚀 Guide GitHub Actions

GitHub Actions permet d'automatiser le build, les tests et le déploiement de votre application.

## 📋 Workflows Disponibles

### 1. CI - Build and Test (`ci.yml`)

**Déclenchement :**
- À chaque push sur `main` ou `develop`
- À chaque Pull Request

**Actions :**
- ✅ Build du backend
- ✅ Build du frontend
- ✅ Build du frontend-admin
- ✅ Vérification que les builds réussissent

**Activation :** Automatique, aucun secret nécessaire

---

### 2. Deploy to DigitalOcean (`deploy-digitalocean.yml`)

**Déclenchement :**
- À chaque push sur `main`
- Manuellement via "Run workflow"

**Actions :**
- 🚀 Déploie automatiquement sur DigitalOcean App Platform

**Configuration nécessaire :**

1. **Créer un token DigitalOcean :**
   - Allez sur https://cloud.digitalocean.com/account/api/tokens
   - Cliquez sur "Generate New Token"
   - Donnez-lui un nom (ex: "GitHub Actions")
   - Copiez le token

2. **Ajouter le secret dans GitHub :**
   - Allez dans votre repository GitHub
   - Settings > Secrets and variables > Actions
   - Cliquez sur "New repository secret"
   - Name : `DIGITALOCEAN_ACCESS_TOKEN`
   - Value : Collez le token copié
   - Cliquez sur "Add secret"

3. **Activer le workflow :**
   - Le workflow se déclenchera automatiquement à chaque push sur `main`

---

### 3. Deploy to Railway (`deploy-railway.yml`)

**Déclenchement :**
- À chaque push sur `main`
- Manuellement via "Run workflow"

**Actions :**
- 🚀 Déploie automatiquement sur Railway

**Configuration nécessaire :**

1. **Créer un token Railway :**
   - Allez sur https://railway.app/account/tokens
   - Cliquez sur "New Token"
   - Copiez le token

2. **Ajouter le secret dans GitHub :**
   - Settings > Secrets and variables > Actions
   - New repository secret
   - Name : `RAILWAY_TOKEN`
   - Value : Collez le token
   - Add secret

---

### 4. Deploy to Fly.io (`deploy-flyio.yml`)

**Déclenchement :**
- À chaque push sur `main`
- Manuellement via "Run workflow"

**Actions :**
- 🚀 Déploie automatiquement sur Fly.io

**Configuration nécessaire :**

1. **Créer un token Fly.io :**
   ```bash
   flyctl auth token
   ```

2. **Ajouter le secret dans GitHub :**
   - Settings > Secrets and variables > Actions
   - New repository secret
   - Name : `FLY_API_TOKEN`
   - Value : Collez le token
   - Add secret

---

## 🔧 Comment Activer les Workflows

### Étape 1 : Vérifier que les fichiers existent

Les workflows sont dans `.github/workflows/`. Vérifiez qu'ils sont bien présents :
- `ci.yml` (automatique, pas besoin de secret)
- `deploy-digitalocean.yml` (nécessite un secret)
- `deploy-railway.yml` (nécessite un secret)
- `deploy-flyio.yml` (nécessite un secret)

### Étape 2 : Activer les Secrets (pour les déploiements)

Pour les workflows de déploiement, vous devez ajouter les secrets dans GitHub :

1. **Allez dans votre repository** : https://github.com/Anthopululu/conciergerie-whatsapp-ai

2. **Settings** > **Secrets and variables** > **Actions**

3. **Cliquez sur "New repository secret"**

4. **Ajoutez les secrets nécessaires** selon le service que vous utilisez

### Étape 3 : Vérifier les Permissions

Si vous voyez une erreur "refusing to allow a Personal Access Token to create or update workflow", vous devez :

1. **Créer un nouveau token GitHub** avec la permission `workflow` :
   - Allez sur https://github.com/settings/tokens
   - "Generate new token (classic)"
   - Cochez `workflow`
   - Générez et copiez le token

2. **Ou utiliser GitHub CLI** pour pousser les workflows

---

## ✅ Workflow CI (Recommandé - Aucune Configuration)

Le workflow `ci.yml` fonctionne **immédiatement** sans aucune configuration.

**Ce qu'il fait :**
- ✅ Vérifie que le backend se build correctement
- ✅ Vérifie que les frontends se buildent correctement
- ✅ S'exécute à chaque push et Pull Request

**Pour l'activer :**
1. Poussez les fichiers sur GitHub
2. Allez dans l'onglet "Actions" de votre repository
3. Le workflow se déclenchera automatiquement

---

## 🚀 Déploiement Automatique

### Option 1 : DigitalOcean

1. **Créez un token DigitalOcean** (voir ci-dessus)
2. **Ajoutez le secret** `DIGITALOCEAN_ACCESS_TOKEN` dans GitHub
3. **À chaque push sur `main`**, l'app se déploiera automatiquement

### Option 2 : Railway

1. **Créez un token Railway** (voir ci-dessus)
2. **Ajoutez le secret** `RAILWAY_TOKEN` dans GitHub
3. **À chaque push sur `main`**, l'app se déploiera automatiquement

### Option 3 : Fly.io

1. **Créez un token Fly.io** (voir ci-dessus)
2. **Ajoutez le secret** `FLY_API_TOKEN` dans GitHub
3. **À chaque push sur `main`**, l'app se déploiera automatiquement

---

## 📊 Voir les Résultats

1. **Allez dans l'onglet "Actions"** de votre repository GitHub
2. **Cliquez sur un workflow** pour voir les détails
3. **Cliquez sur un job** pour voir les logs

---

## 🔍 Dépannage

### Erreur : "Workflow permissions"

**Solution :** Créez un token GitHub avec la permission `workflow`

### Erreur : "Secret not found"

**Solution :** Vérifiez que vous avez bien ajouté le secret dans Settings > Secrets

### Erreur : "Build failed"

**Solution :** Regardez les logs dans l'onglet Actions pour voir l'erreur exacte

---

## 💡 Recommandation

**Pour commencer :**
1. ✅ Activez le workflow **CI** (fonctionne immédiatement)
2. ✅ Vérifiez que les builds passent
3. ✅ Ensuite, activez le workflow de déploiement de votre choix

**Le workflow CI vous permettra de :**
- Vérifier que le code compile avant de merger
- Voir les erreurs de build immédiatement
- S'assurer que tout fonctionne avant de déployer

---

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [DigitalOcean App Action](https://github.com/digitalocean/app_action)
- [Railway Deploy Action](https://github.com/bervProject/railway-deploy)
- [Fly.io Actions](https://github.com/superfly/flyctl-actions)

