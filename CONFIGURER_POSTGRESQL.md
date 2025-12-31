# 🐘 Configuration PostgreSQL sur Render

Ce guide vous explique comment configurer PostgreSQL sur Render pour une persistance réelle des données.

## 📋 Étapes

### 1. Créer une base de données PostgreSQL sur Render

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"PostgreSQL"**
3. Configurez :
   - **Name** : `conciergerie-db` (ou un nom de votre choix)
   - **Database** : `conciergerie` (ou laissez par défaut)
   - **User** : `conciergerie_user` (ou laissez par défaut)
   - **Region** : Choisissez la même région que votre backend
   - **PostgreSQL Version** : `16` (ou la plus récente)
   - **Plan** : **Free** (suffisant pour commencer)
4. Cliquez sur **"Create Database"**

### 2. Récupérer la connection string

1. Une fois la base créée, cliquez dessus dans votre dashboard
2. Dans la section **"Connections"**, vous verrez **"Internal Database URL"**
3. Copiez cette URL (format : `postgresql://user:password@host:port/database`)

### 3. Configurer la variable d'environnement

1. Allez dans votre service **backend** sur Render
2. Cliquez sur **"Environment"**
3. Ajoutez une nouvelle variable :
   - **Key** : `DATABASE_URL`
   - **Value** : Collez l'URL PostgreSQL que vous avez copiée
4. Cliquez sur **"Save Changes"**

### 4. Redéployer le backend

1. Render va automatiquement redéployer votre backend
2. Attendez que le déploiement soit terminé
3. Le backend va automatiquement :
   - Détecter PostgreSQL
   - Créer toutes les tables
   - Initialiser les données de test

## ✅ Vérification

Une fois le déploiement terminé, vérifiez les logs du backend. Vous devriez voir :

```
📊 Using PostgreSQL database
✅ Connected to PostgreSQL database
✅ PostgreSQL schema initialized
```

## 🔄 Migration des données

Si vous aviez des données dans SQLite, elles ne seront pas automatiquement migrées. Vous devrez :

1. Réinitialiser les données avec l'endpoint `/api/setup/seed`
2. Ou recréer manuellement vos conciergeries et FAQs

## 📝 Notes importantes

- **Persistance** : Les données seront maintenant persistantes même après un redéploiement
- **Sessions** : Les sessions restent en mémoire, mais les données utilisateurs sont sauvegardées
- **Backup** : Render fait automatiquement des backups de votre base PostgreSQL
- **Limites** : Le plan gratuit a des limites (90 jours de rétention, 1GB de stockage)

## 🆘 Dépannage

### Erreur de connexion

Si vous voyez une erreur de connexion :
1. Vérifiez que `DATABASE_URL` est bien configurée
2. Vérifiez que la base PostgreSQL est dans la même région que le backend
3. Vérifiez que la base est bien démarrée (pas en pause)

### Tables non créées

Si les tables ne sont pas créées :
1. Vérifiez les logs du backend au démarrage
2. Vérifiez que le code a bien été déployé avec les nouvelles dépendances PostgreSQL

### Données perdues

Si vous perdez des données :
1. Vérifiez que `DATABASE_URL` est toujours configurée
2. Vérifiez que la base PostgreSQL n'a pas été supprimée
3. Utilisez `/api/setup/seed` pour réinitialiser les données de test

