# ⚙️ Configuration Render - Guide Complet

## Problème : "failed to read dockerfile"

Si vous voyez cette erreur, c'est que Render est configuré pour utiliser Docker au lieu de Node.js.

## ✅ Solution : Configurer pour Node.js

### Backend (Web Service)

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service backend
3. Allez dans **"Settings"**
4. Vérifiez les paramètres suivants :

**Environment** : 
- Doit être **"Node"** (pas "Docker")

**Build Command** :
```
npm install && npm run build
```

**Start Command** :
```
node dist/server.js
```

**Root Directory** :
```
backend
```

**Node Version** :
- Laissez par défaut ou spécifiez `18` ou `20`

### Frontend Conciergerie (Static Site)

1. Sélectionnez votre service frontend
2. Allez dans **"Settings"**
3. Vérifiez :

**Build Command** :
```
npm install && npm run build
```

**Publish Directory** :
```
dist
```

**Root Directory** :
```
frontend
```

### Frontend Admin (Static Site)

1. Sélectionnez votre service frontend-admin
2. Allez dans **"Settings"**
3. Vérifiez :

**Build Command** :
```
npm install && npm run build
```

**Publish Directory** :
```
dist
```

**Root Directory** :
```
frontend-admin
```

## 🔧 Si le problème persiste

1. **Supprimer et recréer le service** :
   - Supprimez le service actuel
   - Créez un nouveau service
   - Sélectionnez **"Web Service"** (pas "Docker")
   - Configurez comme indiqué ci-dessus

2. **Vérifier le Root Directory** :
   - Le Root Directory doit pointer vers le bon dossier (`backend`, `frontend`, ou `frontend-admin`)
   - Pas vers la racine du projet

3. **Vérifier les commandes** :
   - Build Command doit être `npm install && npm run build`
   - Start Command doit être `node dist/server.js` (pour le backend uniquement)

## 📝 Variables d'environnement

N'oubliez pas d'ajouter toutes les variables d'environnement nécessaires dans les Settings de chaque service.

