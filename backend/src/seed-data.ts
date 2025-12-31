import { initDatabase } from './database-wrapper';
import { dbQueries } from './database-wrapper';

const USE_POSTGRES = !!process.env.DATABASE_URL;

async function seed() {
  console.log('🌱 Seeding database with test data...');
  console.log(`📊 Using ${USE_POSTGRES ? 'PostgreSQL' : 'SQLite'} database`);

  // Initialize database
  await initDatabase();

  // Twilio configuration (default for all conciergeries)
  const DEFAULT_WHATSAPP_NUMBER = 'whatsapp:+14155238886';
  const DEFAULT_TWILIO_ACCOUNT_SID = 'TWILIO_ACCOUNT_SID_ENV';
  const DEFAULT_TWILIO_AUTH_TOKEN = 'TWILIO_AUTH_TOKEN_ENV';

  // Create two conciergeries with Twilio config
  console.log('\n📝 Creating conciergeries with Twilio configuration...');
  const conciergerie1 = USE_POSTGRES
    ? await dbQueries.createConciergerieAsync('Résidence Le Parc', 'parc@conciergerie.fr', 'parc123')
    : dbQueries.createConciergerie('Résidence Le Parc', 'parc@conciergerie.fr', 'parc123', DEFAULT_WHATSAPP_NUMBER, DEFAULT_TWILIO_ACCOUNT_SID, DEFAULT_TWILIO_AUTH_TOKEN);
  console.log(`✓ Created: ${conciergerie1.name}`);

  // Update conciergerie1 with Twilio config if using PostgreSQL
  if (USE_POSTGRES) {
    await dbQueries.updateConciergerieAsync(conciergerie1.id, {
      whatsapp_number: DEFAULT_WHATSAPP_NUMBER,
      twilio_account_sid: DEFAULT_TWILIO_ACCOUNT_SID,
      twilio_auth_token: DEFAULT_TWILIO_AUTH_TOKEN,
    });
  }

  const conciergerie2 = USE_POSTGRES
    ? await dbQueries.createConciergerieAsync('Domaine des Jardins', 'jardins@conciergerie.fr', 'jardins123')
    : dbQueries.createConciergerie('Domaine des Jardins', 'jardins@conciergerie.fr', 'jardins123', DEFAULT_WHATSAPP_NUMBER, DEFAULT_TWILIO_ACCOUNT_SID, DEFAULT_TWILIO_AUTH_TOKEN);
  console.log(`✓ Created: ${conciergerie2.name}`);

  // Update conciergerie2 with Twilio config if using PostgreSQL
  if (USE_POSTGRES) {
    await dbQueries.updateConciergerieAsync(conciergerie2.id, {
      whatsapp_number: DEFAULT_WHATSAPP_NUMBER,
      twilio_account_sid: DEFAULT_TWILIO_ACCOUNT_SID,
      twilio_auth_token: DEFAULT_TWILIO_AUTH_TOKEN,
    });
  }

  // Create FAQs for Conciergerie 1
  console.log('\n📚 Creating FAQs for Résidence Le Parc...');
  if (USE_POSTGRES) {
    await dbQueries.addFAQAsync(conciergerie1.id, 'Quels sont les horaires de la conciergerie ?', 'La conciergerie de la Résidence Le Parc est ouverte du lundi au vendredi de 8h à 19h, et le samedi de 9h à 13h. Nous sommes fermés le dimanche et jours fériés.');
    await dbQueries.addFAQAsync(conciergerie1.id, 'Comment réserver la salle commune ?', 'Pour réserver la salle commune, vous pouvez contacter la conciergerie par téléphone au 01 23 45 67 89 ou passer directement. La réservation doit être faite au moins 48h à l\'avance.');
    await dbQueries.addFAQAsync(conciergerie1.id, 'Où se trouve le local à vélos ?', 'Le local à vélos se trouve au sous-sol -1, à gauche en sortant de l\'ascenseur. L\'accès se fait avec votre badge d\'entrée.');
  } else {
    dbQueries.addFAQ(conciergerie1.id, 'Quels sont les horaires de la conciergerie ?', 'La conciergerie de la Résidence Le Parc est ouverte du lundi au vendredi de 8h à 19h, et le samedi de 9h à 13h. Nous sommes fermés le dimanche et jours fériés.');
    dbQueries.addFAQ(conciergerie1.id, 'Comment réserver la salle commune ?', 'Pour réserver la salle commune, vous pouvez contacter la conciergerie par téléphone au 01 23 45 67 89 ou passer directement. La réservation doit être faite au moins 48h à l\'avance.');
    dbQueries.addFAQ(conciergerie1.id, 'Où se trouve le local à vélos ?', 'Le local à vélos se trouve au sous-sol -1, à gauche en sortant de l\'ascenseur. L\'accès se fait avec votre badge d\'entrée.');
  }
  console.log('✓ Added FAQ: Horaires');
  console.log('✓ Added FAQ: Réservation salle commune');
  console.log('✓ Added FAQ: Local vélos');

  // Create FAQs for Conciergerie 2
  console.log('\n📚 Creating FAQs for Domaine des Jardins...');
  if (USE_POSTGRES) {
    await dbQueries.addFAQAsync(conciergerie2.id, 'Comment accéder au parking visiteurs ?', 'Le parking visiteurs se trouve côté Est du bâtiment. L\'accès est libre de 7h à 22h. Après 22h, veuillez contacter la conciergerie pour obtenir un code d\'accès temporaire.');
    await dbQueries.addFAQAsync(conciergerie2.id, 'Quels sont les jours de ramassage des ordures ?', 'Les ordures ménagères sont ramassées le mardi et vendredi matin. Le tri sélectif (jaune) le jeudi. Merci de sortir vos poubelles la veille au soir.');
    await dbQueries.addFAQAsync(conciergerie2.id, 'Y a-t-il une piscine dans la résidence ?', 'Oui, la piscine est ouverte de juin à septembre, tous les jours de 10h à 20h. L\'accès est réservé aux résidents et leurs invités. Le port du bonnet est obligatoire.');
  } else {
    dbQueries.addFAQ(conciergerie2.id, 'Comment accéder au parking visiteurs ?', 'Le parking visiteurs se trouve côté Est du bâtiment. L\'accès est libre de 7h à 22h. Après 22h, veuillez contacter la conciergerie pour obtenir un code d\'accès temporaire.');
    dbQueries.addFAQ(conciergerie2.id, 'Quels sont les jours de ramassage des ordures ?', 'Les ordures ménagères sont ramassées le mardi et vendredi matin. Le tri sélectif (jaune) le jeudi. Merci de sortir vos poubelles la veille au soir.');
    dbQueries.addFAQ(conciergerie2.id, 'Y a-t-il une piscine dans la résidence ?', 'Oui, la piscine est ouverte de juin à septembre, tous les jours de 10h à 20h. L\'accès est réservé aux résidents et leurs invités. Le port du bonnet est obligatoire.');
  }
  console.log('✓ Added FAQ: Parking visiteurs');
  console.log('✓ Added FAQ: Ramassage ordures');
  console.log('✓ Added FAQ: Piscine');

  // Set up phone routing for Conciergerie 1
  console.log('\n📞 Setting up phone routing for Résidence Le Parc...');
  if (USE_POSTGRES) {
    await dbQueries.setPhoneRoutingAsync('whatsapp:+33612345678', conciergerie1.id);
    await dbQueries.setPhoneRoutingAsync('whatsapp:+33623456789', conciergerie1.id);
    await dbQueries.setPhoneRoutingAsync('whatsapp:+33634567890', conciergerie1.id);
  } else {
    dbQueries.setPhoneRouting('whatsapp:+33612345678', conciergerie1.id);
    dbQueries.setPhoneRouting('whatsapp:+33623456789', conciergerie1.id);
    dbQueries.setPhoneRouting('whatsapp:+33634567890', conciergerie1.id);
  }
  console.log('✓ Configured 3 phone numbers for Résidence Le Parc');

  // Create conversations for Conciergerie 1
  console.log('\n💬 Creating conversations for Résidence Le Parc...');
  const conv1 = USE_POSTGRES
    ? await dbQueries.getOrCreateConversationAsync('whatsapp:+33612345678', conciergerie1.id)
    : dbQueries.getOrCreateConversation('whatsapp:+33612345678', conciergerie1.id);
  
  if (USE_POSTGRES) {
    await dbQueries.addMessageAsync(conv1.id, 'Bonjour, à quelle heure ouvre la conciergerie demain ?', 'client');
    await dbQueries.addMessageAsync(conv1.id, 'Bonjour ! La conciergerie de la Résidence Le Parc est ouverte du lundi au vendredi de 8h à 19h. Demain étant un jour de semaine, nous ouvrons à 8h. Comment puis-je vous aider ?', 'concierge', undefined, undefined, 1);
  } else {
    dbQueries.addMessage(conv1.id, 'client', 'Bonjour, à quelle heure ouvre la conciergerie demain ?');
    dbQueries.addMessage(conv1.id, 'concierge', 'Bonjour ! La conciergerie de la Résidence Le Parc est ouverte du lundi au vendredi de 8h à 19h. Demain étant un jour de semaine, nous ouvrons à 8h. Comment puis-je vous aider ?', null, 1);
  }
  console.log('✓ Created conversation 1 for Résidence Le Parc');

  const conv2 = USE_POSTGRES
    ? await dbQueries.getOrCreateConversationAsync('whatsapp:+33623456789', conciergerie1.id)
    : dbQueries.getOrCreateConversation('whatsapp:+33623456789', conciergerie1.id);
  
  if (USE_POSTGRES) {
    await dbQueries.addMessageAsync(conv2.id, 'Je voudrais réserver la salle commune pour samedi prochain', 'client');
    await dbQueries.addMessageAsync(conv2.id, 'Bien sûr ! Pour réserver la salle commune, je vous invite à nous contacter par téléphone au 01 23 45 67 89 ou à passer directement à la conciergerie. La réservation doit être faite au moins 48h à l\'avance. Souhaitez-vous que je note votre demande ?', 'concierge', undefined, undefined, 1);
    await dbQueries.addMessageAsync(conv2.id, 'Oui merci, c\'est pour 20 personnes de 14h à 18h', 'client');
  } else {
    dbQueries.addMessage(conv2.id, 'client', 'Je voudrais réserver la salle commune pour samedi prochain');
    dbQueries.addMessage(conv2.id, 'concierge', 'Bien sûr ! Pour réserver la salle commune, je vous invite à nous contacter par téléphone au 01 23 45 67 89 ou à passer directement à la conciergerie. La réservation doit être faite au moins 48h à l\'avance. Souhaitez-vous que je note votre demande ?', null, 1);
    dbQueries.addMessage(conv2.id, 'client', 'Oui merci, c\'est pour 20 personnes de 14h à 18h');
  }
  console.log('✓ Created conversation 2 for Résidence Le Parc');

  const conv3 = USE_POSTGRES
    ? await dbQueries.getOrCreateConversationAsync('whatsapp:+33634567890', conciergerie1.id)
    : dbQueries.getOrCreateConversation('whatsapp:+33634567890', conciergerie1.id);
  
  if (USE_POSTGRES) {
    await dbQueries.addMessageAsync(conv3.id, 'Bonjour', 'client');
  } else {
    dbQueries.addMessage(conv3.id, 'client', 'Bonjour');
  }
  console.log('✓ Created conversation 3 for Résidence Le Parc');

  // Set up phone routing for Conciergerie 2
  console.log('\n📞 Setting up phone routing for Domaine des Jardins...');
  if (USE_POSTGRES) {
    await dbQueries.setPhoneRoutingAsync('whatsapp:+33645678901', conciergerie2.id);
    await dbQueries.setPhoneRoutingAsync('whatsapp:+33656789012', conciergerie2.id);
    await dbQueries.setPhoneRoutingAsync('whatsapp:+33667890123', conciergerie2.id);
  } else {
    dbQueries.setPhoneRouting('whatsapp:+33645678901', conciergerie2.id);
    dbQueries.setPhoneRouting('whatsapp:+33656789012', conciergerie2.id);
    dbQueries.setPhoneRouting('whatsapp:+33667890123', conciergerie2.id);
  }
  console.log('✓ Configured 3 phone numbers for Domaine des Jardins');

  // Create conversations for Conciergerie 2
  console.log('\n💬 Creating conversations for Domaine des Jardins...');
  const conv4 = USE_POSTGRES
    ? await dbQueries.getOrCreateConversationAsync('whatsapp:+33645678901', conciergerie2.id)
    : dbQueries.getOrCreateConversation('whatsapp:+33645678901', conciergerie2.id);
  
  if (USE_POSTGRES) {
    await dbQueries.addMessageAsync(conv4.id, 'Mes invités arrivent ce soir, comment peuvent-ils accéder au parking ?', 'client');
    await dbQueries.addMessageAsync(conv4.id, 'Bonjour ! Le parking visiteurs se trouve côté Est du bâtiment. L\'accès est libre de 7h à 22h. Si vos invités arrivent après 22h, ils peuvent me contacter pour obtenir un code d\'accès temporaire.', 'concierge', undefined, undefined, 1);
    await dbQueries.addMessageAsync(conv4.id, 'Parfait, ils arrivent vers 19h donc ça ira. Merci !', 'client');
  } else {
    dbQueries.addMessage(conv4.id, 'client', 'Mes invités arrivent ce soir, comment peuvent-ils accéder au parking ?');
    dbQueries.addMessage(conv4.id, 'concierge', 'Bonjour ! Le parking visiteurs se trouve côté Est du bâtiment. L\'accès est libre de 7h à 22h. Si vos invités arrivent après 22h, ils peuvent me contacter pour obtenir un code d\'accès temporaire.', null, 1);
    dbQueries.addMessage(conv4.id, 'client', 'Parfait, ils arrivent vers 19h donc ça ira. Merci !');
  }
  console.log('✓ Created conversation 1 for Domaine des Jardins');

  const conv5 = USE_POSTGRES
    ? await dbQueries.getOrCreateConversationAsync('whatsapp:+33656789012', conciergerie2.id)
    : dbQueries.getOrCreateConversation('whatsapp:+33656789012', conciergerie2.id);
  
  if (USE_POSTGRES) {
    await dbQueries.addMessageAsync(conv5.id, 'C\'est quand le ramassage des poubelles jaunes ?', 'client');
    await dbQueries.addMessageAsync(conv5.id, 'Le tri sélectif (poubelles jaunes) est ramassé le jeudi matin. Merci de sortir vos poubelles la veille au soir. Les ordures ménagères sont ramassées le mardi et vendredi.', 'concierge', undefined, undefined, 1);
  } else {
    dbQueries.addMessage(conv5.id, 'client', 'C\'est quand le ramassage des poubelles jaunes ?');
    dbQueries.addMessage(conv5.id, 'concierge', 'Le tri sélectif (poubelles jaunes) est ramassé le jeudi matin. Merci de sortir vos poubelles la veille au soir. Les ordures ménagères sont ramassées le mardi et vendredi.', null, 1);
  }
  console.log('✓ Created conversation 2 for Domaine des Jardins');

  const conv6 = USE_POSTGRES
    ? await dbQueries.getOrCreateConversationAsync('whatsapp:+33667890123', conciergerie2.id)
    : dbQueries.getOrCreateConversation('whatsapp:+33667890123', conciergerie2.id);
  
  if (USE_POSTGRES) {
    await dbQueries.addMessageAsync(conv6.id, 'La piscine est ouverte en ce moment ?', 'client');
    await dbQueries.addMessageAsync(conv6.id, 'Oui, la piscine est actuellement ouverte ! Elle est accessible de juin à septembre, tous les jours de 10h à 20h. L\'accès est réservé aux résidents et leurs invités. N\'oubliez pas votre bonnet, il est obligatoire ! 😊', 'concierge', undefined, undefined, 1);
    await dbQueries.addMessageAsync(conv6.id, 'Super merci ! Et pour les enfants aussi le bonnet ?', 'client');
  } else {
    dbQueries.addMessage(conv6.id, 'client', 'La piscine est ouverte en ce moment ?');
    dbQueries.addMessage(conv6.id, 'concierge', 'Oui, la piscine est actuellement ouverte ! Elle est accessible de juin à septembre, tous les jours de 10h à 20h. L\'accès est réservé aux résidents et leurs invités. N\'oubliez pas votre bonnet, il est obligatoire ! 😊', null, 1);
    dbQueries.addMessage(conv6.id, 'client', 'Super merci ! Et pour les enfants aussi le bonnet ?');
  }
  console.log('✓ Created conversation 3 for Domaine des Jardins');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('  - 2 conciergeries created');
  console.log('  - 6 FAQs created (3 per conciergerie)');
  console.log('  - 6 phone routing rules created (3 per conciergerie)');
  console.log('  - 6 conversations created (3 per conciergerie)');
  console.log('\n🔐 Login credentials:');
  console.log('  Résidence Le Parc:     parc@conciergerie.fr / parc123');
  console.log('  Domaine des Jardins:   jardins@conciergerie.fr / jardins123');
  console.log('\n📞 Phone routing:');
  console.log('  Résidence Le Parc:     +33612345678, +33623456789, +33634567890');
  console.log('  Domaine des Jardins:   +33645678901, +33656789012, +33667890123');
}

// Export as default for dynamic import
export default seed;

// Only run if called directly (not imported)
// Check if this file is being run directly via tsx/node
if (process.argv[1] && process.argv[1].endsWith('seed-data.ts')) {
  seed().catch(console.error);
}
