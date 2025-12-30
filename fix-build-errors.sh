#!/bin/bash

# Script pour corriger les erreurs de build TypeScript
# À exécuter sur le serveur : cd /root/conciergerie-whatsapp-ai && bash fix-build-errors.sh

set -e

BACKEND_DIR="/root/conciergerie-whatsapp-ai/backend"

echo "🔧 Correction des erreurs TypeScript..."

# Correction 1: database.ts ligne 357
echo "📝 Correction database.ts..."
sed -i 's/const savedPassword = verify\[0\]\.values\[0\]\[0\];/const savedPassword = verify[0].values[0][0];\n        const passwordStr = typeof savedPassword === '\''string'\'' ? savedPassword : String(savedPassword);/' "$BACKEND_DIR/src/database.ts"
sed -i 's/savedPassword\.substring(0, 3)/passwordStr.substring(0, 3)/' "$BACKEND_DIR/src/database.ts"

# Correction 2: seed-data.ts - corriger tous les appels addMessage
echo "📝 Correction seed-data.ts..."
cd "$BACKEND_DIR/src"

# Remplacer tous les appels addMessage avec les bons paramètres
sed -i "s/dbQueries\.addMessage(conv1\.id, 'Bonjour, à quelle heure ouvre la conciergerie demain \?', 'inbound', 'whatsapp:\+33612345678');/dbQueries.addMessage(conv1.id, 'client', 'Bonjour, à quelle heure ouvre la conciergerie demain ?');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv2\.id, 'Je voudrais réserver la salle commune pour samedi prochain', 'inbound', 'whatsapp:\+33623456789');/dbQueries.addMessage(conv2.id, 'client', 'Je voudrais réserver la salle commune pour samedi prochain');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv2\.id, 'Oui merci, c'\\''est pour 20 personnes de 14h à 18h', 'inbound', 'whatsapp:\+33623456789');/dbQueries.addMessage(conv2.id, 'client', 'Oui merci, c'\\''est pour 20 personnes de 14h à 18h');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv3\.id, 'Bonjour', 'inbound', 'whatsapp:\+33634567890');/dbQueries.addMessage(conv3.id, 'client', 'Bonjour');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv4\.id, 'Mes invités arrivent ce soir, comment peuvent-ils accéder au parking \?', 'inbound', 'whatsapp:\+33645678901');/dbQueries.addMessage(conv4.id, 'client', 'Mes invités arrivent ce soir, comment peuvent-ils accéder au parking ?');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv4\.id, 'Parfait, ils arrivent vers 19h donc ça ira\. Merci !', 'inbound', 'whatsapp:\+33645678901');/dbQueries.addMessage(conv4.id, 'client', 'Parfait, ils arrivent vers 19h donc ça ira. Merci !');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv5\.id, 'C'\\''est quand le ramassage des poubelles jaunes \?', 'inbound', 'whatsapp:\+33656789012');/dbQueries.addMessage(conv5.id, 'client', 'C'\\''est quand le ramassage des poubelles jaunes ?');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv6\.id, 'La piscine est ouverte en ce moment \?', 'inbound', 'whatsapp:\+33667890123');/dbQueries.addMessage(conv6.id, 'client', 'La piscine est ouverte en ce moment ?');/" seed-data.ts

sed -i "s/dbQueries\.addMessage(conv6\.id, 'Super merci ! Et pour les enfants aussi le bonnet \?', 'inbound', 'whatsapp:\+33667890123');/dbQueries.addMessage(conv6.id, 'client', 'Super merci ! Et pour les enfants aussi le bonnet ?');/" seed-data.ts

# Corriger les messages concierge (outbound -> concierge avec isAi=1)
sed -i "s/'outbound',/'concierge', null, 1,/" seed-data.ts
sed -i "s/'assistant'/'concierge', null, 1/" seed-data.ts

# Correction 3: server.ts - ajouter import et vérifications null
echo "📝 Correction server.ts..."
sed -i "s/import { dbQueries } from '\.\/database';/import { dbQueries, Conciergerie } from '.\/database';/" server.ts

# Ajouter vérification null après la ligne 405
sed -i '/const conversation = dbQueries\.getOrCreateConversation(From, conciergerie\.id);/a\
\
    if (!conciergerie) {\
      console.error('\''❌ No conciergerie found for routing'\'');\
      res.type('\''text\/xml'\'');\
      return res.send('\''<Response><\/Response>'\'');\
    }' server.ts

# Remplacer les lignes problématiques dans server.ts
sed -i 's/conciergerie = conciergeries\.find(c => c\.id === conciergerieId) || null;/const foundConciergerie = dbQueries.getConciergerieById(conciergerieId);\n        if (foundConciergerie) {\n          conciergerie = foundConciergerie;\n        }/' server.ts

sed -i 's/conciergerie = conciergeries\[0\];/const firstConciergerie = dbQueries.getConciergerieById(conciergeries[0].id);\n      if (!firstConciergerie) {\n        console.error('\''❌ Failed to get conciergerie data'\'');\n        res.type('\''text\/xml'\'');\n        return res.send('\''<Response><\/Response>'\'');\n      }\n      conciergerie = firstConciergerie;/' server.ts

# Ajouter vérification null avant l'utilisation de conciergerie dans la section async
sed -i '/console\.log(`🔄 Starting AI response generation/ i\
        if (!conciergerie) {\
          console.error('\''❌ Conciergerie is null, cannot generate AI response'\'');\
          return;\
        }\
' server.ts

echo "✅ Corrections appliquées !"
echo ""
echo "Maintenant, essayez de builder :"
echo "cd $BACKEND_DIR && npm run build"

