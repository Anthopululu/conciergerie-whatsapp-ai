# 🔧 Dépannage Render

## Problèmes Courants et Solutions

### 1. Le site ne se charge pas / Page blanche

**Causes possibles :**
- Le backend est en veille (plan gratuit)
- Erreur de build
- Variables d'environnement manquantes
- Problème de configuration

**Solutions :**

#### Vérifier que le backend fonctionne

Testez l'endpoint health :
```
https://conciergerie-whatsapp-ai-1.onrender.com/health
```

Si vous voyez :
```json
{"status":"healthy","database":"connected",...}
```
✅ Le backend fonctionne !

Si vous voyez une erreur ou rien :
- ⏳ Attendez 30-60 secondes (le backend se réveille)
- 🔍 Vérifiez les logs dans Render

#### Vérifier les logs dans Render

1. Allez sur https://dashboard.render.com
2. Cliquez sur votre service
3. Allez dans l'onglet **"Logs"**
4. Regardez les dernières lignes pour voir les erreurs

---

### 2. Erreur "Cannot GET /"

**Cause :** Vous accédez au backend au lieu du frontend

**Solution :**
- Le backend est à : `https://conciergerie-whatsapp-ai-1.onrender.com`
- Le frontend doit être sur une URL séparée : `https://conciergerie-frontend.onrender.com`

**Vérifiez :**
- Avez-vous déployé le frontend comme un service séparé ?
- Ou avez-vous configuré le backend pour servir le frontend ?

---

### 3. Le frontend ne se charge pas

**Si vous avez déployé le frontend séparément :**

1. Vérifiez que le service frontend est bien déployé
2. Vérifiez l'URL du frontend (elle devrait être différente du backend)
3. Vérifiez les logs du frontend dans Render

**Si vous servez le frontend depuis le backend :**

Le backend ne sert pas les fichiers statiques par défaut. Vous devez :
- Soit déployer le frontend comme un service séparé (recommandé)
- Soit configurer le backend pour servir les fichiers statiques

---

### 4. Erreur de connexion au backend

**Si le frontend ne peut pas se connecter au backend :**

1. **Vérifiez l'URL du backend** dans les variables d'environnement du frontend :
   ```
   VITE_API_URL = https://conciergerie-whatsapp-ai-1.onrender.com
   ```

2. **Vérifiez les CORS** - Le backend doit autoriser les requêtes depuis le frontend

3. **Vérifiez que le backend est accessible** :
   ```
   https://conciergerie-whatsapp-ai-1.onrender.com/health
   ```

---

### 5. Le backend se met en veille (Plan Gratuit)

**Symptôme :** Le site ne répond pas, puis répond après 30-60 secondes

**Cause :** Sur le plan gratuit, Render met le backend en veille après 15 minutes d'inactivité

**Solutions :**

#### Option 1 : Passer au plan Starter ($7/mois)
- Le backend reste toujours actif
- Pas de délai de démarrage

#### Option 2 : Utiliser un service de ping gratuit
- Configurez un service comme UptimeRobot pour "ping" votre backend toutes les 10 minutes
- Cela garde le backend actif

#### Option 3 : Accepter le délai
- C'est normal sur le plan gratuit
- Le premier accès après veille prend 30-60 secondes

---

### 6. Erreur de build

**Symptôme :** Le déploiement échoue

**Vérifiez :**
1. Les logs de build dans Render
2. Que les commandes de build sont correctes :
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `node dist/server.js`
3. Que le Root Directory est correct : `backend`

---

### 7. Erreur "Database not connected"

**Cause :** La base de données SQLite n'est pas persistante sur Render

**Solution :** Sur Render, les fichiers locaux ne persistent pas entre les redémarrages. Vous devez :

1. **Utiliser une base de données externe** (PostgreSQL, MongoDB, etc.)
2. **Ou utiliser un volume persistant** sur Render (plan payant)
3. **Ou accepter que la base se réinitialise** à chaque redémarrage

**Note :** Pour la production, il est recommandé d'utiliser une vraie base de données (PostgreSQL).

---

## 🔍 Diagnostic Rapide

### Test 1 : Backend fonctionne ?

```bash
curl https://conciergerie-whatsapp-ai-1.onrender.com/health
```

**Résultat attendu :**
```json
{"status":"healthy","database":"connected",...}
```

### Test 2 : Backend répond ?

```bash
curl https://conciergerie-whatsapp-ai-1.onrender.com/
```

**Résultat attendu :**
- Si c'est le backend : `Cannot GET /` (normal, le backend n'a pas de route `/`)
- Si c'est le frontend : La page HTML devrait se charger

### Test 3 : Vérifier les logs

Dans Render Dashboard :
1. Allez dans votre service
2. Onglet **"Logs"**
3. Regardez les dernières lignes

---

## ✅ Checklist de Vérification

- [ ] Le backend répond sur `/health`
- [ ] Les variables d'environnement sont définies
- [ ] Le build a réussi (regardez les logs)
- [ ] Le frontend est déployé comme service séparé
- [ ] L'URL du backend est correcte dans le frontend
- [ ] Les CORS sont configurés (si nécessaire)

---

## 🆘 Besoin d'Aide ?

Si rien ne fonctionne, partagez :
1. L'URL exacte que vous utilisez
2. Le message d'erreur exact (si vous en voyez un)
3. Les dernières lignes des logs Render

Je pourrai vous aider plus précisément !

