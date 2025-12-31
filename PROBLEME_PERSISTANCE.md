# ⚠️ Problème de Persistance sur Render

## Le Problème

Sur Render, le système de fichiers est **éphémère**. Cela signifie que :

1. **Base de données SQLite** : Le fichier `concierge.db` est perdu à chaque redéploiement
2. **Sessions** : Les sessions en mémoire sont perdues quand le serveur redémarre

## Solutions

### Solution 1 : Initialisation Automatique (Déjà implémentée)

Le serveur initialise automatiquement les données au démarrage si la base est vide. Mais cela ne résout pas le problème des sessions.

### Solution 2 : Utiliser une Base de Données Externe (Recommandé)

Pour une vraie persistance, utilisez une base de données externe :

#### Option A : PostgreSQL sur Render (Gratuit)

1. Créer un service **PostgreSQL** sur Render (gratuit)
2. Modifier le code pour utiliser PostgreSQL au lieu de SQLite
3. Les données seront persistantes

#### Option B : SQLite avec Volume Persistant

Render ne supporte pas les volumes persistants sur le plan gratuit. Il faudrait :
- Utiliser un service de stockage externe (S3, etc.)
- Ou passer au plan payant avec volumes persistants

### Solution 3 : Sauvegarder dans une Base Externe

Utiliser un service comme :
- **Supabase** (PostgreSQL gratuit)
- **Railway** (PostgreSQL gratuit)
- **Neon** (PostgreSQL gratuit)

## Solution Temporaire : Réinitialisation Automatique

Le code actuel réinitialise automatiquement les données au démarrage. Mais vous devrez :
- Vous reconnecter après chaque redéploiement
- Réinitialiser les données si elles sont perdues

## Pour Réinitialiser les Données

```bash
curl -X POST https://conciergerie-whatsapp-ai.onrender.com/api/setup/seed
```

## Note Importante

Sur le plan gratuit de Render, **les données ne sont pas persistantes**. Pour une vraie persistance, il faut :
1. Utiliser une base de données externe (PostgreSQL)
2. Ou utiliser un service avec persistance (Railway, Heroku, etc.)

