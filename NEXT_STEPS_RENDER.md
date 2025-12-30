# ✅ Prochaines Étapes - Render

Votre backend est déployé sur : https://conciergerie-whatsapp-ai.onrender.com

## 🔍 Vérification

### 1. Vérifier que le backend fonctionne

Ouvrez dans votre navigateur :
```
https://conciergerie-whatsapp-ai.onrender.com/health
```

Vous devriez voir :
```json
{
  "status": "healthy",
  "database": "connected",
  ...
}
```

Si vous voyez ça, **le backend fonctionne !** ✅

---

## 📱 Déployer les Frontends

Vous avez maintenant besoin de déployer les 2 frontends pour avoir l'application complète.

### Frontend Conciergerie

1. Dans Render, cliquez sur **"New"** > **"Static Site"**
2. Connectez GitHub et sélectionnez votre repo
3. Configurez :
   - **Name** : `conciergerie-frontend`
   - **Root Directory** : `frontend`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`
4. Cliquez sur **"Create Static Site"**

**URL générée** : `https://conciergerie-frontend.onrender.com`

### Frontend Admin

1. Dans Render, cliquez sur **"New"** > **"Static Site"**
2. Connectez GitHub et sélectionnez votre repo
3. Configurez :
   - **Name** : `conciergerie-admin`
   - **Root Directory** : `frontend-admin`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`
4. Cliquez sur **"Create Static Site"`

**URL générée** : `https://conciergerie-admin.onrender.com`

---

## ⚙️ Configurer les Frontends pour Pointer vers le Backend

Les frontends doivent pointer vers votre backend Render.

### Option 1 : Modifier les Variables d'Environnement dans Render

Pour chaque frontend (conciergerie et admin), ajoutez une variable d'environnement :

1. Allez dans votre service frontend sur Render
2. **Settings** > **Environment Variables**
3. Ajoutez :
   ```
   VITE_API_URL = https://conciergerie-whatsapp-ai.onrender.com
   ```

4. **Redéployez** le frontend (Render le fera automatiquement)

### Option 2 : Modifier le Code (si nécessaire)

Si les frontends utilisent une URL codée en dur, modifiez-la pour pointer vers Render.

---

## 🔐 Vérifier les Variables d'Environnement du Backend

Assurez-vous que toutes les variables sont bien configurées :

1. Allez dans votre service backend sur Render
2. **Settings** > **Environment Variables**
3. Vérifiez que vous avez :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `ADMIN_PASSWORD`
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (ou laissez Render le gérer)

---

## 🌐 URLs Finales

Une fois tout déployé :

- **Backend API** : https://conciergerie-whatsapp-ai.onrender.com
- **Frontend Conciergerie** : https://conciergerie-frontend.onrender.com
- **Frontend Admin** : https://conciergerie-admin.onrender.com

---

## ⚠️ Note Importante : Plan Gratuit

Sur le **plan gratuit de Render** :
- ⚠️ Le backend se met en **veille après 15 minutes** d'inactivité
- ⚠️ Le **premier démarrage** après veille prend **30-60 secondes**
- ⚠️ C'est normal, c'est la limitation du plan gratuit

**Pour éviter la veille :**
- Passez au **plan Starter** ($7/mois) pour que le backend soit toujours actif
- Ou utilisez un service de "ping" pour garder le backend actif (gratuit)

---

## 🔄 Mise à Jour Automatique

Render déploie automatiquement à chaque push sur `main`. Vous n'avez rien à faire !

---

## 🆘 Dépannage

### Le backend ne répond pas

1. Vérifiez les logs dans Render
2. Vérifiez que toutes les variables d'environnement sont définies
3. Attendez 30-60 secondes si c'est le premier démarrage après veille

### Les frontends ne se chargent pas

1. Vérifiez que le build a réussi (regardez les logs)
2. Vérifiez que le Publish Directory est `dist`
3. Vérifiez que l'URL du backend est correcte dans les variables d'environnement

### Erreur CORS

Si vous avez des erreurs CORS, ajoutez dans le backend Render les variables :
```
CORS_ORIGIN = https://conciergerie-frontend.onrender.com,https://conciergerie-admin.onrender.com
```

---

## ✅ Checklist

- [ ] Backend déployé et accessible
- [ ] Health check fonctionne : `/health`
- [ ] Variables d'environnement configurées
- [ ] Frontend conciergerie déployé
- [ ] Frontend admin déployé
- [ ] URLs du backend configurées dans les frontends
- [ ] Tout fonctionne !

---

## 🎉 Félicitations !

Votre application est maintenant déployée sur Render ! 🚀

