# ✅ Vérifier la Configuration Twilio

## Étape 1 : Vérifier dans l'interface Admin

1. Connectez-vous à l'interface admin
2. Allez dans **"Conciergeries"**
3. Sélectionnez une conciergerie
4. Vérifiez que vous voyez :
   - **Numéro WhatsApp** : `whatsapp:+14155238886` (ou votre numéro)
   - **Account SID** : Commence par `AC...`
   - **Auth Token** : Longue chaîne de caractères

Si ces champs sont vides, **configurez-les maintenant**.

## Étape 2 : Vérifier via l'API

Exécutez cette commande :

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
      "hasWhatsAppNumber": true,    ← Doit être true
      "hasAccountSid": true,        ← Doit être true
      "hasAuthToken": true,          ← Doit être true
      "twilioClientInitialized": true, ← Doit être true
      "whatsappNumber": "whatsapp:+14155238886"
    }
  ]
}
```

## Étape 3 : Vérifier les logs Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service backend
3. Allez dans l'onglet **"Logs"**
4. Envoyez un message depuis WhatsApp
5. Cherchez dans les logs :
   - `📩 Received message from...` - Le message est bien reçu
   - `🤖 AI generated response...` - La réponse IA est générée
   - `📤 Attempting to send message...` - Tentative d'envoi
   - `✅ Auto-sent AI response...` - Succès
   - `❌ Failed to send WhatsApp message...` - Échec (voir l'erreur)

## Problèmes courants

### "hasWhatsAppNumber: false"
**Solution** : Configurez le numéro WhatsApp dans l'interface admin

### "hasAccountSid: false" ou "hasAuthToken: false"
**Solution** : Configurez les credentials Twilio dans l'interface admin

### "twilioClientInitialized: false"
**Solution** : Les credentials sont configurés mais le client n'est pas initialisé. Redémarrez le serveur ou attendez quelques secondes.

### Erreur dans les logs : "Cannot initialize Twilio: missing credentials"
**Solution** : Vérifiez que tous les champs sont bien remplis dans l'interface admin

### Erreur dans les logs : "Failed to send WhatsApp message"
**Solution** : Vérifiez l'erreur spécifique dans les logs. Erreurs courantes :
- **21211** : Numéro de destination invalide
- **21608** : Le destinataire n'a pas rejoint le Sandbox (envoyez `join xxxxx` d'abord)
- **Authentication failed** : Mauvais Account SID ou Auth Token

## Test complet

1. Configurez Twilio dans l'interface admin
2. Vérifiez avec `curl` que la configuration est correcte
3. Envoyez un message depuis WhatsApp
4. Vérifiez les logs Render
5. Si vous voyez `✅ Auto-sent AI response`, le message devrait arriver sur WhatsApp

## Si ça ne fonctionne toujours pas

1. Copiez les logs Render (surtout les lignes avec `❌` ou `⚠️`)
2. Vérifiez que le webhook Twilio est bien configuré dans la console Twilio
3. Vérifiez que vous utilisez le bon numéro (Sandbox ou Production)

