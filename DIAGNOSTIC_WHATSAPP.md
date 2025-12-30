# 🔍 Diagnostic : Message visible dans l'app mais pas sur WhatsApp

## Problème

Vous voyez le message dans l'application (dashboard conciergerie) mais **pas sur votre WhatsApp**.

## Cause probable

La réponse IA est générée et sauvegardée dans la base de données (c'est pour ça qu'elle apparaît dans l'app), mais **l'envoi via Twilio échoue**.

## ✅ Solutions

### 1. Vérifier la configuration Twilio

Exécutez cette commande pour vérifier :

```bash
curl https://conciergerie-whatsapp-ai.onrender.com/api/test/whatsapp-config
```

Vous devriez voir :
- `hasWhatsAppNumber: true`
- `hasAccountSid: true`
- `hasAuthToken: true`
- `twilioClientInitialized: true`

Si l'un de ces champs est `false`, la configuration Twilio n'est pas complète.

### 2. Configurer Twilio dans l'interface Admin

1. Connectez-vous à l'interface admin
2. Allez dans **"Conciergeries"**
3. Sélectionnez la conciergerie concernée
4. Cliquez sur **"Configurer WhatsApp"**
5. Remplissez **tous** les champs :
   - **Numéro WhatsApp** : `whatsapp:+14155238886` (Sandbox) ou votre numéro
   - **Account SID** : Votre Twilio Account SID
   - **Auth Token** : Votre Twilio Auth Token
6. Cliquez sur **"Enregistrer"**

### 3. Vérifier les logs Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service backend
3. Allez dans l'onglet **"Logs"**
4. Cherchez les messages qui commencent par :
   - `❌ Failed to send WhatsApp message`
   - `⚠️ Cannot send AI response`
   - `📤 Calling sendWhatsAppMessage`

Ces logs vous diront exactement pourquoi l'envoi échoue.

### 4. Erreurs courantes

#### Erreur : "WhatsApp number not configured"
**Solution** : Configurez le numéro WhatsApp dans l'interface admin

#### Erreur : "No Twilio client configured"
**Solution** : Vérifiez que Account SID et Auth Token sont bien configurés

#### Erreur : "Invalid phone number"
**Solution** : Vérifiez que le numéro de destination est au format `whatsapp:+33612345678`

#### Erreur : "Twilio API error 21211"
**Solution** : Le numéro de destination n'est pas valide ou n'a pas rejoint le Sandbox

#### Erreur : "Twilio API error 21608"
**Solution** : Vous utilisez un numéro Sandbox mais le destinataire n'a pas envoyé le code d'activation

### 5. Test manuel

Pour tester si Twilio fonctionne, vous pouvez envoyer un message manuellement depuis l'interface :

1. Ouvrez la conversation dans l'application conciergerie
2. Tapez un message
3. Cliquez sur "Envoyer"
4. Vérifiez si le message arrive sur WhatsApp

Si le message manuel fonctionne mais pas l'automatique, le problème vient de la génération/réponse IA.

## 📝 Notes importantes

- **Sandbox Twilio** : Le destinataire doit d'abord envoyer `join xxxxx` au numéro Sandbox
- **Window de 24h** : Dans le Sandbox, vous ne pouvez répondre que dans les 24h après le dernier message du client
- **Logs** : Les logs Render sont essentiels pour diagnostiquer les problèmes

## 🆘 Besoin d'aide ?

Si le problème persiste après avoir vérifié tout ce qui précède :

1. Copiez les logs Render (surtout les lignes avec `❌`)
2. Vérifiez la configuration Twilio dans la console Twilio
3. Testez avec un message manuel depuis l'interface

