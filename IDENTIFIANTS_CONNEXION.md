# 🔐 Identifiants de Connexion

## Identifiants par Défaut

Si aucune conciergerie n'existe dans la base de données, le système crée automatiquement une conciergerie par défaut au démarrage :

### Conciergerie Demo (Créée automatiquement)

```
Email : demo@example.com
Mot de passe : demo123
```

---

## Identifiants de Test (si vous avez exécuté le script seed)

Si vous avez exécuté le script `npm run seed` dans le backend, vous avez aussi :

### Résidence Le Parc
```
Email : parc@conciergerie.fr
Mot de passe : parc123
```

### Domaine des Jardins
```
Email : jardins@conciergerie.fr
Mot de passe : jardins123
```

---

## 🔍 Comment Vérifier/Créer des Comptes

### Option 1 : Via l'API (Backend)

Vous pouvez créer une nouvelle conciergerie via l'API admin :

```bash
curl -X POST https://conciergerie-whatsapp-ai.onrender.com/api/admin/conciergeries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ma Conciergerie",
    "email": "mon-email@example.com",
    "password": "mon-mot-de-passe"
  }'
```

### Option 2 : Via le Dashboard Admin

1. Allez sur votre frontend admin (une fois déployé)
2. Connectez-vous avec les identifiants admin
3. Créez une nouvelle conciergerie depuis l'interface

---

## 🔑 Identifiants Admin (pour le Dashboard Admin)

Pour accéder au dashboard admin :

```
Email : admin@example.com
Mot de passe : [Valeur de la variable ADMIN_PASSWORD dans Render]
```

Par défaut, si `ADMIN_PASSWORD` n'est pas défini, le mot de passe est : `admin123`

**⚠️ Important :** Changez le mot de passe admin dans les variables d'environnement de Render pour la sécurité !

---

## 📝 Note

Sur Render, la base de données est **vide au premier démarrage**. Le système crée automatiquement la conciergerie demo (`demo@example.com` / `demo123`) si aucune conciergerie n'existe.

Si vous voulez créer d'autres conciergeries, utilisez l'API ou le dashboard admin.

---

## 🆘 Si vous ne pouvez pas vous connecter

1. **Vérifiez que le backend fonctionne** : https://conciergerie-whatsapp-ai.onrender.com/health
2. **Vérifiez les logs Render** pour voir si la conciergerie demo a été créée
3. **Créez une nouvelle conciergerie** via l'API si nécessaire

