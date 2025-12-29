import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'concierge.db');

let db: Database;

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema (only create if not exists)
  db.run(`
    CREATE TABLE IF NOT EXISTS conciergeries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      whatsapp_number TEXT,
      twilio_account_sid TEXT,
      twilio_auth_token TEXT,
      sandbox_join_code TEXT,
      plaintext_password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conciergerie_id INTEGER NOT NULL,
      phone_number TEXT NOT NULL,
      ai_auto_reply INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      ai_suggestion TEXT,
      is_ai INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE TABLE IF NOT EXISTS feature_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conciergerie_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id)
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conciergerie_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id)
    );

    CREATE TABLE IF NOT EXISTS phone_routing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL UNIQUE,
      conciergerie_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id)
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
    CREATE INDEX IF NOT EXISTS idx_conversations_conciergerie ON conversations(conciergerie_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
    CREATE INDEX IF NOT EXISTS idx_feature_requests_conciergerie ON feature_requests(conciergerie_id);
    CREATE INDEX IF NOT EXISTS idx_faqs_conciergerie ON faqs(conciergerie_id);
    CREATE INDEX IF NOT EXISTS idx_phone_routing_phone ON phone_routing(phone_number);
  `);

  // Migration: Add sandbox_join_code column if it doesn't exist (for existing databases)
  try {
    db.run(`ALTER TABLE conciergeries ADD COLUMN sandbox_join_code TEXT`);
    console.log('✅ Added sandbox_join_code column to conciergeries table');
  } catch (error: any) {
    // Column already exists or table doesn't exist yet (will be created with schema above)
    // Ignore error - this is expected for existing databases
  }

  // Migration: Add plaintext_password column if it doesn't exist (for existing databases)
  try {
    db.run(`ALTER TABLE conciergeries ADD COLUMN plaintext_password TEXT`);
    console.log('✅ Added plaintext_password column to conciergeries table');
  } catch (error: any) {
    // Column already exists or table doesn't exist yet (will be created with schema above)
    // Ignore error - this is expected for existing databases
  }

  // Migration: Add is_ai column if it doesn't exist (for existing databases)
  try {
    db.run(`ALTER TABLE messages ADD COLUMN is_ai INTEGER DEFAULT 0`);
    console.log('✅ Added is_ai column to messages table');
    
    // Migration: Update existing messages from concierge to is_ai = 1
    // This assumes that existing concierge messages were AI-generated
    // (since manual sending was added later)
    // Only update messages that were created before this migration
    try {
      const updateResult = db.exec(`
        UPDATE messages 
        SET is_ai = 1 
        WHERE sender = 'concierge' AND is_ai = 0
      `);
      // Note: sql.js doesn't return affected rows count directly
      // We'll check by querying after update
      const checkResult = db.exec(`
        SELECT COUNT(*) as count FROM messages WHERE sender = 'concierge' AND is_ai = 1
      `);
      const aiCount = checkResult.length > 0 && checkResult[0].values.length > 0 
        ? checkResult[0].values[0][0] 
        : 0;
      console.log(`✅ Migration: ${aiCount} concierge messages marked as AI (existing messages updated)`);
    } catch (updateError: any) {
      console.log('⚠️  Could not update existing messages (this is OK if table is new)');
    }
  } catch (error: any) {
    // Column already exists or table doesn't exist yet (will be created with schema above)
    // Ignore error - this is expected for existing databases
  }

  // Migration: Add ai_auto_reply column if it doesn't exist (for existing databases)
  try {
    db.run(`ALTER TABLE conversations ADD COLUMN ai_auto_reply INTEGER DEFAULT 1`);
    console.log('✅ Added ai_auto_reply column to conversations table');
  } catch (error: any) {
    // Column already exists or table doesn't exist yet (will be created with schema above)
    // Ignore error - this is expected for existing databases
  }

  saveDatabase();
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, data);
}

// Hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export interface Conciergerie {
  id: number;
  name: string;
  email: string;
  password: string;
  plaintext_password?: string;
  whatsapp_number?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  sandbox_join_code?: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  conciergerie_id: number;
  conciergerie_name?: string;
  phone_number: string;
  ai_auto_reply: number;
  created_at: string;
  last_message_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'client' | 'concierge';
  message: string;
  ai_suggestion: string | null;
  is_ai: number;
  created_at: string;
}

export interface FAQ {
  id: number;
  conciergerie_id: number;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureRequest {
  id: number;
  conciergerie_id: number | null;
  conciergerie_name?: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export const dbQueries = {
  // Conciergerie Management
  createConciergerie(name: string, email: string, password: string, whatsappNumber?: string, twilioSid?: string, twilioToken?: string): Conciergerie {
    const hashedPassword = hashPassword(password);
    db.run(
      'INSERT INTO conciergeries (name, email, password, whatsapp_number, twilio_account_sid, twilio_auth_token, plaintext_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, whatsappNumber || null, twilioSid || null, twilioToken || null, password]
    );
    saveDatabase();

    const result = db.exec('SELECT * FROM conciergeries WHERE email = ?', [email]);
    const row = result[0].values[0];

    return {
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      password: row[3] as string,
      whatsapp_number: row[4] as string | undefined,
      twilio_account_sid: row[5] as string | undefined,
      twilio_auth_token: row[6] as string | undefined,
      sandbox_join_code: row[7] as string | undefined,
      plaintext_password: row[8] as string | undefined,
      created_at: row[9] as string,
    };
  },

  loginConciergerie(email: string, password: string): Conciergerie | null {
    const hashedPassword = hashPassword(password);
    const result = db.exec('SELECT * FROM conciergeries WHERE email = ? AND password = ?', [email, hashedPassword]);

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      password: row[3] as string,
      whatsapp_number: row[4] as string | undefined,
      twilio_account_sid: row[5] as string | undefined,
      twilio_auth_token: row[6] as string | undefined,
      sandbox_join_code: row[7] as string | undefined,
      plaintext_password: row[8] as string | undefined,
      created_at: row[9] as string,
    };
  },

  getAllConciergeries(): Omit<Conciergerie, 'password' | 'twilio_auth_token'>[] {
    const result = db.exec('SELECT id, name, email, whatsapp_number, twilio_account_sid, sandbox_join_code, created_at FROM conciergeries ORDER BY name ASC');

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      whatsapp_number: row[3] as string | undefined,
      twilio_account_sid: row[4] as string | undefined,
      sandbox_join_code: row[5] as string | undefined,
      created_at: row[6] as string,
    }));
  },

  getAllConciegeriesWithSecrets(): Conciergerie[] {
    const result = db.exec('SELECT * FROM conciergeries ORDER BY name ASC');

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      password: row[3] as string,
      whatsapp_number: row[4] as string | undefined,
      twilio_account_sid: row[5] as string | undefined,
      twilio_auth_token: row[6] as string | undefined,
      sandbox_join_code: row[7] as string | undefined,
      plaintext_password: row[8] as string | undefined,
      created_at: row[9] as string,
    }));
  },

  getConciergerieByWhatsAppNumber(whatsappNumber: string): Conciergerie | null {
    const result = db.exec('SELECT * FROM conciergeries WHERE whatsapp_number = ?', [whatsappNumber]);

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      password: row[3] as string,
      whatsapp_number: row[4] as string | undefined,
      twilio_account_sid: row[5] as string | undefined,
      twilio_auth_token: row[6] as string | undefined,
      sandbox_join_code: row[7] as string | undefined,
      plaintext_password: row[8] as string | undefined,
      created_at: row[9] as string,
    };
  },

  updateConciergerieWhatsApp(id: number, whatsappNumber: string, twilioSid: string, twilioToken: string): void {
    db.run(
      'UPDATE conciergeries SET whatsapp_number = ?, twilio_account_sid = ?, twilio_auth_token = ? WHERE id = ?',
      [whatsappNumber, twilioSid, twilioToken, id]
    );
    saveDatabase();
  },

  updateConciergerie(id: number, name: string, email: string, password?: string): void {
    if (password) {
      const hashedPassword = hashPassword(password);
      console.log(`🔄 Updating conciergerie ${id}: setting plaintext_password to: ${password.substring(0, 3)}***`);
      db.run(
        'UPDATE conciergeries SET name = ?, email = ?, password = ?, plaintext_password = ? WHERE id = ?',
        [name, email, hashedPassword, password, id]
      );
      saveDatabase();
      
      // Verify the update
      const verify = db.exec('SELECT plaintext_password FROM conciergeries WHERE id = ?', [id]);
      if (verify.length > 0 && verify[0].values.length > 0) {
        const savedPassword = verify[0].values[0][0];
        console.log(`✅ Verified: plaintext_password saved as: ${savedPassword ? savedPassword.substring(0, 3) + '***' : 'NULL'}`);
      }
    } else {
      db.run(
        'UPDATE conciergeries SET name = ?, email = ? WHERE id = ?',
        [name, email, id]
      );
      saveDatabase();
    }
  },

  updateSandboxJoinCode(id: number, joinCode: string): void {
    db.run(
      'UPDATE conciergeries SET sandbox_join_code = ? WHERE id = ?',
      [joinCode, id]
    );
    saveDatabase();
  },

  deleteConciergerie(id: number): void {
    db.run('DELETE FROM conciergeries WHERE id = ?', [id]);
    saveDatabase();
  },

  getConciergerieById(id: number): Conciergerie | null {
    // Use explicit column order to avoid confusion
    const result = db.exec(`
      SELECT 
        id, name, email, password, 
        whatsapp_number, twilio_account_sid, twilio_auth_token, 
        sandbox_join_code, plaintext_password, created_at
      FROM conciergeries 
      WHERE id = ?
    `, [id]);

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    const conciergerie = {
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      password: row[3] as string,
      whatsapp_number: row[4] as string | undefined,
      twilio_account_sid: row[5] as string | undefined,
      twilio_auth_token: row[6] as string | undefined,
      sandbox_join_code: row[7] as string | undefined,
      plaintext_password: row[8] as string | undefined,
      created_at: row[9] as string,
    };
    
    console.log(`📋 getConciergerieById(${id}): plaintext_password = ${conciergerie.plaintext_password ? conciergerie.plaintext_password.substring(0, 5) + '***' : 'NULL'}, sandbox = ${conciergerie.sandbox_join_code || 'NULL'}`);
    
    return conciergerie;
  },

  // Get or create conversation (updated to include conciergerie_id)
  // Get conversation by ID (without routing filter - for internal use)
  getConversationById(conversationId: number): Conversation | null {
    const result = db.exec('SELECT * FROM conversations WHERE id = ?', [conversationId]);

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    // Column order in DB: id, conciergerie_id, phone_number, created_at, last_message_at, ai_auto_reply
    // So: row[0]=id, row[1]=conciergerie_id, row[2]=phone_number, row[3]=created_at, row[4]=last_message_at, row[5]=ai_auto_reply
    return {
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      phone_number: row[2] as string,
      ai_auto_reply: (row[5] as number) ?? 1, // ai_auto_reply is at index 5, default to 1 if null
      created_at: row[3] as string,
      last_message_at: row[4] as string,
    };
  },

  getOrCreateConversation(phoneNumber: string, conciergerieId: number): Conversation {
    let result = db.exec('SELECT * FROM conversations WHERE phone_number = ? AND conciergerie_id = ?', [phoneNumber, conciergerieId]);

    if (result.length === 0 || result[0].values.length === 0) {
      db.run(
        'INSERT INTO conversations (conciergerie_id, phone_number, ai_auto_reply, created_at, last_message_at) VALUES (?, ?, 1, datetime("now"), datetime("now"))',
        [conciergerieId, phoneNumber]
      );
      saveDatabase();
      result = db.exec('SELECT * FROM conversations WHERE phone_number = ? AND conciergerie_id = ?', [phoneNumber, conciergerieId]);
    }

    const row = result[0].values[0];
    // Column order in DB: id, conciergerie_id, phone_number, created_at, last_message_at, ai_auto_reply
    // So: row[0]=id, row[1]=conciergerie_id, row[2]=phone_number, row[3]=created_at, row[4]=last_message_at, row[5]=ai_auto_reply
    return {
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      phone_number: row[2] as string,
      ai_auto_reply: (row[5] as number) ?? 1, // ai_auto_reply is at index 5, default to 1 if null
      created_at: row[3] as string,
      last_message_at: row[4] as string,
    };
  },

  // Add message
  addMessage(conversationId: number, sender: 'client' | 'concierge', message: string, aiSuggestion: string | null = null, isAi: number = 0): Message {
    db.run(
      'INSERT INTO messages (conversation_id, sender, message, ai_suggestion, is_ai, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      [conversationId, sender, message, aiSuggestion, isAi]
    );

    // Update last_message_at
    db.run('UPDATE conversations SET last_message_at = datetime("now") WHERE id = ?', [conversationId]);

    saveDatabase();

    // Get the last inserted message for this conversation
    const result = db.exec(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1',
      [conversationId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('Failed to retrieve inserted message');
    }

    const row = result[0].values[0];
    
    // Column order in DB (after migration): id, conversation_id, sender, message, ai_suggestion, created_at, is_ai
    // So: row[0]=id, row[1]=conversation_id, row[2]=sender, row[3]=message, row[4]=ai_suggestion, row[5]=created_at, row[6]=is_ai

    return {
      id: row[0] as number,
      conversation_id: row[1] as number,
      sender: row[2] as 'client' | 'concierge',
      message: row[3] as string,
      ai_suggestion: row[4] as string | null,
      is_ai: (row[6] as number) || 0,  // is_ai is at index 6
      created_at: row[5] as string,   // created_at is at index 5
    };
  },

  // Get all conversations for a conciergerie (only show conversations with active routing)
  // Conversations are hidden if their phone number is not in phone_routing table
  getConversationsByConciergerie(conciergerieId: number): Array<Conversation & { last_message: string }> {
    const result = db.exec(`
      SELECT DISTINCT
        c.id,
        c.conciergerie_id,
        c.phone_number,
        c.ai_auto_reply,
        c.created_at,
        c.last_message_at,
        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      INNER JOIN phone_routing pr ON c.phone_number = pr.phone_number AND pr.conciergerie_id = c.conciergerie_id
      WHERE c.conciergerie_id = ?
      ORDER BY c.last_message_at DESC
    `, [conciergerieId]);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      phone_number: row[2] as string,
      ai_auto_reply: (row[3] as number) || 1,
      created_at: row[4] as string,
      last_message_at: row[5] as string,
      last_message: (row[6] as string) || '',
    }));
  },

  // Get ALL conversations (for admin) with conciergerie name (only show conversations with active routing)
  // Conversations are hidden if their phone number is not in phone_routing table
  getAllConversations(): Array<Conversation & { last_message: string }> {
    const result = db.exec(`
      SELECT DISTINCT
        c.id,
        c.conciergerie_id,
        c.phone_number,
        c.ai_auto_reply,
        c.created_at,
        c.last_message_at,
        co.name as conciergerie_name,
        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      INNER JOIN phone_routing pr ON c.phone_number = pr.phone_number AND pr.conciergerie_id = c.conciergerie_id
      LEFT JOIN conciergeries co ON c.conciergerie_id = co.id
      ORDER BY c.last_message_at DESC
    `);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      phone_number: row[2] as string,
      ai_auto_reply: (row[3] as number) || 1,
      created_at: row[4] as string,
      last_message_at: row[5] as string,
      conciergerie_name: row[6] as string,
      last_message: (row[7] as string) || '',
    }));
  },

  // Get messages for a conversation
  getMessages(conversationId: number): Message[] {
    const result = db.exec('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => {
      // Column order in DB: id, conversation_id, sender, message, ai_suggestion, created_at, is_ai
      // So: row[0]=id, row[1]=conversation_id, row[2]=sender, row[3]=message, row[4]=ai_suggestion, row[5]=created_at, row[6]=is_ai
      return {
        id: row[0] as number,
        conversation_id: row[1] as number,
        sender: row[2] as 'client' | 'concierge',
        message: row[3] as string,
        ai_suggestion: row[4] as string | null,
        is_ai: (row[6] as number) || 0,  // is_ai is at index 6
        created_at: row[5] as string,   // created_at is at index 5
      };
    });
  },

  // Get conversation history for AI context
  getConversationHistory(conversationId: number, limit: number = 10): Message[] {
    const result = db.exec(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?',
      [conversationId, limit]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => {
      // Column order in DB: id, conversation_id, sender, message, ai_suggestion, created_at, is_ai
      // So: row[0]=id, row[1]=conversation_id, row[2]=sender, row[3]=message, row[4]=ai_suggestion, row[5]=created_at, row[6]=is_ai
      return {
        id: row[0] as number,
        conversation_id: row[1] as number,
        sender: row[2] as 'client' | 'concierge',
        message: row[3] as string,
        ai_suggestion: row[4] as string | null,
        is_ai: (row[6] as number) || 0,  // is_ai is at index 6
        created_at: row[5] as string,   // created_at is at index 5
      };
    });
  },

  // Feature Requests Management
  getAllFeatureRequests(): FeatureRequest[] {
    const result = db.exec(`
      SELECT
        fr.id,
        fr.conciergerie_id,
        fr.title,
        fr.description,
        fr.status,
        fr.priority,
        fr.created_at,
        fr.updated_at,
        c.name as conciergerie_name
      FROM feature_requests fr
      LEFT JOIN conciergeries c ON fr.conciergerie_id = c.id
      ORDER BY fr.created_at DESC
    `);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      conciergerie_id: row[1] as number | null,
      title: row[2] as string,
      description: row[3] as string,
      status: row[4] as FeatureRequest['status'],
      priority: row[5] as FeatureRequest['priority'],
      created_at: row[6] as string,
      updated_at: row[7] as string,
      conciergerie_name: row[8] as string | undefined,
    }));
  },

  addFeatureRequest(title: string, description: string, priority: FeatureRequest['priority'] = 'medium', conciergerieId: number | null = null): FeatureRequest {
    try {
      db.run(
        'INSERT INTO feature_requests (conciergerie_id, title, description, priority, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
        [conciergerieId, title, description, priority]
      );

      // Get the last inserted ID BEFORE saveDatabase (in case saveDatabase causes issues)
      const lastIdResult = db.exec('SELECT last_insert_rowid()');
      if (lastIdResult.length === 0 || lastIdResult[0].values.length === 0) {
        throw new Error('Failed to get last insert ID');
      }
      const lastId = lastIdResult[0].values[0][0] as number;

      const result = db.exec(`
        SELECT
          fr.id,
          fr.conciergerie_id,
          fr.title,
          fr.description,
          fr.status,
          fr.priority,
          fr.created_at,
          fr.updated_at,
          c.name as conciergerie_name
        FROM feature_requests fr
        LEFT JOIN conciergeries c ON fr.conciergerie_id = c.id
        WHERE fr.id = ?
      `, [lastId]);

      if (result.length === 0 || result[0].values.length === 0) {
        console.error('Failed to retrieve inserted feature request. Last ID was:', lastId);
        // Try to get it without the JOIN to see if that's the issue
        const simpleResult = db.exec('SELECT * FROM feature_requests WHERE id = ?', [lastId]);
        if (simpleResult.length > 0 && simpleResult[0].values.length > 0) {
          const simpleRow = simpleResult[0].values[0];
          // Return without conciergerie_name if JOIN fails
          return {
            id: simpleRow[0] as number,
            conciergerie_id: simpleRow[1] as number | null,
            title: simpleRow[2] as string,
            description: simpleRow[3] as string,
            status: simpleRow[4] as FeatureRequest['status'],
            priority: simpleRow[5] as FeatureRequest['priority'],
            created_at: simpleRow[6] as string,
            updated_at: simpleRow[7] as string,
            conciergerie_name: undefined,
          };
        }
        throw new Error('Failed to retrieve inserted feature request');
      }

      const row = result[0].values[0];
      
      // Save database after successful retrieval
      saveDatabase();

      return {
        id: row[0] as number,
        conciergerie_id: row[1] as number | null,
        title: row[2] as string,
        description: row[3] as string,
        status: row[4] as FeatureRequest['status'],
        priority: row[5] as FeatureRequest['priority'],
        created_at: row[6] as string,
        updated_at: row[7] as string,
        conciergerie_name: row[8] as string | undefined,
      };
    } catch (error: any) {
      console.error('Error in addFeatureRequest:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        title,
        description,
        priority,
        conciergerieId
      });
      throw error;
    }
  },

  updateFeatureRequest(id: number, status: FeatureRequest['status']): void {
    db.run(
      'UPDATE feature_requests SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, id]
    );
    saveDatabase();
  },

  deleteFeatureRequest(id: number): void {
    db.run('DELETE FROM feature_requests WHERE id = ?', [id]);
    saveDatabase();
  },

  // FAQ Management
  getAllFAQs(): any[] {
    const result = db.exec(`
      SELECT f.*, c.name as conciergerie_name
      FROM faqs f
      LEFT JOIN conciergeries c ON f.conciergerie_id = c.id
      ORDER BY f.created_at DESC
    `);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      question: row[2] as string,
      answer: row[3] as string,
      created_at: row[4] as string,
      updated_at: row[5] as string,
      conciergerie_name: row[6] as string,
    }));
  },

  getFAQsByConciergerie(conciergerieId: number): FAQ[] {
    const result = db.exec('SELECT * FROM faqs WHERE conciergerie_id = ? ORDER BY created_at DESC', [conciergerieId]);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      question: row[2] as string,
      answer: row[3] as string,
      created_at: row[4] as string,
      updated_at: row[5] as string,
    }));
  },

  addFAQ(conciergerieId: number, question: string, answer: string): FAQ {
    db.run(
      'INSERT INTO faqs (conciergerie_id, question, answer, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
      [conciergerieId, question, answer]
    );
    saveDatabase();

    const result = db.exec('SELECT * FROM faqs WHERE conciergerie_id = ? ORDER BY id DESC LIMIT 1', [conciergerieId]);

    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('Failed to retrieve inserted FAQ');
    }

    const row = result[0].values[0];

    return {
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      question: row[2] as string,
      answer: row[3] as string,
      created_at: row[4] as string,
      updated_at: row[5] as string,
    };
  },

  updateFAQ(id: number, question: string, answer: string, conciergerieId?: number): void {
    if (conciergerieId !== undefined) {
      db.run(
        'UPDATE faqs SET question = ?, answer = ?, conciergerie_id = ?, updated_at = datetime("now") WHERE id = ?',
        [question, answer, conciergerieId, id]
      );
    } else {
      db.run(
        'UPDATE faqs SET question = ?, answer = ?, updated_at = datetime("now") WHERE id = ?',
        [question, answer, id]
      );
    }
    saveDatabase();
  },

  deleteFAQ(id: number): void {
    db.run('DELETE FROM faqs WHERE id = ?', [id]);
    saveDatabase();
  },

  // Phone Routing Management
  getConciergerieByPhone(phoneNumber: string): number | null {
    const result = db.exec('SELECT conciergerie_id FROM phone_routing WHERE phone_number = ?', [phoneNumber]);

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    return result[0].values[0][0] as number;
  },

  setPhoneRouting(phoneNumber: string, conciergerieId: number): void {
    // Check if routing already exists
    const existing = db.exec('SELECT id FROM phone_routing WHERE phone_number = ?', [phoneNumber]);

    if (existing.length > 0 && existing[0].values.length > 0) {
      // Update existing routing
      db.run('UPDATE phone_routing SET conciergerie_id = ? WHERE phone_number = ?', [conciergerieId, phoneNumber]);
    } else {
      // Insert new routing
      db.run(
        'INSERT INTO phone_routing (phone_number, conciergerie_id, created_at) VALUES (?, ?, datetime("now"))',
        [phoneNumber, conciergerieId]
      );
    }

    saveDatabase();
  },

  getAllPhoneRouting(): any[] {
    const result = db.exec(`
      SELECT pr.phone_number, pr.conciergerie_id, pr.created_at, c.name as conciergerie_name
      FROM phone_routing pr
      LEFT JOIN conciergeries c ON pr.conciergerie_id = c.id
      ORDER BY pr.created_at DESC
    `);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      phone_number: row[0] as string,
      conciergerie_id: row[1] as number,
      created_at: row[2] as string,
      conciergerie_name: row[3] as string,
    }));
  },

  deletePhoneRouting(phoneNumber: string): void {
    db.run('DELETE FROM phone_routing WHERE phone_number = ?', [phoneNumber]);
    saveDatabase();
  },

  // Delete all conversations and messages (reset history)
  deleteAllConversations(): void {
    // Delete all messages first (foreign key constraint)
    db.run('DELETE FROM messages');
    // Delete all conversations
    db.run('DELETE FROM conversations');
    // Also clear phone routing
    db.run('DELETE FROM phone_routing');
    saveDatabase();
    console.log('✅ All conversations, messages, and phone routing deleted');
  },

  // Update conversation ai_auto_reply setting
  updateConversationAutoReply(conversationId: number, aiAutoReply: number): void {
    db.run('UPDATE conversations SET ai_auto_reply = ? WHERE id = ?', [aiAutoReply, conversationId]);
    saveDatabase();
  },
};

// Initialize on module load
initDatabase();

export { initDatabase };
export default dbQueries;
