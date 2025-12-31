import { Pool, QueryResult } from 'pg';
import * as crypto from 'crypto';

let pool: Pool | null = null;

// Initialize PostgreSQL connection
async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL database');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }

  // Initialize schema
  await createSchema();
}

// Create all tables if they don't exist
async function createSchema() {
  if (!pool) throw new Error('Database not initialized');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create conciergeries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conciergeries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        whatsapp_number TEXT,
        twilio_account_sid TEXT,
        twilio_auth_token TEXT,
        sandbox_join_code TEXT,
        plaintext_password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        conciergerie_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        ai_auto_reply INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id) ON DELETE CASCADE
      )
    `);

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        ai_suggestion TEXT,
        is_ai INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Create feature_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feature_requests (
        id SERIAL PRIMARY KEY,
        conciergerie_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id) ON DELETE SET NULL
      )
    `);

    // Create faqs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        conciergerie_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id) ON DELETE CASCADE
      )
    `);

    // Create phone_routing table
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_routing (
        id SERIAL PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        conciergerie_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id) ON DELETE CASCADE
      )
    `);

    // Create response_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS response_templates (
        id SERIAL PRIMARY KEY,
        conciergerie_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conciergerie_id) REFERENCES conciergeries(id) ON DELETE CASCADE
      )
    `);

    // Create conversation_tags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_tags (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        UNIQUE(conversation_id, tag)
      )
    `);

    // Create conversation_notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_notes (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_conciergerie ON conversations(conciergerie_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_requests_conciergerie ON feature_requests(conciergerie_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_faqs_conciergerie ON faqs(conciergerie_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_routing_phone ON phone_routing(phone_number)
    `);

    // Add is_ai column if it doesn't exist (migration)
    try {
      await client.query(`ALTER TABLE messages ADD COLUMN is_ai INTEGER DEFAULT 0`);
      console.log('✅ Added is_ai column to messages table');
    } catch (error: any) {
      // Column already exists, ignore
    }

    // Add ai_auto_reply column if it doesn't exist (migration)
    try {
      await client.query(`ALTER TABLE conversations ADD COLUMN ai_auto_reply INTEGER DEFAULT 1`);
      console.log('✅ Added ai_auto_reply column to conversations table');
    } catch (error: any) {
      // Column already exists, check if it's the wrong type and fix it
      try {
        // Check the actual type of the column
        const typeCheck = await client.query(`
          SELECT data_type, column_name
          FROM information_schema.columns 
          WHERE table_name = 'conversations' AND column_name = 'ai_auto_reply'
        `);
        
        if (typeCheck.rows.length > 0) {
          const actualType = typeCheck.rows[0].data_type;
          console.log(`🔍 ai_auto_reply column exists with type: ${actualType}`);
          
          if (actualType !== 'integer' && actualType !== 'bigint' && actualType !== 'smallint') {
            console.log(`⚠️  ai_auto_reply column is type ${actualType} (not integer), fixing...`);
            // Drop and recreate the column with correct type
            await client.query(`ALTER TABLE conversations DROP COLUMN ai_auto_reply`);
            await client.query(`ALTER TABLE conversations ADD COLUMN ai_auto_reply INTEGER DEFAULT 1`);
            // Update all existing rows to have ai_auto_reply = 1
            await client.query(`UPDATE conversations SET ai_auto_reply = 1 WHERE ai_auto_reply IS NULL`);
            console.log('✅ Fixed ai_auto_reply column type to INTEGER');
          } else {
            console.log('✅ ai_auto_reply column type is correct (integer)');
          }
        } else {
          console.log('⚠️  ai_auto_reply column not found in information_schema, but ALTER TABLE failed');
        }
      } catch (fixError: any) {
        console.log('⚠️  Could not check/fix ai_auto_reply column type:', fixError.message);
      }
    }

    await client.query('COMMIT');
    console.log('✅ PostgreSQL schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Export interfaces (same as SQLite version)
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
  ai_suggestion?: string;
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
  conciergerie_id?: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: number;
  conciergerie_id: number;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  conversation_id: number;
  tag: string;
  created_at: string;
}

export interface ConversationNote {
  id: number;
  conversation_id: number;
  note: string;
  created_at: string;
}

// Database queries implementation for PostgreSQL
export const dbQueries = {
  // Initialize database
  async init() {
    await initDatabase();
  },

  // Conciergeries
  createConciergerie(name: string, email: string, password: string): Conciergerie {
    if (!pool) throw new Error('Database not initialized');
    
    const hashedPassword = hashPassword(password);
    const result = pool.query(
      `INSERT INTO conciergeries (name, email, password, plaintext_password) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, password, plaintext_password, whatsapp_number, 
                 twilio_account_sid, twilio_auth_token, sandbox_join_code, created_at`,
      [name, email, hashedPassword, password]
    );
    
    // Note: This is synchronous in SQLite but async in PostgreSQL
    // We'll need to make this async or use a different pattern
    throw new Error('Use async version: createConciergerieAsync');
  },

  async createConciergerieAsync(name: string, email: string, password: string): Promise<Conciergerie> {
    if (!pool) throw new Error('Database not initialized');
    
    const hashedPassword = hashPassword(password);
    const result = await pool.query(
      `INSERT INTO conciergeries (name, email, password, plaintext_password) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, password, plaintext_password, whatsapp_number, 
                 twilio_account_sid, twilio_auth_token, sandbox_join_code, created_at`,
      [name, email, hashedPassword, password]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      plaintext_password: row.plaintext_password,
      whatsapp_number: row.whatsapp_number,
      twilio_account_sid: row.twilio_account_sid,
      twilio_auth_token: row.twilio_auth_token,
      sandbox_join_code: row.sandbox_join_code,
      created_at: row.created_at,
    };
  },

  getConciergerieByEmail(email: string): Conciergerie | null {
    if (!pool) throw new Error('Database not initialized');
    throw new Error('Use async version: getConciergerieByEmailAsync');
  },

  async getConciergerieByEmailAsync(email: string): Promise<Conciergerie | null> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, name, email, password, plaintext_password, whatsapp_number, 
              twilio_account_sid, twilio_auth_token, sandbox_join_code, created_at
       FROM conciergeries WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      plaintext_password: row.plaintext_password,
      whatsapp_number: row.whatsapp_number,
      twilio_account_sid: row.twilio_account_sid,
      twilio_auth_token: row.twilio_auth_token,
      sandbox_join_code: row.sandbox_join_code,
      created_at: row.created_at,
    };
  },

  getConciergerieById(id: number): Conciergerie | null {
    throw new Error('Use async version: getConciergerieByIdAsync');
  },

  async getConciergerieByIdAsync(id: number): Promise<Conciergerie | null> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, name, email, password, plaintext_password, whatsapp_number, 
              twilio_account_sid, twilio_auth_token, sandbox_join_code, created_at
       FROM conciergeries WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      plaintext_password: row.plaintext_password,
      whatsapp_number: row.whatsapp_number,
      twilio_account_sid: row.twilio_account_sid,
      twilio_auth_token: row.twilio_auth_token,
      sandbox_join_code: row.sandbox_join_code,
      created_at: row.created_at,
    };
  },

  async getConciergerieByWhatsAppNumberAsync(whatsappNumber: string): Promise<Conciergerie | null> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, name, email, password, plaintext_password, whatsapp_number, 
              twilio_account_sid, twilio_auth_token, sandbox_join_code, created_at
       FROM conciergeries WHERE whatsapp_number = $1`,
      [whatsappNumber]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      plaintext_password: row.plaintext_password,
      whatsapp_number: row.whatsapp_number,
      twilio_account_sid: row.twilio_account_sid,
      twilio_auth_token: row.twilio_auth_token,
      sandbox_join_code: row.sandbox_join_code,
      created_at: row.created_at,
    };
  },

  getAllConciergeries(): Conciergerie[] {
    throw new Error('Use async version: getAllConciergeriesAsync');
  },

  async getAllConciergeriesAsync(): Promise<Conciergerie[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, name, email, password, plaintext_password, whatsapp_number, 
              twilio_account_sid, twilio_auth_token, sandbox_join_code, created_at
       FROM conciergeries ORDER BY created_at DESC`
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      plaintext_password: row.plaintext_password,
      whatsapp_number: row.whatsapp_number,
      twilio_account_sid: row.twilio_account_sid,
      twilio_auth_token: row.twilio_auth_token,
      sandbox_join_code: row.sandbox_join_code,
      created_at: row.created_at,
    }));
  },

  getAllConciegeriesWithSecrets(): Conciergerie[] {
    // Same as getAllConciergeries for PostgreSQL (no filtering needed)
    throw new Error('Use async version: getAllConciegeriesWithSecretsAsync');
  },

  async getAllConciegeriesWithSecretsAsync(): Promise<Conciergerie[]> {
    return this.getAllConciergeriesAsync();
  },

  updateConciergerie(id: number, updates: Partial<Conciergerie>): void {
    throw new Error('Use async version: updateConciergerieAsync');
  },

  async updateConciergerieAsync(id: number, updates: Partial<Conciergerie>): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.password !== undefined) {
      fields.push(`password = $${paramIndex++}`);
      values.push(hashPassword(updates.password));
    }
    if (updates.whatsapp_number !== undefined) {
      fields.push(`whatsapp_number = $${paramIndex++}`);
      values.push(updates.whatsapp_number);
    }
    if (updates.twilio_account_sid !== undefined) {
      fields.push(`twilio_account_sid = $${paramIndex++}`);
      values.push(updates.twilio_account_sid);
    }
    if (updates.twilio_auth_token !== undefined) {
      fields.push(`twilio_auth_token = $${paramIndex++}`);
      values.push(updates.twilio_auth_token);
    }
    if (updates.sandbox_join_code !== undefined) {
      fields.push(`sandbox_join_code = $${paramIndex++}`);
      values.push(updates.sandbox_join_code);
    }

    if (fields.length === 0) return;

    values.push(id);
    await pool.query(
      `UPDATE conciergeries SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  },

  deleteConciergerie(id: number): void {
    throw new Error('Use async version: deleteConciergerieAsync');
  },

  async deleteConciergerieAsync(id: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query('DELETE FROM conciergeries WHERE id = $1', [id]);
  },

  // Conversations
  getOrCreateConversation(phoneNumber: string, conciergerieId: number): Conversation {
    throw new Error('Use async version: getOrCreateConversationAsync');
  },

  async getOrCreateConversationAsync(phoneNumber: string, conciergerieId: number): Promise<Conversation> {
    if (!pool) throw new Error('Database not initialized');
    
    // Try to get existing conversation
    // FIX: Force INTEGER - if column is TIMESTAMP, use 1 as default
    let result = await pool.query(
      `SELECT 
         c.id, 
         c.conciergerie_id, 
         c.phone_number, 
         CASE 
           WHEN pg_typeof(c.ai_auto_reply)::text = 'integer' THEN COALESCE(c.ai_auto_reply, 1)
           WHEN pg_typeof(c.ai_auto_reply)::text = 'bigint' THEN COALESCE(c.ai_auto_reply, 1)::integer
           WHEN pg_typeof(c.ai_auto_reply)::text = 'smallint' THEN COALESCE(c.ai_auto_reply, 1)::integer
           ELSE 1
         END::INTEGER as ai_auto_reply,
         c.created_at, 
         c.last_message_at, 
         co.name as conciergerie_name
       FROM conversations c
       LEFT JOIN conciergeries co ON c.conciergerie_id = co.id
       WHERE c.phone_number = $1 AND c.conciergerie_id = $2
       ORDER BY c.last_message_at DESC
       LIMIT 1`,
      [phoneNumber, conciergerieId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Debug: log all row properties to see what we're getting
      console.log(`🔍 getOrCreateConversationAsync DEBUG: row keys=${Object.keys(row)}, ai_auto_reply=${row.ai_auto_reply}, type=${typeof row.ai_auto_reply}, created_at=${row.created_at}, last_message_at=${row.last_message_at}`);
      // Ensure ai_auto_reply is an integer (0 or 1), not a date string
      const aiAutoReply = typeof row.ai_auto_reply === 'number' 
        ? row.ai_auto_reply 
        : (row.ai_auto_reply === '1' || row.ai_auto_reply === 1 || row.ai_auto_reply === true) 
          ? 1 
          : (row.ai_auto_reply === '0' || row.ai_auto_reply === 0 || row.ai_auto_reply === false) 
            ? 0 
            : 1; // Default to 1 if null or invalid
      console.log(`🔍 getOrCreateConversationAsync: ai_auto_reply raw=${row.ai_auto_reply}, type=${typeof row.ai_auto_reply}, converted=${aiAutoReply}`);
      return {
        id: row.id,
        conciergerie_id: row.conciergerie_id,
        conciergerie_name: row.conciergerie_name,
        phone_number: row.phone_number,
        ai_auto_reply: aiAutoReply,
        created_at: row.created_at,
        last_message_at: row.last_message_at,
      };
    }

    // Create new conversation
    result = await pool.query(
      `INSERT INTO conversations (phone_number, conciergerie_id, ai_auto_reply)
       VALUES ($1, $2, 1)
       RETURNING id, conciergerie_id, phone_number, ai_auto_reply, created_at, last_message_at`,
      [phoneNumber, conciergerieId]
    );

    const row = result.rows[0];
    // FIX: Ensure ai_auto_reply is an integer (0 or 1)
    const aiAutoReply = typeof row.ai_auto_reply === 'number' 
      ? (row.ai_auto_reply === 0 ? 0 : 1)
      : 1;
    return {
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      phone_number: row.phone_number,
      ai_auto_reply: aiAutoReply,
      created_at: row.created_at,
      last_message_at: row.last_message_at,
    };
  },

  getConversationById(id: number): Conversation | null {
    throw new Error('Use async version: getConversationByIdAsync');
  },

  async getConversationByIdAsync(id: number): Promise<Conversation | null> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT 
         c.id, 
         c.conciergerie_id, 
         c.phone_number, 
         CASE 
           WHEN pg_typeof(c.ai_auto_reply)::text = 'integer' THEN COALESCE(c.ai_auto_reply, 1)
           WHEN pg_typeof(c.ai_auto_reply)::text = 'bigint' THEN COALESCE(c.ai_auto_reply, 1)::integer
           WHEN pg_typeof(c.ai_auto_reply)::text = 'smallint' THEN COALESCE(c.ai_auto_reply, 1)::integer
           ELSE 1
         END::INTEGER as ai_auto_reply,
         c.created_at, 
         c.last_message_at, 
         co.name as conciergerie_name
       FROM conversations c
       LEFT JOIN conciergeries co ON c.conciergerie_id = co.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    // FIX: Force ai_auto_reply to be an integer (0 or 1)
    // Handle all possible types that PostgreSQL might return
    let aiAutoReply: number;
    const rawAiAutoReply = row.ai_auto_reply;
    
    if (typeof rawAiAutoReply === 'number') {
      aiAutoReply = rawAiAutoReply === 0 ? 0 : 1;
    } else if (typeof rawAiAutoReply === 'string') {
      // If it's a date string or other string, default to 1
      if (rawAiAutoReply.includes('-') && rawAiAutoReply.includes(':')) {
        console.log(`⚠️  getConversationByIdAsync: ai_auto_reply is date string "${rawAiAutoReply}", converting to 1`);
        aiAutoReply = 1;
      } else {
        const parsed = parseInt(rawAiAutoReply, 10);
        aiAutoReply = isNaN(parsed) ? 1 : (parsed === 0 ? 0 : 1);
      }
    } else {
      console.log(`⚠️  getConversationByIdAsync: ai_auto_reply is ${rawAiAutoReply} (type: ${typeof rawAiAutoReply}), defaulting to 1`);
      aiAutoReply = 1;
    }
    
    console.log(`✅ getConversationByIdAsync: ai_auto_reply=${rawAiAutoReply} -> ${aiAutoReply}`);
    return {
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      conciergerie_name: row.conciergerie_name,
      phone_number: row.phone_number,
      ai_auto_reply: aiAutoReply,
      created_at: row.created_at,
      last_message_at: row.last_message_at,
    };
  },

  getConversationsByConciergerie(conciergerieId: number): Conversation[] {
    throw new Error('Use async version: getConversationsByConciergerieAsync');
  },

  async getConversationsByConciergerieAsync(conciergerieId: number): Promise<Conversation[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT c.id, c.conciergerie_id, c.phone_number, 
              COALESCE(c.ai_auto_reply, 1)::INTEGER as ai_auto_reply,
              c.created_at, c.last_message_at, co.name as conciergerie_name
       FROM conversations c
       LEFT JOIN conciergeries co ON c.conciergerie_id = co.id
       WHERE c.conciergerie_id = $1
       ORDER BY c.last_message_at DESC`,
      [conciergerieId]
    );

    return result.rows.map(row => {
      // Ensure ai_auto_reply is an integer (0 or 1), not a date string
      const aiAutoReply = typeof row.ai_auto_reply === 'number' 
        ? row.ai_auto_reply 
        : (row.ai_auto_reply === '1' || row.ai_auto_reply === 1 || row.ai_auto_reply === true) 
          ? 1 
          : (row.ai_auto_reply === '0' || row.ai_auto_reply === 0 || row.ai_auto_reply === false) 
            ? 0 
            : 1; // Default to 1 if null or invalid
      return {
        id: row.id,
        conciergerie_id: row.conciergerie_id,
        conciergerie_name: row.conciergerie_name,
        phone_number: row.phone_number,
        ai_auto_reply: aiAutoReply,
        created_at: row.created_at,
        last_message_at: row.last_message_at,
      };
    });
  },

  getAllConversations(): Conversation[] {
    throw new Error('Use async version: getAllConversationsAsync');
  },

  async getAllConversationsAsync(): Promise<Conversation[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT c.id, c.conciergerie_id, c.phone_number, 
              COALESCE(c.ai_auto_reply, 1)::INTEGER as ai_auto_reply,
              c.created_at, c.last_message_at, co.name as conciergerie_name
       FROM conversations c
       LEFT JOIN conciergeries co ON c.conciergerie_id = co.id
       ORDER BY c.last_message_at DESC`
    );

    return result.rows.map(row => {
      // Ensure ai_auto_reply is an integer (0 or 1), not a date string
      const aiAutoReply = typeof row.ai_auto_reply === 'number' 
        ? row.ai_auto_reply 
        : (row.ai_auto_reply === '1' || row.ai_auto_reply === 1 || row.ai_auto_reply === true) 
          ? 1 
          : (row.ai_auto_reply === '0' || row.ai_auto_reply === 0 || row.ai_auto_reply === false) 
            ? 0 
            : 1; // Default to 1 if null or invalid
      return {
        id: row.id,
        conciergerie_id: row.conciergerie_id,
        conciergerie_name: row.conciergerie_name,
        phone_number: row.phone_number,
        ai_auto_reply: aiAutoReply,
        created_at: row.created_at,
        last_message_at: row.last_message_at,
      };
    });
  },

  updateConversationAutoReply(conversationId: number, autoReply: number): void {
    throw new Error('Use async version: updateConversationAutoReplyAsync');
  },

  async updateConversationAutoReplyAsync(conversationId: number, autoReply: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query(
      'UPDATE conversations SET ai_auto_reply = $1 WHERE id = $2',
      [autoReply, conversationId]
    );
  },

  // Messages
  addMessage(
    conversationId: number,
    message: string,
    sender: 'client' | 'concierge',
    phoneNumber?: string,
    aiSuggestion?: string,
    isAi: number = 0
  ): Message {
    throw new Error('Use async version: addMessageAsync');
  },

  async addMessageAsync(
    conversationId: number,
    message: string,
    sender: 'client' | 'concierge',
    phoneNumber?: string,
    aiSuggestion?: string,
    isAi: number = 0
  ): Promise<Message> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender, message, ai_suggestion, is_ai)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, conversation_id, sender, message, ai_suggestion, is_ai, created_at`,
      [conversationId, sender, message, aiSuggestion || null, isAi]
    );

    // Update conversation's last_message_at
    await pool.query(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender: row.sender,
      message: row.message,
      ai_suggestion: row.ai_suggestion,
      is_ai: row.is_ai,
      created_at: row.created_at,
    };
  },

  getMessages(conversationId: number): Message[] {
    throw new Error('Use async version: getMessagesAsync');
  },

  async getMessagesAsync(conversationId: number): Promise<Message[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, conversation_id, sender, message, ai_suggestion, is_ai, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender: row.sender,
      message: row.message,
      ai_suggestion: row.ai_suggestion,
      is_ai: row.is_ai,
      created_at: row.created_at,
    }));
  },

  getConversationHistory(conversationId: number, limit: number = 50): Message[] {
    throw new Error('Use async version: getConversationHistoryAsync');
  },

  async getConversationHistoryAsync(conversationId: number, limit: number = 50): Promise<Message[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, conversation_id, sender, message, ai_suggestion, is_ai, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [conversationId, limit]
    );

    return result.rows.reverse().map(row => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender: row.sender,
      message: row.message,
      ai_suggestion: row.ai_suggestion,
      is_ai: row.is_ai,
      created_at: row.created_at,
    }));
  },

  // FAQs
  addFAQ(conciergerieId: number, question: string, answer: string): FAQ {
    throw new Error('Use async version: addFAQAsync');
  },

  async addFAQAsync(conciergerieId: number, question: string, answer: string): Promise<FAQ> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `INSERT INTO faqs (conciergerie_id, question, answer)
       VALUES ($1, $2, $3)
       RETURNING id, conciergerie_id, question, answer, created_at, updated_at`,
      [conciergerieId, question, answer]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      question: row.question,
      answer: row.answer,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  getFAQsByConciergerie(conciergerieId: number): FAQ[] {
    throw new Error('Use async version: getFAQsByConciergerieAsync');
  },

  async getFAQsByConciergerieAsync(conciergerieId: number): Promise<FAQ[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, conciergerie_id, question, answer, created_at, updated_at
       FROM faqs
       WHERE conciergerie_id = $1
       ORDER BY created_at DESC`,
      [conciergerieId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      question: row.question,
      answer: row.answer,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  updateFAQ(id: number, question: string, answer: string): void {
    throw new Error('Use async version: updateFAQAsync');
  },

  async updateFAQAsync(id: number, question: string, answer: string): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query(
      'UPDATE faqs SET question = $1, answer = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [question, answer, id]
    );
  },

  deleteFAQ(id: number): void {
    throw new Error('Use async version: deleteFAQAsync');
  },

  async deleteFAQAsync(id: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query('DELETE FROM faqs WHERE id = $1', [id]);
  },

  // Phone routing
  setPhoneRouting(phoneNumber: string, conciergerieId: number): void {
    throw new Error('Use async version: setPhoneRoutingAsync');
  },

  async setPhoneRoutingAsync(phoneNumber: string, conciergerieId: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query(
      `INSERT INTO phone_routing (phone_number, conciergerie_id)
       VALUES ($1, $2)
       ON CONFLICT (phone_number) DO UPDATE SET conciergerie_id = $2`,
      [phoneNumber, conciergerieId]
    );
  },

  getPhoneRouting(phoneNumber: string): number | null {
    throw new Error('Use async version: getPhoneRoutingAsync');
  },

  async getPhoneRoutingAsync(phoneNumber: string): Promise<number | null> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      'SELECT conciergerie_id FROM phone_routing WHERE phone_number = $1',
      [phoneNumber]
    );

    return result.rows.length > 0 ? result.rows[0].conciergerie_id : null;
  },

  // Alias for getPhoneRouting (used in server.ts)
  async getConciergerieByPhoneAsync(phoneNumber: string): Promise<number | null> {
    return this.getPhoneRoutingAsync(phoneNumber);
  },

  getAllPhoneRouting(): any[] {
    throw new Error('Use async version: getAllPhoneRoutingAsync');
  },

  async getAllPhoneRoutingAsync(): Promise<any[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT pr.id, pr.phone_number, pr.conciergerie_id, pr.created_at, co.name as conciergerie_name
       FROM phone_routing pr
       LEFT JOIN conciergeries co ON pr.conciergerie_id = co.id
       ORDER BY pr.created_at DESC`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      phone_number: row.phone_number,
      conciergerie_id: row.conciergerie_id,
      created_at: row.created_at,
      conciergerie_name: row.conciergerie_name,
    }));
  },

  // Feature requests
  addFeatureRequest(conciergerieId: number | null, title: string, description: string): FeatureRequest {
    throw new Error('Use async version: addFeatureRequestAsync');
  },

  async addFeatureRequestAsync(conciergerieId: number | null, title: string, description: string): Promise<FeatureRequest> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `INSERT INTO feature_requests (conciergerie_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING id, conciergerie_id, title, description, status, priority, created_at, updated_at`,
      [conciergerieId, title, description]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  getAllFeatureRequests(): FeatureRequest[] {
    throw new Error('Use async version: getAllFeatureRequestsAsync');
  },

  async getAllFeatureRequestsAsync(): Promise<FeatureRequest[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, conciergerie_id, title, description, status, priority, created_at, updated_at
       FROM feature_requests
       ORDER BY created_at DESC`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  updateFeatureRequest(id: number, status: string): void {
    throw new Error('Use async version: updateFeatureRequestAsync');
  },

  async updateFeatureRequestAsync(id: number, status: string): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query(
      'UPDATE feature_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
  },

  deleteFeatureRequest(id: number): void {
    throw new Error('Use async version: deleteFeatureRequestAsync');
  },

  async deleteFeatureRequestAsync(id: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query('DELETE FROM feature_requests WHERE id = $1', [id]);
  },

  // Templates
  async addTemplateAsync(conciergerieId: number, name: string, content: string): Promise<Template> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `INSERT INTO response_templates (conciergerie_id, name, content)
       VALUES ($1, $2, $3)
       RETURNING id, conciergerie_id, name, content, created_at, updated_at`,
      [conciergerieId, name, content]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      name: row.name,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  async getTemplatesByConciergerieAsync(conciergerieId: number): Promise<Template[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `SELECT id, conciergerie_id, name, content, created_at, updated_at
       FROM response_templates
       WHERE conciergerie_id = $1
       ORDER BY created_at DESC`,
      [conciergerieId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      conciergerie_id: row.conciergerie_id,
      name: row.name,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  async updateTemplateAsync(id: number, name: string, content: string): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query(
      'UPDATE response_templates SET name = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, content, id]
    );
  },

  async deleteTemplateAsync(id: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query('DELETE FROM response_templates WHERE id = $1', [id]);
  },

  // Tags
  async addTagAsync(conversationId: number, tag: string): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query(
      'INSERT INTO conversation_tags (conversation_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [conversationId, tag]
    );
  },

  async removeConversationTagAsync(conversationId: number, tagId: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query('DELETE FROM conversation_tags WHERE id = $1', [tagId]);
  },

  async getConversationTagsAsync(conversationId: number): Promise<Tag[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      'SELECT id, conversation_id, tag, created_at FROM conversation_tags WHERE conversation_id = $1 ORDER BY created_at DESC',
      [conversationId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      tag: row.tag,
      created_at: row.created_at,
    }));
  },

  // Notes
  async addConversationNoteAsync(conversationId: number, note: string): Promise<ConversationNote> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      `INSERT INTO conversation_notes (conversation_id, note)
       VALUES ($1, $2)
       RETURNING id, conversation_id, note, created_at`,
      [conversationId, note]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      note: row.note,
      created_at: row.created_at,
    };
  },

  async getConversationNotesAsync(conversationId: number): Promise<ConversationNote[]> {
    if (!pool) throw new Error('Database not initialized');
    
    const result = await pool.query(
      'SELECT id, conversation_id, note, created_at FROM conversation_notes WHERE conversation_id = $1 ORDER BY created_at DESC',
      [conversationId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      note: row.note,
      created_at: row.created_at,
    }));
  },

  async deleteConversationNoteAsync(noteId: number): Promise<void> {
    if (!pool) throw new Error('Database not initialized');
    await pool.query('DELETE FROM conversation_notes WHERE id = $1', [noteId]);
  },

  // Statistics
  async getStatisticsAsync(conciergerieId?: number): Promise<any> {
    if (!pool) throw new Error('Database not initialized');
    
    const conciergerieFilter = conciergerieId ? 'WHERE c.conciergerie_id = $1' : '';
    const params = conciergerieId ? [conciergerieId] : [];

    // Total conversations
    const conversationsResult = await pool.query(
      `SELECT COUNT(*) as count FROM conversations c ${conciergerieFilter}`,
      params
    );
    const totalConversations = parseInt(conversationsResult.rows[0].count);

    // Total messages
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as count FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       ${conciergerieFilter}`,
      params
    );
    const totalMessages = parseInt(messagesResult.rows[0].count);

    // AI vs Human messages
    const aiMessagesResult = await pool.query(
      `SELECT COUNT(*) as count FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       ${conciergerieFilter} AND m.is_ai = 1`,
      params
    );
    const aiMessages = parseInt(aiMessagesResult.rows[0].count);
    const humanMessages = totalMessages - aiMessages;

    // Average response time (simplified - would need more complex logic)
    const avgResponseResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) as avg_seconds
       FROM messages m1
       JOIN messages m2 ON m1.conversation_id = m2.conversation_id
       JOIN conversations c ON m1.conversation_id = c.id
       WHERE m1.sender = 'client' AND m2.sender = 'concierge'
       AND m2.created_at > m1.created_at
       ${conciergerieFilter ? 'AND c.conciergerie_id = $1' : ''}
       LIMIT 1000`,
      params
    );
    const avgResponseSeconds = avgResponseResult.rows[0]?.avg_seconds || 0;

    return {
      totalConversations,
      totalMessages,
      aiMessages,
      humanMessages,
      averageResponseTime: Math.round(avgResponseSeconds),
    };
  },
};

