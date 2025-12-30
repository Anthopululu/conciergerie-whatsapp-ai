# ✅ Configuration du Frontend pour Render

Votre backend fonctionne sur : **https://conciergerie-whatsapp-ai.onrender.com**

## 🔧 Configurer le Frontend

### Étape 1 : Aller dans Render Dashboard

1. Allez sur https://dashboard.render.com
2. Trouvez votre service frontend (`conciergerie-whatsapp-ai-1`)

### Étape 2 : Ajouter la Variable d'Environnement

1. Cliquez sur votre service frontend
2. Allez dans **"Environment"** (ou **"Settings"** > **"Environment Variables"**)
3. Cliquez sur **"Add Environment Variable"**
4. Ajoutez :

   **Name :** `VITE_API_URL`
   
   **Value :** `https://conciergerie-whatsapp-ai.onrender.com`

5. Cliquez sur **"Save Changes"**

### Étape 3 : Redéploiement Automatique

Render va automatiquement redéployer le frontend avec la nouvelle configuration.

**Attendez 2-3 minutes** que le redéploiement se termine.

### Étape 4 : Vérifier

1. Allez sur `https://conciergerie-whatsapp-ai-1.onrender.com`
2. Le frontend devrait maintenant pouvoir se connecter au backend
3. Vous devriez voir la page de login

---

## 🔍 Vérification

### Test 1 : Le backend répond

```bash
curl https://conciergerie-whatsapp-ai.onrender.com/health
```

**Résultat attendu :**
```json
{"status":"healthy","database":"connected",...}
```
✅ **C'est bon !**

### Test 2 : Le frontend peut se connecter

1. Ouvrez `https://conciergerie-whatsapp-ai-1.onrender.com`
2. Ouvrez la console du navigateur (F12)
3. Regardez s'il y a des erreurs de connexion au backend

---

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier les logs du frontend

1. Dans Render, allez dans votre service frontend
2. Onglet **"Logs"**
3. Regardez les dernières lignes pour voir les erreurs

### Erreurs courantes

#### Erreur CORS

Si vous voyez une erreur CORS, ajoutez dans le **backend** (pas le frontend) :

**Variable d'environnement :**
```
CORS_ORIGIN = https://conciergerie-whatsapp-ai-1.onrender.com
```

#### Erreur "Network Error"

- Vérifiez que l'URL du backend est correcte dans `VITE_API_URL`
- Vérifiez que le backend est accessible (testez `/health`)
- Attendez 30-60 secondes si le backend était en veille

---

## 📝 Configuration Complète

### Backend (`conciergerie-whatsapp-ai`)
- ✅ URL : `https://conciergerie-whatsapp-ai.onrender.com`
- ✅ Health check : `/health` fonctionne
- ✅ Variables d'environnement : Twilio, Anthropic, etc.

### Frontend (`conciergerie-whatsapp-ai-1`)
- ✅ URL : `https://conciergerie-whatsapp-ai-1.onrender.com`
- ⚠️ **À configurer** : `VITE_API_URL = https://conciergerie-whatsapp-ai.onrender.com`

---

## 🎯 Résumé

**Action à faire :**
1. Allez dans Render Dashboard
2. Service frontend → Environment Variables
3. Ajoutez : `VITE_API_URL = https://conciergerie-whatsapp-ai.onrender.com`
4. Attendez le redéploiement (2-3 minutes)
5. Testez : `https://conciergerie-whatsapp-ai-1.onrender.com`

**C'est tout !** 🚀

