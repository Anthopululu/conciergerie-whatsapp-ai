# 🚀 Déployer le Frontend Admin sur Render

## 📋 Étapes (5 minutes)

### 1. Créer un Nouveau Service Static Site

1. Allez sur https://dashboard.render.com
2. Cliquez sur **"New"** > **"Static Site"**
3. Connectez GitHub si ce n'est pas déjà fait
4. Sélectionnez : `Anthopululu/conciergerie-whatsapp-ai`

### 2. Configurer le Service

**Basics :**
- **Name** : `conciergerie-admin` (ou autre nom)
- **Branch** : `main`
- **Root Directory** : `frontend-admin`

**Build Settings :**
- **Build Command** : `npm install && npm run build`
- **Publish Directory** : `dist`

### 3. Ajouter la Variable d'Environnement

1. Cliquez sur **"Advanced"** ou allez dans **"Environment"**
2. Cliquez sur **"Add Environment Variable"**
3. Ajoutez :
   - **Name** : `VITE_API_URL`
   - **Value** : `https://conciergerie-whatsapp-ai.onrender.com`

### 4. Créer le Service

1. Cliquez sur **"Create Static Site"**
2. Attendez 5-10 minutes que le build et le déploiement se terminent

### 5. Accéder à l'Application Admin

Une fois déployé, vous obtiendrez une URL comme :
```
https://conciergerie-admin.onrender.com
```

---

## 🔐 Identifiants Admin

Pour vous connecter au dashboard admin :

```
Email : admin@example.com
Mot de passe : [Valeur de ADMIN_PASSWORD dans Render]
```

**Par défaut** (si `ADMIN_PASSWORD` n'est pas défini) : `admin123`

---

## ⚙️ Configurer le Mot de Passe Admin

Dans Render, pour le service **backend** :

1. Allez dans **"Environment"**
2. Ajoutez ou modifiez :
   - **Name** : `ADMIN_PASSWORD`
   - **Value** : Votre mot de passe sécurisé (ex: `MonMotDePasseSecurise123!`)
3. **Redéployez** le backend

---

## ✅ Vérification

Une fois déployé :

1. Allez sur l'URL du frontend admin (ex: `https://conciergerie-admin.onrender.com`)
2. Vous devriez voir la page de login admin
3. Connectez-vous avec :
   - Email : `admin@example.com`
   - Mot de passe : `admin123` (ou la valeur de `ADMIN_PASSWORD`)

---

## 📊 Résumé des Services sur Render

Vous devriez avoir **3 services** :

1. **Backend** (Web Service)
   - URL : `https://conciergerie-whatsapp-ai.onrender.com`
   - Root Directory : `backend`

2. **Frontend Conciergerie** (Static Site)
   - URL : `https://conciergerie-whatsapp-ai-1.onrender.com`
   - Root Directory : `frontend`
   - Variable : `VITE_API_URL = https://conciergerie-whatsapp-ai.onrender.com`

3. **Frontend Admin** (Static Site) ⬅️ **À créer**
   - URL : `https://conciergerie-admin.onrender.com` (générée automatiquement)
   - Root Directory : `frontend-admin`
   - Variable : `VITE_API_URL = https://conciergerie-whatsapp-ai.onrender.com`

---

## 🔄 Mise à Jour Automatique

Render déploie automatiquement à chaque push sur `main`. Pas besoin de faire quoi que ce soit !

---

## 🆘 Dépannage

### Le build échoue

1. Vérifiez les logs dans Render
2. Vérifiez que le Root Directory est bien `frontend-admin`
3. Vérifiez que les commandes de build sont correctes

### Le frontend admin ne se connecte pas au backend

1. Vérifiez que `VITE_API_URL` est bien configurée
2. Vérifiez que l'URL pointe vers le bon backend
3. Redéployez le frontend admin après avoir ajouté la variable

### Erreur de login admin

1. Vérifiez que `ADMIN_PASSWORD` est défini dans le backend
2. Utilisez le bon email : `admin@example.com`
3. Utilisez le bon mot de passe (valeur de `ADMIN_PASSWORD`)

---

## ✅ Checklist

- [ ] Service Static Site créé
- [ ] Root Directory = `frontend-admin`
- [ ] Build Command = `npm install && npm run build`
- [ ] Publish Directory = `dist`
- [ ] Variable `VITE_API_URL` ajoutée
- [ ] Build réussi
- [ ] Frontend admin accessible
- [ ] Login admin fonctionne

---

## 🎉 C'est tout !

Votre application admin sera accessible sur l'URL générée par Render.

