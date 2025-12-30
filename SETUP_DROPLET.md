# Guide de Setup Rapide - Droplet DigitalOcean

## Étape 1 : Se Connecter au Droplet

Récupérez l'IP de votre droplet depuis le dashboard DigitalOcean, puis :

```bash
# Se connecter au droplet (remplacer VOTRE_IP par l'IP de votre droplet)
ssh root@VOTRE_IP_DROPLET

# Si vous utilisez une clé SSH :
ssh -i ~/.ssh/ma_cle root@VOTRE_IP_DROPLET
```

## Étape 2 : Installer Docker (Requis pour CapRover)

Une fois connecté au droplet, exécutez :

```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Vérifier l'installation
docker --version
```

## Étape 3 : Installer CapRover

```bash
# Installer CapRover
docker run -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  caprover/caprover
```

**Attendez 2-3 minutes** que CapRover démarre complètement.

## Étape 4 : Accéder à l'Interface CapRover

1. Ouvrez votre navigateur
2. Allez sur : `http://VOTRE_IP_DROPLET`
3. Vous verrez l'écran de configuration initiale

## Étape 5 : Configuration Initiale CapRover

1. **Définir le mot de passe admin** :
   - Choisissez un mot de passe fort
   - Notez-le dans un endroit sûr

2. **Configuration du domaine** (optionnel pour l'instant) :
   - Vous pouvez configurer un domaine plus tard
   - Pour l'instant, utilisez l'IP directement

3. Cliquez sur **Continue**

## Étape 6 : Créer les Applications

Une fois dans l'interface CapRover, suivez ces étapes pour chaque application :

### Application 1 : Backend

1. Cliquez sur **Apps** dans le menu de gauche
2. Cliquez sur **One-Click Apps/Databases** > **Create New App**
3. Nommez l'app : `conciergerie-backend`
4. Cliquez sur **App Configs** (icône engrenage)
5. Allez dans l'onglet **Deployment** :
   - **Method** : Sélectionnez **GitHub**
   - **Repository** : `Anthopululu/conciergerie-whatsapp-ai`
   - **Branch** : `main`
   - **Dockerfile Location** : `backend/Dockerfile`
6. Allez dans l'onglet **Environment Variables** :
   - Cliquez sur **Add New Variable** et ajoutez :
     ```
     TWILIO_ACCOUNT_SID=votre_account_sid
     TWILIO_AUTH_TOKEN=votre_auth_token
     TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
     ANTHROPIC_API_KEY=votre_api_key
     PORT=3000
     NODE_ENV=production
     ADMIN_EMAIL=admin@example.com
     ADMIN_PASSWORD=votre_mot_de_passe_securise
     ```
7. Allez dans l'onglet **HTTP Settings** :
   - Activez **HTTPS** (SSL automatique)
   - Pour l'instant, vous pouvez utiliser l'IP ou ajouter un domaine plus tard
8. Allez dans l'onglet **Volumes** (pour sauvegarder la base de données) :
   - Cliquez sur **Add Volume**
   - **Host Path** : `/captain/data/conciergerie-backend`
   - **Container Path** : `/app/concierge.db`
9. Cliquez sur **Save & Update** en bas

### Application 2 : Frontend Conciergerie

1. Créez une nouvelle app : `conciergerie-frontend`
2. **Deployment** :
   - **Method** : GitHub
   - **Repository** : `Anthopululu/conciergerie-whatsapp-ai`
   - **Branch** : `main`
   - **Dockerfile Location** : `frontend/Dockerfile`
3. **HTTP Settings** :
   - Activez HTTPS
4. **Save & Update**

### Application 3 : Frontend Admin

1. Créez une nouvelle app : `conciergerie-admin`
2. **Deployment** :
   - **Method** : GitHub
   - **Repository** : `Anthopululu/conciergerie-whatsapp-ai`
   - **Branch** : `main`
   - **Dockerfile Location** : `frontend-admin/Dockerfile`
3. **HTTP Settings** :
   - Activez HTTPS
4. **Save & Update**

## Étape 7 : Autoriser CapRover sur GitHub

Lors de la première connexion GitHub, CapRover vous demandera d'autoriser l'accès :
1. Cliquez sur le bouton d'autorisation
2. Autorisez CapRover à accéder à votre repository
3. CapRover pourra maintenant déployer automatiquement

## Étape 8 : Vérifier le Déploiement

1. Dans chaque application, allez dans l'onglet **App Logs**
2. Vous devriez voir les logs de build et de démarrage
3. Attendez que le statut passe à **Running** (vert)

## Étape 9 : Accéder aux Applications

Une fois déployées, vous pouvez accéder aux apps via :
- Backend : `http://VOTRE_IP_DROPLET:3000` ou le domaine configuré
- Frontend Conciergerie : L'URL affichée dans CapRover
- Frontend Admin : L'URL affichée dans CapRover

## Configuration du Webhook Twilio

1. Dans votre console Twilio
2. **Messaging** > **Settings** > **WhatsApp Sandbox Settings**
3. Webhook URL : `http://VOTRE_IP_DROPLET:3000/webhook/whatsapp`
   (ou `https://votre-domaine.com/webhook/whatsapp` si vous avez configuré un domaine)
4. Méthode : **HTTP POST**

## Problèmes Courants

### CapRover ne démarre pas
```bash
# Vérifier les logs Docker
docker ps -a
docker logs <container_id>
```

### Erreur de build
- Vérifiez que les Dockerfiles existent dans le repository
- Vérifiez les logs dans CapRover > App Logs

### Application ne démarre pas
- Vérifiez les variables d'environnement
- Vérifiez les logs dans CapRover

## Prochaines Étapes

1. ✅ Configurer un domaine (optionnel mais recommandé)
2. ✅ Configurer les DNS pour pointer vers votre droplet
3. ✅ CapRover configurera automatiquement SSL avec Let's Encrypt

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans CapRover
2. Consultez la documentation CapRover : https://caprover.com/docs/
3. Vérifiez que tous les ports sont ouverts dans DigitalOcean (80, 443, 3000)


