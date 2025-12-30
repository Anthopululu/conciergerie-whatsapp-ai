# 🔧 Configuration Twilio pour WhatsApp

## Problème : Pas de réponse automatique

Si vous envoyez un message WhatsApp mais ne recevez pas de réponse, c'est probablement parce que :

1. **Twilio n'est pas configuré** dans l'interface admin
2. **Le webhook Twilio n'est pas configuré** dans la console Twilio
3. **Le numéro WhatsApp n'est pas configuré** pour la conciergerie

## ✅ Solution : Configuration complète

### Étape 1 : Configurer Twilio dans l'interface Admin

1. Connectez-vous à l'interface admin : `https://votre-url-admin.onrender.com`
2. Allez dans l'onglet **"Conciergeries"**
3. Sélectionnez une conciergerie
4. Cliquez sur **"Configurer WhatsApp"** ou **"WhatsApp Onboarding"**
5. Remplissez les champs :
   - **Numéro WhatsApp** : `whatsapp:+14155238886` (Sandbox) ou votre numéro de production
   - **Account SID** : Votre Twilio Account SID
   - **Auth Token** : Votre Twilio Auth Token
   - **Sandbox Join Code** : Si vous utilisez le Sandbox, le code d'activation (ex: `join xxxxx`)
6. Cliquez sur **"Enregistrer"**

### Étape 2 : Configurer le Webhook dans Twilio

1. Allez sur [Twilio Console](https://console.twilio.com/)
2. Allez dans **Messaging** > **Settings** > **WhatsApp Sandbox** (ou **WhatsApp Senders** pour la production)
3. Configurez le webhook :
   - **When a message comes in** : `https://conciergerie-whatsapp-ai.onrender.com/webhook/whatsapp`
   - **Method** : `HTTP POST`
4. Sauvegardez

### Étape 3 : Vérifier la configuration

Exécutez cette commande pour vérifier :

```bash
curl https://conciergerie-whatsapp-ai.onrender.com/api/test/whatsapp-config
```

Vous devriez voir :
```json
{
  "status": "ok",
  "conciergeries": [
    {
      "id": 1,
      "name": "Résidence Le Parc",
      "hasWhatsAppNumber": true,
      "hasAccountSid": true,
      "hasAuthToken": true,
      "twilioClientInitialized": true,
      "whatsappNumber": "whatsapp:+14155238886"
    }
  ]
}
```

### Étape 4 : Tester

1. Envoyez un message WhatsApp au numéro configuré
2. Vérifiez les logs dans Render pour voir si le webhook est appelé
3. Vous devriez recevoir une réponse automatique de l'IA

## 🔍 Diagnostic

### Le webhook ne reçoit pas les messages

1. Vérifiez que l'URL du webhook dans Twilio est correcte : `https://conciergerie-whatsapp-ai.onrender.com/webhook/whatsapp`
2. Vérifiez que le webhook est en `HTTP POST`
3. Vérifiez que votre serveur Render est actif (pas en veille)

### Le webhook reçoit les messages mais ne répond pas

1. Vérifiez que la configuration Twilio est bien enregistrée dans l'interface admin
2. Vérifiez les logs Render pour voir les erreurs
3. Vérifiez que `ai_auto_reply` est activé pour la conversation (par défaut : oui)

### Erreur "Unauthorized" lors de l'enregistrement

1. Assurez-vous d'être connecté en tant qu'administrateur
2. Rafraîchissez la page et reconnectez-vous si nécessaire
3. Vérifiez que le token admin est présent dans `localStorage`

## 📝 Notes importantes

- **Sandbox Twilio** : Pour tester, vous devez d'abord envoyer `join xxxxx` au numéro Sandbox
- **Production** : Une fois en production, vous n'avez plus besoin du code d'activation
- **Webhook URL** : Doit être accessible publiquement (pas `localhost`)
- **Render Free Plan** : Le serveur se met en veille après 15 min d'inactivité. Le premier message peut prendre 30-60 secondes à être traité.

## 🆘 Besoin d'aide ?

Si le problème persiste :
1. Vérifiez les logs Render dans l'onglet "Logs"
2. Vérifiez les logs Twilio dans la console Twilio
3. Testez le webhook manuellement avec `curl`

