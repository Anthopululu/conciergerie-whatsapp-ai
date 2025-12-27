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

  // Drop existing tables if database file exists (migration)
  try {
    db.run('DROP TABLE IF EXISTS messages');
    db.run('DROP TABLE IF EXISTS faqs');
    db.run('DROP TABLE IF EXISTS feature_requests');
    db.run('DROP TABLE IF EXISTS conversations');
    db.run('DROP TABLE IF EXISTS conciergeries');
  } catch (e) {
    // Ignore errors
  }

  // Initialize schema
  db.run(`
    CREATE TABLE conciergeries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conciergerie_id INTEGER NOT NULL,
      phone_number TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id)
    );

    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      ai_suggestion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE TABLE feature_requests (
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

    CREATE TABLE faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conciergerie_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id)
    );

    CREATE INDEX idx_conversations_phone ON conversations(phone_number);
    CREATE INDEX idx_conversations_conciergerie ON conversations(conciergerie_id);
    CREATE INDEX idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX idx_feature_requests_status ON feature_requests(status);
    CREATE INDEX idx_feature_requests_conciergerie ON feature_requests(conciergerie_id);
    CREATE INDEX idx_faqs_conciergerie ON faqs(conciergerie_id);
  `);

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
  created_at: string;
}

export interface Conversation {
  id: number;
  conciergerie_id: number;
  conciergerie_name?: string;
  phone_number: string;
  created_at: string;
  last_message_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'client' | 'concierge';
  message: string;
  ai_suggestion: string | null;
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
  createConciergerie(name: string, email: string, password: string): Conciergerie {
    const hashedPassword = hashPassword(password);
    db.run(
      'INSERT INTO conciergeries (name, email, password, created_at) VALUES (?, ?, ?, datetime("now"))',
      [name, email, hashedPassword]
    );
    saveDatabase();

    const result = db.exec('SELECT * FROM conciergeries WHERE email = ?', [email]);
    const row = result[0].values[0];

    return {
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      password: row[3] as string,
      created_at: row[4] as string,
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
      created_at: row[4] as string,
    };
  },

  getAllConciergeries(): Omit<Conciergerie, 'password'>[] {
    const result = db.exec('SELECT id, name, email, created_at FROM conciergeries ORDER BY name ASC');

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      name: row[1] as string,
      email: row[2] as string,
      created_at: row[3] as string,
    }));
  },

  // Get or create conversation (updated to include conciergerie_id)
  getOrCreateConversation(phoneNumber: string, conciergerieId: number): Conversation {
    let result = db.exec('SELECT * FROM conversations WHERE phone_number = ? AND conciergerie_id = ?', [phoneNumber, conciergerieId]);

    if (result.length === 0 || result[0].values.length === 0) {
      db.run(
        'INSERT INTO conversations (conciergerie_id, phone_number, created_at, last_message_at) VALUES (?, ?, datetime("now"), datetime("now"))',
        [conciergerieId, phoneNumber]
      );
      saveDatabase();
      result = db.exec('SELECT * FROM conversations WHERE phone_number = ? AND conciergerie_id = ?', [phoneNumber, conciergerieId]);
    }

    const row = result[0].values[0];
    return {
      id: row[0] as number,
      conciergerie_id: row[1] as number,
      phone_number: row[2] as string,
      created_at: row[3] as string,
      last_message_at: row[4] as string,
    };
  },

  // Add message
  addMessage(conversationId: number, sender: 'client' | 'concierge', message: string, aiSuggestion: string | null = null): Message {
    db.run(
      'INSERT INTO messages (conversation_id, sender, message, ai_suggestion, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [conversationId, sender, message, aiSuggestion]
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

    return {
      id: row[0] as number,
      conversation_id: row[1] as number,
      sender: row[2] as 'client' | 'concierge',
      message: row[3] as string,
      ai_suggestion: row[4] as string | null,
      created_at: row[5] as string,
    };
  },

  // Get all conversations for a conciergerie
  getConversationsByConciergerie(conciergerieId: number): Array<Conversation & { last_message: string }> {
    const result = db.exec(`
      SELECT
        c.id,
        c.conciergerie_id,
        c.phone_number,
        c.created_at,
        c.last_message_at,
        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
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
      created_at: row[3] as string,
      last_message_at: row[4] as string,
      last_message: (row[5] as string) || '',
    }));
  },

  // Get ALL conversations (for admin) with conciergerie name
  getAllConversations(): Array<Conversation & { last_message: string }> {
    const result = db.exec(`
      SELECT
        c.id,
        c.conciergerie_id,
        c.phone_number,
        c.created_at,
        c.last_message_at,
        co.name as conciergerie_name,
        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
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
      created_at: row[3] as string,
      last_message_at: row[4] as string,
      conciergerie_name: row[5] as string,
      last_message: (row[6] as string) || '',
    }));
  },

  // Get messages for a conversation
  getMessages(conversationId: number): Message[] {
    const result = db.exec('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      conversation_id: row[1] as number,
      sender: row[2] as 'client' | 'concierge',
      message: row[3] as string,
      ai_suggestion: row[4] as string | null,
      created_at: row[5] as string,
    }));
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

    return result[0].values.map((row: any) => ({
      id: row[0] as number,
      conversation_id: row[1] as number,
      sender: row[2] as 'client' | 'concierge',
      message: row[3] as string,
      ai_suggestion: row[4] as string | null,
      created_at: row[5] as string,
    }));
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
    db.run(
      'INSERT INTO feature_requests (conciergerie_id, title, description, priority, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
      [conciergerieId, title, description, priority]
    );

    saveDatabase();

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
      ORDER BY id DESC LIMIT 1
    `);

    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('Failed to retrieve inserted feature request');
    }

    const row = result[0].values[0];

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

  updateFAQ(id: number, question: string, answer: string): void {
    db.run(
      'UPDATE faqs SET question = ?, answer = ?, updated_at = datetime("now") WHERE id = ?',
      [question, answer, id]
    );
    saveDatabase();
  },

  deleteFAQ(id: number): void {
    db.run('DELETE FROM faqs WHERE id = ?', [id]);
    saveDatabase();
  }
};

// Initialize on module load
initDatabase();

export { initDatabase };
