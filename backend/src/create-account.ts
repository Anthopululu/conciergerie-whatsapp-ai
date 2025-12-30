// Script pour créer un compte conciergerie
// Usage: tsx src/create-account.ts

import { initDatabase } from './database';
import dbQueries from './database';

async function createAccount() {
  console.log('🔐 Création d\'un compte conciergerie...');
  
  await initDatabase();
  
  // Vérifier si des conciergeries existent déjà
  const existing = dbQueries.getAllConciergeries();
  if (existing.length > 0) {
    console.log('⚠️  Des conciergeries existent déjà:');
    existing.forEach(c => {
      console.log(`   - ${c.name} (${c.email})`);
    });
    console.log('\nPour créer un nouveau compte, utilisez l\'API admin.');
    return;
  }
  
  // Créer le compte
  const conciergerie = dbQueries.createConciergerie(
    'Conciergerie Principale',
    'conciergerie@example.com',
    'concierge123'
  );
  
  console.log('\n✅ Compte créé avec succès !');
  console.log('\n📋 Identifiants de connexion:');
  console.log(`   Email : ${conciergerie.email}`);
  console.log(`   Mot de passe : concierge123`);
  console.log('\n🔗 Connectez-vous sur votre frontend avec ces identifiants.');
}

createAccount().catch(console.error);

