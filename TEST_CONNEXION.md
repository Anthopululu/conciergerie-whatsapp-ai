# 🧪 Test de Connexion - Guide Rapide

## Test 1 : Backend fonctionne ?

Ouvrez dans votre navigateur :
```
https://conciergerie-whatsapp-ai.onrender.com/health
```

✅ **Doit afficher** : `{"status":"healthy",...}`

---

## Test 2 : Connexion API fonctionne ?

Ouvrez dans votre navigateur :
```
https://conciergerie-whatsapp-ai.onrender.com/api/auth/login
```

Avec cette commande (dans la console du navigateur) :
```javascript
fetch('https://conciergerie-whatsapp-ai.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'conciergerie@example.com',
    password: 'concierge123'
  })
})
.then(r => r.json())
.then(console.log)
```

✅ **Doit retourner** : `{"success":true,"token":"...",...}`

---

## Test 3 : Frontend peut se connecter ?

1. Ouvrez `https://conciergerie-whatsapp-ai-1.onrender.com`
2. Ouvrez la console (F12)
3. Tapez :
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL)
```

✅ **Doit afficher** : `https://conciergerie-whatsapp-ai.onrender.com`

❌ **Si `undefined`** : La variable n'est pas configurée dans Render

---

## 🔧 Solution Immédiate

**Si `VITE_API_URL` est `undefined` :**

1. Render Dashboard > Service frontend
2. **Environment** > **Add Variable**
3. **Name** : `VITE_API_URL`
4. **Value** : `https://conciergerie-whatsapp-ai.onrender.com`
5. **Save** et attendez le redéploiement (2-3 min)

---

## 📝 Identifiants

```
Email : conciergerie@example.com
Mot de passe : concierge123
```

