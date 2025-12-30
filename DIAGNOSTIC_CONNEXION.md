# 🔍 Diagnostic : Problème de Connexion Frontend

## ✅ Vérifications à Faire

### 1. Vérifier que le Backend fonctionne

Testez dans votre navigateur ou avec curl :
```
https://conciergerie-whatsapp-ai.onrender.com/health
```

**Résultat attendu :**
```json
{"status":"healthy","database":"connected",...}
```

✅ Si ça fonctionne, le backend est OK.

---

### 2. Vérifier la Variable d'Environnement dans Render

**Dans Render Dashboard :**

1. Allez sur https://dashboard.render.com
2. Cliquez sur votre service **frontend** (`conciergerie-whatsapp-ai-1`)
3. Allez dans **"Environment"** (ou **"Settings"** > **"Environment Variables"**)
4. **Vérifiez que vous avez :**
   - **Name** : `VITE_API_URL`
   - **Value** : `https://conciergerie-whatsapp-ai.onrender.com`

⚠️ **Si cette variable n'existe pas, ajoutez-la !**

5. **Redéployez** le frontend (Render le fera automatiquement après avoir ajouté la variable)

---

### 3. Vérifier les Logs du Frontend

Dans Render Dashboard :
1. Service frontend > **"Logs"**
2. Regardez les dernières lignes
3. Cherchez des erreurs de connexion au backend

---

### 4. Tester la Connexion dans le Navigateur

1. Ouvrez `https://conciergerie-whatsapp-ai-1.onrender.com`
2. Ouvrez la **Console du navigateur** (F12 > Console)
3. Regardez les erreurs

**Erreurs courantes :**

#### Erreur : "Network Error" ou "Failed to fetch"
- **Cause** : Le frontend ne peut pas se connecter au backend
- **Solution** : Vérifiez que `VITE_API_URL` est bien configurée

#### Erreur : "CORS policy"
- **Cause** : Problème CORS (mais normalement configuré)
- **Solution** : Le backend autorise déjà toutes les origines

#### Erreur : "404 Not Found"
- **Cause** : L'URL du backend est incorrecte
- **Solution** : Vérifiez que `VITE_API_URL` pointe vers `https://conciergerie-whatsapp-ai.onrender.com`

---

## 🔧 Solution Rapide

### Étape 1 : Ajouter la Variable dans Render

1. Render Dashboard > Service frontend
2. **Environment** > **Add Environment Variable**
3. **Name** : `VITE_API_URL`
4. **Value** : `https://conciergerie-whatsapp-ai.onrender.com`
5. **Save**

### Étape 2 : Attendre le Redéploiement

Render va automatiquement redéployer (2-3 minutes).

### Étape 3 : Tester

1. Allez sur `https://conciergerie-whatsapp-ai-1.onrender.com`
2. Ouvrez la console (F12)
3. Essayez de vous connecter
4. Regardez les erreurs dans la console

---

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier que le Frontend utilise bien la Variable

Dans la console du navigateur, vous pouvez vérifier :

```javascript
// Ouvrez la console (F12) et tapez :
console.log(import.meta.env.VITE_API_URL)
```

**Résultat attendu :**
```
https://conciergerie-whatsapp-ai.onrender.com
```

Si vous voyez `undefined`, la variable n'est pas configurée.

---

## 📋 Checklist Complète

- [ ] Backend accessible : `/health` fonctionne
- [ ] Variable `VITE_API_URL` configurée dans Render
- [ ] Frontend redéployé après ajout de la variable
- [ ] Console du navigateur vérifiée (F12)
- [ ] Identifiants corrects : `conciergerie@example.com` / `concierge123`

---

## 🆘 Partagez les Informations

Si ça ne fonctionne toujours pas, partagez :
1. Les erreurs dans la console du navigateur (F12)
2. Les logs du frontend dans Render
3. Si la variable `VITE_API_URL` est bien configurée

Je pourrai vous aider plus précisément !

