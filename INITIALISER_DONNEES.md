# Initialiser les données de test sur Render

Votre base de données sur Render est vide. Pour ajouter les données de test (conciergeries, FAQs, conversations), suivez ces étapes :

## Méthode 1 : Via l'endpoint API (Recommandé)

Une fois que Render a redéployé avec le nouveau code (attendez 2-3 minutes), exécutez cette commande :

```bash
curl -X POST https://conciergerie-whatsapp-ai.onrender.com/api/setup/seed \
  -H "Content-Type: application/json"
```

**Note** : Cet endpoint ne fonctionne que si la base de données est vide. Si vous avez déjà des données, il retournera une erreur 403.

## Méthode 2 : Via le script seed localement

Si vous avez accès au serveur Render via SSH (non disponible sur le plan gratuit), vous pouvez exécuter :

```bash
cd backend
npm run seed
```

## Données créées

Après l'initialisation, vous aurez :

### Conciergeries
1. **Résidence Le Parc**
   - Email : `parc@conciergerie.fr`
   - Mot de passe : `parc123`

2. **Domaine des Jardins**
   - Email : `jardins@conciergerie.fr`
   - Mot de passe : `jardins123`

### FAQs
- **Résidence Le Parc** : 3 FAQs (horaires, réservation salle commune, local vélos)
- **Domaine des Jardins** : 3 FAQs (parking visiteurs, ramassage ordures, piscine)

### Conversations de test
- 6 conversations au total (3 par conciergerie) avec des messages d'exemple

### Routage téléphonique
- 6 numéros de test configurés (3 par conciergerie)

## Vérification

Après l'initialisation, vous pouvez vérifier que les données sont présentes :

1. Connectez-vous à l'admin avec `admin@example.com` / `admin123`
2. Allez dans la section "Conciergeries" - vous devriez voir les 2 conciergeries
3. Connectez-vous à une conciergerie - vous devriez voir les FAQs et conversations

## Important

⚠️ **Cet endpoint est public mais ne fonctionne qu'une seule fois** (si la base est vide). Pour ajouter plus de données, utilisez l'interface admin.

