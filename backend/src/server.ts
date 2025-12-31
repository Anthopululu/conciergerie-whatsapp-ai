import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before importing other modules
// Try backend/.env first, then root .env as fallback
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { dbQueries, Conciergerie, initDatabase } from './database';
import { dbQueries as dbQueriesPostgres, initDatabase as initDatabasePostgres } from './database-postgres';
import { generateAISuggestion, initClaude } from './claude';
import { sendWhatsAppMessage, initTwilio, twilioClients } from './twilio';

// Check if we're using PostgreSQL
const USE_POSTGRES = !!process.env.DATABASE_URL;
console.log(`🔧 DATABASE_URL is ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'} -> USE_POSTGRES = ${USE_POSTGRES}`);

// Initialize services with loaded environment variables
initClaude();
initTwilio();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simple in-memory session storage (tokens)
const sessions: Map<string, { conciergerieId: number; email: string }> = new Map();
const adminSessions: Map<string, { email: string }> = new Map();

// Generate session token
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Health check
// Health check endpoint for production monitoring
app.get('/health', (req: Request, res: Response) => {
  try {
    // Vérifier que la base de données est accessible
    const conciergeries = dbQueries.getAllConciergeries();
    
    // Vérifier que la base de données répond
    if (!conciergeries || conciergeries.length === undefined) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint to check WhatsApp configuration
app.get('/api/test/whatsapp-config', (_req: Request, res: Response) => {
  try {
    const conciergeries = dbQueries.getAllConciegeriesWithSecrets();
    const configStatus = conciergeries.map((c: any) => ({
      id: c.id,
      name: c.name,
      hasWhatsAppNumber: !!c.whatsapp_number,
      hasAccountSid: !!c.twilio_account_sid,
      hasAuthToken: !!c.twilio_auth_token,
      twilioClientInitialized: twilioClients.has(c.id),
      whatsappNumber: c.whatsapp_number || 'Non configuré'
    }));
    
    res.json({
      status: 'ok',
      conciergeries: configStatus,
      totalConciergeries: conciergeries.length,
      initializedClients: Array.from(twilioClients.keys())
    });
  } catch (error) {
    console.error('Error checking WhatsApp config:', error);
    res.status(500).json({ error: 'Failed to check configuration' });
  }
});

// Test endpoint to check webhook status
app.get('/api/test/webhook-status', (_req: Request, res: Response) => {
  try {
    const conciergeries = dbQueries.getAllConciegeriesWithSecrets();
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || 'Not configured';
    
    res.json({
      status: 'ok',
      serverUrl: `http://localhost:${PORT}`,
      webhookEndpoint: `http://localhost:${PORT}/webhook/whatsapp`,
      twilioWebhookUrl: webhookUrl,
      conciergeries: conciergeries.map((c: any) => ({
        id: c.id,
        name: c.name,
        hasWhatsAppNumber: !!c.whatsapp_number,
        whatsappNumber: c.whatsapp_number || 'Non configuré'
      })),
      note: 'If serverUrl is localhost, you need to use ngrok or similar to expose it to Twilio'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check webhook status', message: error.message });
  }
});

// Test endpoint to check Claude AI configuration
app.get('/api/test/claude-config', async (_req: Request, res: Response) => {
  try {
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    const apiKeyLength = process.env.ANTHROPIC_API_KEY?.length || 0;
    const apiKeyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'N/A';
    
    // Try to generate a test response
    let testResponse = null;
    let testError = null;
    try {
      // Create a test conversation
      const testConciergerie = dbQueries.getAllConciergeries()[0];
      if (testConciergerie) {
        const testConv = dbQueries.getOrCreateConversation('whatsapp:+33600000000', testConciergerie.id);
        testResponse = await generateAISuggestion(testConv.id, 'Bonjour, test');
      }
    } catch (error: any) {
      testError = error.message;
    }
    
    res.json({
      status: 'ok',
      hasApiKey,
      apiKeyLength,
      apiKeyPrefix: hasApiKey ? `${apiKeyPrefix}...` : 'N/A',
      testResponse,
      testError
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check Claude configuration', message: error.message });
  }
});

// AUTHENTICATION ENDPOINTS

// API: Create conciergerie (public endpoint for initial setup - remove in production)
app.post('/api/setup/conciergerie', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Check if any conciergerie already exists
    const existingConciergeries = dbQueries.getAllConciergeries();
    if (existingConciergeries.length > 0) {
      return res.status(403).json({ error: 'Conciergerie already exists. Use admin endpoint to create more.' });
    }

    const conciergerie = dbQueries.createConciergerie(name, email, password);
    res.json({ success: true, conciergerie: { id: conciergerie.id, name: conciergerie.name, email: conciergerie.email } });
  } catch (error: any) {
    console.error('Error creating conciergerie:', error);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create conciergerie' });
  }
});

// API: Create conciergerie (for admin/setup)
app.post('/api/admin/conciergeries', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const conciergerie = dbQueries.createConciergerie(name, email, password);
    res.json({ success: true, conciergerie: { id: conciergerie.id, name: conciergerie.name, email: conciergerie.email } });
  } catch (error: any) {
    console.error('Error creating conciergerie:', error);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create conciergerie' });
  }
});

// API: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const conciergerie = dbQueries.loginConciergerie(email, password);

    if (!conciergerie) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate session token
    const token = generateToken();
    sessions.set(token, { conciergerieId: conciergerie.id, email: conciergerie.email });

    res.json({
      success: true,
      token,
      conciergerie: {
        id: conciergerie.id,
        name: conciergerie.name,
        email: conciergerie.email
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// API: Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      sessions.delete(token);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ADMIN AUTH API ENDPOINTS

// API: Admin Login
app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate session token
    const token = generateToken();
    adminSessions.set(token, { email });

    res.json({
      success: true,
      token,
      admin: {
        email
      }
    });
  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// API: Admin Logout
app.post('/api/admin/auth/logout', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      adminSessions.delete(token);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging out admin:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// API: Check admin session
app.get('/api/admin/auth/check', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || !adminSessions.has(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = adminSessions.get(token)!;

    res.json({
      success: true,
      admin: {
        email: session.email
      }
    });
  } catch (error) {
    console.error('Error checking admin session:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
});

// API: Check session
app.get('/api/auth/me', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = sessions.get(token)!;
    const conciergeries = dbQueries.getAllConciergeries();
    const conciergerie = conciergeries.find((c: any) => c.id === session.conciergerieId);

    if (!conciergerie) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      success: true,
      conciergerie: {
        id: conciergerie.id,
        name: conciergerie.name,
        email: conciergerie.email
      }
    });
  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
});

// Middleware to check authentication for conciergerie routes
function requireAuth(req: Request, res: Response, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  (req as any).session = sessions.get(token);
  next();
}

// Middleware to check authentication for admin routes
function requireAdminAuth(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!authHeader) {
    console.error('❌ No Authorization header provided');
    return res.status(401).json({ error: 'Unauthorized: No authorization header' });
  }

  if (!token) {
    console.error('❌ No token found in Authorization header');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  if (!adminSessions.has(token)) {
    console.error(`❌ Token not found in admin sessions. Token: ${token.substring(0, 10)}...`);
    console.error(`📋 Current admin sessions: ${Array.from(adminSessions.keys()).length} active`);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  (req as any).adminSession = adminSessions.get(token);
  next();
}

// Twilio webhook - Receive WhatsApp messages
app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    let { From, To, Body } = req.body;

    // Normalize phone number format: ensure whatsapp: prefix and + sign
    // Twilio sometimes sends "whatsapp: 336..." instead of "whatsapp:+336..."
    if (From) {
      From = From.replace(/^whatsapp:\s*/, 'whatsapp:').replace(/^whatsapp:([^+])/, 'whatsapp:+$1').replace(/^whatsapp:\+\+/, 'whatsapp:+');
    }
    if (To) {
      To = To.replace(/^whatsapp:\s*/, 'whatsapp:').replace(/^whatsapp:([^+])/, 'whatsapp:+$1').replace(/^whatsapp:\+\+/, 'whatsapp:+');
    }

    console.log(`📩 Received message from ${From} to ${To}: ${Body}`);
    console.log(`📋 Full request body:`, JSON.stringify(req.body, null, 2));

    // First, try to identify conciergerie by the destination number (To)
    let conciergerie: Conciergerie | null = dbQueries.getConciergerieByWhatsAppNumber(To);

    if (!conciergerie) {
      // Fallback: check phone routing table (old system)
      const conciergerieId = dbQueries.getConciergerieByPhone(From);
      if (conciergerieId) {
        const foundConciergerie = dbQueries.getConciergerieById(conciergerieId);
        if (foundConciergerie) {
          conciergerie = foundConciergerie;
        }
      }
    }

    // If still no conciergerie, assign to first available
    if (!conciergerie) {
      const conciergeries = dbQueries.getAllConciergeries();
      if (conciergeries.length === 0) {
        console.error('❌ No conciergeries available for routing');
        res.type('text/xml');
        return res.send('<Response></Response>');
      }

      // Get full conciergerie data by ID
      const firstConciergerie = dbQueries.getConciergerieById(conciergeries[0].id);
      if (!firstConciergerie) {
        console.error('❌ Failed to get conciergerie data');
        res.type('text/xml');
        return res.send('<Response></Response>');
      }
      conciergerie = firstConciergerie;
      console.log(`🔀 Auto-routed ${From} to conciergerie ${conciergerie.name} (ID: ${conciergerie.id})`);
    } else {
      console.log(`🔀 Message routed to ${conciergerie.name} (${To})`);
    }

    // Ensure conciergerie is not null
    if (!conciergerie) {
      console.error('❌ No conciergerie found for routing');
      res.type('text/xml');
      return res.send('<Response></Response>');
    }

    // Get or create conversation for this conciergerie
    const conversation = USE_POSTGRES
      ? await (dbQueriesPostgres as any).getOrCreateConversationAsync(From, conciergerie.id)
      : dbQueries.getOrCreateConversation(From, conciergerie.id);
    console.log(`📋 Conversation retrieved/created:`, {
      id: conversation.id,
      phone_number: conversation.phone_number
    });

    // Ensure phone routing exists for this conversation (so it's visible)
    // Check if routing already exists
    const existingRouting = dbQueries.getConciergerieByPhone(From);
    if (!existingRouting || existingRouting !== conciergerie.id) {
      // Create routing if it doesn't exist or points to different conciergerie
      dbQueries.setPhoneRouting(From, conciergerie.id);
      console.log(`📞 Auto-created phone routing: ${From} -> ${conciergerie.name}`);
    }

    // Save client message first
    if (USE_POSTGRES) {
      await (dbQueriesPostgres as any).addMessageAsync(conversation.id, Body, 'client', undefined, undefined, 0);
    } else {
      dbQueries.addMessage(conversation.id, 'client', Body, null, 0);
    }

    // Respond to Twilio immediately (required to acknowledge receipt)
    res.type('text/xml');
    res.send('<Response></Response>');

    // Generate AI response asynchronously (don't block Twilio)
    // Only if ai_auto_reply is enabled for this conversation
    (async () => {
      try {
        // AI always responds automatically (toggle feature removed)

        console.log(`🔄 Starting AI response generation for conversation ${conversation.id}...`);
        console.log(`📝 Client message: "${Body}"`);
        console.log(`🏢 Conciergerie: ${conciergerie.name} (ID: ${conciergerie.id})`);
        
        const aiResponse = await generateAISuggestion(conversation.id, Body);
        console.log(`🤖 AI generated response: ${aiResponse}`);
        
        if (!aiResponse || aiResponse.trim().length === 0) {
          console.error('❌ AI returned empty response');
          return;
        }

        // Always save the AI response in database first
        console.log(`💾 Saving AI response to database...`);
        if (USE_POSTGRES) {
          await (dbQueriesPostgres as any).addMessageAsync(conversation.id, aiResponse, 'concierge', undefined, undefined, 1);
        } else {
          dbQueries.addMessage(conversation.id, 'concierge', aiResponse, undefined, 1);
        }
        console.log(`✅ AI response saved to database with is_ai=1`);

        // Send AI response automatically via WhatsApp using conciergerie's Twilio config
        // Only send if WhatsApp number is configured
        if (conciergerie.whatsapp_number) {
          console.log(`📤 Attempting to send message to ${From} from ${conciergerie.whatsapp_number} (conciergerie ${conciergerie.id})`);
          console.log(`🔍 Twilio client available: ${twilioClients.has(conciergerie.id)}`);
          
          // If Twilio client is not initialized, try to initialize it now
          if (!twilioClients.has(conciergerie.id)) {
            console.log(`⚠️  Twilio client not initialized for conciergerie ${conciergerie.id}, attempting to initialize...`);
            // Use getAllConciegeriesWithSecrets to get the secrets
            const allConciergeries = dbQueries.getAllConciegeriesWithSecrets();
            const conciergerieWithSecrets = allConciergeries.find((c: any) => c.id === conciergerie.id);
            console.log(`🔍 Looking for conciergerie ${conciergerie.id} in ${allConciergeries.length} conciergeries`);
            console.log(`🔍 Found conciergerie: ${conciergerieWithSecrets ? 'YES' : 'NO'}`);
            if (conciergerieWithSecrets) {
              console.log(`🔍 Has Account SID: ${!!conciergerieWithSecrets.twilio_account_sid}`);
              console.log(`🔍 Has Auth Token: ${!!conciergerieWithSecrets.twilio_auth_token}`);
              console.log(`🔍 Has WhatsApp Number: ${!!conciergerieWithSecrets.whatsapp_number}`);
            }
            if (conciergerieWithSecrets && conciergerieWithSecrets.twilio_account_sid && conciergerieWithSecrets.twilio_auth_token) {
              try {
                const { initTwilioForConciergerie } = require('./twilio');
                initTwilioForConciergerie(
                  conciergerie.id,
                  conciergerieWithSecrets.twilio_account_sid,
                  conciergerieWithSecrets.twilio_auth_token,
                  conciergerie.whatsapp_number
                );
                console.log(`✅ Twilio client initialized on-the-fly for conciergerie ${conciergerie.id}`);
              } catch (error: any) {
                console.error(`❌ Failed to initialize Twilio client:`, error.message);
              }
            } else {
              console.error(`❌ Cannot initialize Twilio: missing credentials for conciergerie ${conciergerie.id}`);
            }
          }
          
          try {
            console.log(`📤 Calling sendWhatsAppMessage with: to=${From}, conciergerieId=${conciergerie.id}, fromNumber=${conciergerie.whatsapp_number}`);
            await sendWhatsAppMessage(From, aiResponse, conciergerie.id, conciergerie.whatsapp_number);
            console.log(`✅ Auto-sent AI response to ${From} from ${conciergerie.whatsapp_number}`);
          } catch (sendError: any) {
            console.error(`❌ Failed to send WhatsApp message:`, sendError.message);
            console.error(`❌ Send error details:`, {
              message: sendError.message,
              code: sendError.code,
              status: sendError.status,
              moreInfo: sendError.moreInfo,
              stack: sendError.stack,
              name: sendError.name
            });
            // Response is already saved, so we can continue
          }
        } else {
          console.warn(`⚠️  Cannot send AI response: WhatsApp number not configured for conciergerie ${conciergerie.name} (ID: ${conciergerie.id})`);
          console.warn(`⚠️  conciergerie.whatsapp_number = ${conciergerie.whatsapp_number || 'NULL'}`);
          console.log(`💡 AI response saved to database for manual review`);
          console.log(`💡 To fix: Configure WhatsApp in admin panel for conciergerie ${conciergerie.id}`);
        }
      } catch (error: any) {
        console.error('❌ Error in AI auto-response:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    })();

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing message');
  }
});

// CONCIERGERIE API ENDPOINTS (require authentication)

// API: Get conversations for logged-in conciergerie
app.get('/api/conversations', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversations = dbQueries.getConversationsByConciergerie(conciergerieId);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// API: Get messages for a conversation
app.get('/api/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const messages = USE_POSTGRES
      ? await (dbQueriesPostgres as any).getMessagesAsync(conversationId)
      : dbQueries.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Auto-reply toggle endpoint removed - AI always responds automatically

// API: Send message from conciergerie
app.post('/api/conversations/:id/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get conversation to verify it belongs to this conciergerie
    const conversations = dbQueries.getConversationsByConciergerie(conciergerieId);
    const conversation = conversations.find((c: any) => c.id === conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get conciergerie details for Twilio config
    const conciergeries = dbQueries.getAllConciergeries();
    const conciergerie = conciergeries.find((c: any) => c.id === conciergerieId);

    // Send via Twilio using conciergerie's credentials
    if (!conciergerie?.whatsapp_number) {
      return res.status(400).json({ error: 'WhatsApp number not configured for this conciergerie. Please configure it in the admin panel.' });
    }

    await sendWhatsAppMessage(conversation.phone_number, message, conciergerieId, conciergerie.whatsapp_number);

    // Save message in database (manual message, not AI)
    const savedMessage = USE_POSTGRES
      ? await (dbQueriesPostgres as any).addMessageAsync(conversationId, message, 'concierge', undefined, undefined, 0)
      : dbQueries.addMessage(conversationId, 'concierge', message, undefined, 0);

    res.json({ success: true, message: savedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// API: Create feature request (from conciergerie)
app.post('/api/feature-requests', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const { title, description, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const featureRequest = dbQueries.addFeatureRequest(title, description, priority || 'medium', conciergerieId);
    res.json({ success: true, featureRequest });
  } catch (error) {
    console.error('Error creating feature request:', error);
    res.status(500).json({ error: 'Failed to create feature request' });
  }
});

// API: Get FAQs for logged-in conciergerie
app.get('/api/faqs', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const faqs = dbQueries.getFAQsByConciergerie(conciergerieId);
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

// API: Add FAQ (from conciergerie)
app.post('/api/faqs', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const faq = dbQueries.addFAQ(conciergerieId, question, answer);
    res.json({ success: true, faq });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

// API: Update FAQ
app.patch('/api/faqs/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    dbQueries.updateFAQ(id, question, answer);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

// API: Delete FAQ
app.delete('/api/faqs/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    dbQueries.deleteFAQ(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

// API: Get statistics
app.get('/api/statistics', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const stats = dbQueries.getStatistics(conciergerieId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// API: Search conversations
app.get('/api/search', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const conversations = dbQueries.searchConversations(conciergerieId, query.trim());
    res.json(conversations);
  } catch (error) {
    console.error('Error searching conversations:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

// API: Get response templates
app.get('/api/templates', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const templates = dbQueries.getResponseTemplates(conciergerieId);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// API: Create response template
app.post('/api/templates', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    const template = dbQueries.addResponseTemplate(conciergerieId, name, content);
    res.json({ success: true, template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// API: Update response template
app.patch('/api/templates/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const id = parseInt(req.params.id);
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    dbQueries.updateResponseTemplate(id, conciergerieId, name, content);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// API: Delete response template
app.delete('/api/templates/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const id = parseInt(req.params.id);
    dbQueries.deleteResponseTemplate(id, conciergerieId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// API: Get conversation tags
app.get('/api/conversations/:id/tags', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);

    const conversation = dbQueries.getConversationById(conversationId);
    if (!conversation || conversation.conciergerie_id !== conciergerieId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const tags = dbQueries.getConversationTags(conversationId);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// API: Add conversation tag
app.post('/api/conversations/:id/tags', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);
    const { tag } = req.body;

    if (!tag || tag.trim().length === 0) {
      return res.status(400).json({ error: 'Tag is required' });
    }

    const conversation = dbQueries.getConversationById(conversationId);
    if (!conversation || conversation.conciergerie_id !== conciergerieId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    dbQueries.addConversationTag(conversationId, tag.trim());
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

// API: Remove conversation tag
app.delete('/api/conversations/:id/tags/:tag', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);
    const tag = decodeURIComponent(req.params.tag);

    const conversation = dbQueries.getConversationById(conversationId);
    if (!conversation || conversation.conciergerie_id !== conciergerieId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    dbQueries.removeConversationTag(conversationId, tag);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

// API: Get conversation notes
app.get('/api/conversations/:id/notes', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);

    const conversation = dbQueries.getConversationById(conversationId);
    if (!conversation || conversation.conciergerie_id !== conciergerieId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const notes = dbQueries.getConversationNotes(conversationId);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// API: Add conversation note
app.post('/api/conversations/:id/notes', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({ error: 'Note is required' });
    }

    const conversation = dbQueries.getConversationById(conversationId);
    if (!conversation || conversation.conciergerie_id !== conciergerieId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const newNote = dbQueries.addConversationNote(conversationId, note.trim());
    res.json({ success: true, note: newNote });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// API: Delete conversation note
app.delete('/api/conversations/:id/notes/:noteId', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);
    const noteId = parseInt(req.params.noteId);

    const conversation = dbQueries.getConversationById(conversationId);
    if (!conversation || conversation.conciergerie_id !== conciergerieId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    dbQueries.deleteConversationNote(noteId, conversationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ADMIN API ENDPOINTS (protected with requireAdminAuth)

// API: Get ALL conversations (for admin)
app.get('/api/admin/conversations', requireAdminAuth, (_req: Request, res: Response) => {
  try {
    const conversations = dbQueries.getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// API: Get messages for a conversation (admin)
app.get('/api/admin/conversations/:id/messages', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const messages = USE_POSTGRES
      ? await (dbQueriesPostgres as any).getMessagesAsync(conversationId)
      : dbQueries.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Auto-reply toggle endpoint removed - AI always responds automatically

// API: Send message from admin
app.post('/api/admin/conversations/:id/send', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get conversation to find the client phone number and conciergerie
    const conversations = dbQueries.getAllConversations();
    const conversation = conversations.find((c: any) => c.id === conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add message to database (manual message, not AI)
    if (USE_POSTGRES) {
      await (dbQueriesPostgres as any).addMessageAsync(conversationId, message, 'concierge', undefined, undefined, 0);
    } else {
      dbQueries.addMessage(conversationId, 'concierge', message, undefined, 0);
    }

    // Send via Twilio
    const conciergerie = dbQueries.getConciergerieById(conversation.conciergerie_id);
    if (conciergerie && conciergerie.whatsapp_number) {
      const twilioClient = twilioClients.get(conciergerie.id);
      if (twilioClient) {
        await twilioClient.messages.create({
          from: conciergerie.whatsapp_number,
          to: conversation.phone_number,
          body: message,
        });
        console.log(`✅ Message sent from ${conciergerie.whatsapp_number} to ${conversation.phone_number} (admin)`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// API: Get all conciergeries (for admin)
app.get('/api/admin/conciergeries', requireAdminAuth, (_req: Request, res: Response) => {
  try {
    const conciergeries = dbQueries.getAllConciergeries();
    res.json(conciergeries);
  } catch (error) {
    console.error('Error fetching conciergeries:', error);
    res.status(500).json({ error: 'Failed to fetch conciergeries' });
  }
});

// API: Update conciergerie (admin)
app.patch('/api/admin/conciergeries/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email is already used by another conciergerie
    const existingConciergerie = dbQueries.getAllConciergeries().find((c: any) => c.email === email && c.id !== id);
    if (existingConciergerie) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    dbQueries.updateConciergerie(id, name, email, password);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conciergerie:', error);
    res.status(500).json({ error: 'Failed to update conciergerie' });
  }
});

// API: Delete conciergerie (admin)
app.delete('/api/admin/conciergeries/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    dbQueries.deleteConciergerie(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conciergerie:', error);
    res.status(500).json({ error: 'Failed to delete conciergerie' });
  }
});

// API: Get conciergerie with password (admin)
app.get('/api/admin/conciergeries/:id/credentials', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const conciergerie = dbQueries.getConciergerieById(id);

    if (!conciergerie) {
      return res.status(404).json({ error: 'Conciergerie not found' });
    }

    console.log(`🔍 Fetching credentials for conciergerie ${id}:`);
    console.log(`   - plaintext_password: ${conciergerie.plaintext_password ? conciergerie.plaintext_password.substring(0, 5) + '***' : 'NULL'}`);
    console.log(`   - sandbox_join_code: ${conciergerie.sandbox_join_code || 'NULL'}`);

    // Check if plaintext_password is valid (not the sandbox code)
    let password = conciergerie.plaintext_password || null;
    
    // If plaintext_password is the same as sandbox_join_code, it's invalid
    if (password && password === conciergerie.sandbox_join_code) {
      console.log(`⚠️  plaintext_password matches sandbox_join_code - marking as invalid`);
      password = null; // Mark as invalid
    }

    // Return login and plaintext password
    res.json({
      login: conciergerie.email,
      password: password || 'Non disponible - Veuillez réinitialiser le mot de passe'
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// API: Update sandbox join code (admin)
app.patch('/api/admin/conciergeries/:id/sandbox', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { join_code } = req.body;

    if (!join_code) {
      return res.status(400).json({ error: 'join_code is required' });
    }

    dbQueries.updateSandboxJoinCode(id, join_code);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating sandbox join code:', error);
    res.status(500).json({ error: 'Failed to update sandbox join code' });
  }
});

// API: Get all FAQs (for admin)
app.get('/api/admin/faqs', requireAdminAuth, (_req: Request, res: Response) => {
  try {
    const faqs = dbQueries.getAllFAQs();
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

// API: Create FAQ (admin)
app.post('/api/admin/faqs', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { question, answer, conciergerie_id } = req.body;

    if (!question || !answer || !conciergerie_id) {
      return res.status(400).json({ error: 'Question, answer, and conciergerie_id are required' });
    }

    const faq = dbQueries.addFAQ(conciergerie_id, question, answer);
    res.json({ success: true, faq });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

// API: Update FAQ (admin)
app.patch('/api/admin/faqs/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { question, answer, conciergerie_id } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    dbQueries.updateFAQ(id, question, answer, conciergerie_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

// API: Delete FAQ (admin)
app.delete('/api/admin/faqs/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    dbQueries.deleteFAQ(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

// API: Update conciergerie WhatsApp config (admin)
app.patch('/api/admin/conciergeries/:id/whatsapp', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { whatsapp_number, twilio_account_sid, twilio_auth_token } = req.body;

    if (!whatsapp_number || !twilio_account_sid || !twilio_auth_token) {
      return res.status(400).json({ error: 'whatsapp_number, twilio_account_sid, and twilio_auth_token are required' });
    }

    // Update database
    dbQueries.updateConciergerieWhatsApp(id, whatsapp_number, twilio_account_sid, twilio_auth_token);

    // Initialize Twilio client for this conciergerie
    try {
      const { initTwilioForConciergerie } = require('./twilio');
      initTwilioForConciergerie(id, twilio_account_sid, twilio_auth_token, whatsapp_number);
      console.log(`✅ Twilio client initialized for conciergerie ${id}`);
    } catch (error: any) {
      console.error(`❌ Failed to initialize Twilio client for conciergerie ${id}:`, error.message);
      // Don't fail the request, but log the error
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    res.status(500).json({ error: 'Failed to update WhatsApp config' });
  }
});

// API: Get phone routing (admin)
app.get('/api/admin/phone-routing', requireAdminAuth, (_req: Request, res: Response) => {
  try {
    const routing = dbQueries.getAllPhoneRouting();
    res.json(routing);
  } catch (error) {
    console.error('Error fetching phone routing:', error);
    res.status(500).json({ error: 'Failed to fetch phone routing' });
  }
});

// API: Set phone routing (admin)
app.post('/api/admin/phone-routing', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { phone_number, conciergerie_id } = req.body;

    if (!phone_number || !conciergerie_id) {
      return res.status(400).json({ error: 'Phone number and conciergerie_id are required' });
    }

    dbQueries.setPhoneRouting(phone_number, conciergerie_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting phone routing:', error);
    res.status(500).json({ error: 'Failed to set phone routing' });
  }
});

// API: Delete phone routing (admin)
app.delete('/api/admin/phone-routing/:phoneNumber', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const phoneNumber = decodeURIComponent(req.params.phoneNumber);
    dbQueries.deletePhoneRouting(phoneNumber);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting phone routing:', error);
    res.status(500).json({ error: 'Failed to delete phone routing' });
  }
});

// API: Reset all conversations and messages (admin)
app.delete('/api/admin/conversations', requireAdminAuth, (req: Request, res: Response) => {
  try {
    dbQueries.deleteAllConversations();
    res.json({ success: true, message: 'All conversations and messages have been deleted' });
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    res.status(500).json({ error: 'Failed to delete conversations' });
  }
});

// API: Get all feature requests (for admin)
app.get('/api/feature-requests', (_req: Request, res: Response) => {
  try {
    const featureRequests = dbQueries.getAllFeatureRequests();
    res.json(featureRequests);
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    res.status(500).json({ error: 'Failed to fetch feature requests' });
  }
});

// API: Create test conversation (admin - for demo purposes)
app.post('/api/admin/test-conversation', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { phone_number, conciergerie_id, message } = req.body;

    if (!phone_number || !conciergerie_id) {
      return res.status(400).json({ error: 'phone_number and conciergerie_id are required' });
    }

    // Create conversation
    const conversation = USE_POSTGRES
      ? await (dbQueriesPostgres as any).getOrCreateConversationAsync(phone_number, conciergerie_id)
      : dbQueries.getOrCreateConversation(phone_number, conciergerie_id);

    // Add a test message if provided
    if (message) {
      if (USE_POSTGRES) {
        await (dbQueriesPostgres as any).addMessageAsync(conversation.id, message, 'client', undefined, undefined, 0);
      } else {
        dbQueries.addMessage(conversation.id, 'client', message, null, 0);
      }
    }

    res.json({ success: true, conversation });
  } catch (error: any) {
    console.error('Error creating test conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation', message: error.message });
  }
});

// API: Initialize database with seed data (public endpoint for setup)
app.post('/api/setup/seed', async (req: Request, res: Response) => {
  try {
    // Check if data already exists
    const existingConciergeries = dbQueries.getAllConciergeries();
    if (existingConciergeries.length > 0) {
      return res.status(403).json({ 
        error: 'Database already has data. Use admin endpoint to manage data.',
        existingCount: existingConciergeries.length
      });
    }

    // Import and run seed function
    const seedModule = await import('./seed-data');
    const seed = seedModule.default || seedModule;
    await seed();
    
    res.json({ 
      success: true, 
      message: 'Database seeded successfully with test data',
      conciergeries: [
        { email: 'parc@conciergerie.fr', password: 'parc123' },
        { email: 'jardins@conciergerie.fr', password: 'jardins123' }
      ]
    });
  } catch (error: any) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database', message: error.message });
  }
});

// API: Create feature request (admin - no auth required)
app.post('/api/admin/feature-requests', (req: Request, res: Response) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const featureRequest = dbQueries.addFeatureRequest(title, description, priority || 'medium', null);
    res.json({ success: true, featureRequest });
  } catch (error) {
    console.error('Error creating feature request:', error);
    res.status(500).json({ error: 'Failed to create feature request' });
  }
});

// API: Update feature request status (admin)
app.patch('/api/feature-requests/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    dbQueries.updateFeatureRequest(id, status);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating feature request:', error);
    res.status(500).json({ error: 'Failed to update feature request' });
  }
});

// API: Delete feature request (admin)
app.delete('/api/feature-requests/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    dbQueries.deleteFeatureRequest(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting feature request:', error);
    res.status(500).json({ error: 'Failed to delete feature request' });
  }
});

// Start server - but initialize database first
(async () => {
  try {
    // Initialize database first
    console.log(`🔄 Initializing ${USE_POSTGRES ? 'PostgreSQL' : 'SQLite'} database...`);
    if (USE_POSTGRES) {
      await initDatabasePostgres();
    } else {
      await initDatabase();
    }
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 WhatsApp webhook: http://localhost:${PORT}/webhook/whatsapp`);
    console.log(`💬 Ready to receive messages!`);

    // Wait a bit for database to be ready, then initialize Twilio clients
    setTimeout(async () => {
      try {
        const conciergeries = USE_POSTGRES
          ? await (dbQueriesPostgres as any).getAllConciegeriesAsync()
          : dbQueries.getAllConciergeries();
      if (conciergeries.length === 0) {
        console.log('⚠️  No conciergeries found. Initializing with seed data...');
        console.log('📝 Note: On Render, the database is ephemeral and resets on each deploy.');
        console.log('📝 Data will be auto-initialized on each startup.');
        try {
          const seedModule = await import('./seed-data');
          const seed = seedModule.default || seedModule;
          await seed();
          console.log('✅ Seed data initialized successfully');
          console.log('📋 Created conciergeries:');
          console.log('   - Résidence Le Parc: parc@conciergerie.fr / parc123');
          console.log('   - Domaine des Jardins: jardins@conciergerie.fr / jardins123');
          console.log('📚 Created 6 FAQs (3 per conciergerie)');
          console.log('📱 Twilio configured for both conciergeries');
          console.log('💡 You can also manually reinitialize with: POST /api/setup/seed');
          
          // Initialize Twilio clients for the seeded conciergeries
          setTimeout(() => {
            try {
              const { initTwilioForConciergerie } = require('./twilio');
              const conciergeries = dbQueries.getAllConciegeriesWithSecrets();
              conciergeries.forEach((conciergerie: any) => {
                if (conciergerie.whatsapp_number && conciergerie.twilio_account_sid && conciergerie.twilio_auth_token) {
                  try {
                    initTwilioForConciergerie(
                      conciergerie.id,
                      conciergerie.twilio_account_sid,
                      conciergerie.twilio_auth_token,
                      conciergerie.whatsapp_number
                    );
                    console.log(`✅ Twilio initialized for ${conciergerie.name}`);
                  } catch (error: any) {
                    console.error(`❌ Failed to initialize Twilio for ${conciergerie.name}:`, error.message);
                  }
                }
              });
            } catch (error: any) {
              console.error('❌ Error initializing Twilio clients:', error.message);
            }
          }, 1000);
        } catch (error: any) {
          console.error('❌ Error initializing seed data:', error.message);
          // Fallback: create simple conciergeries
          if (USE_POSTGRES) {
            const demo = await (dbQueriesPostgres as any).createConciergerieAsync('Conciergerie Demo', 'demo@example.com', 'demo123');
            console.log('✅ Default conciergerie created: demo@example.com / demo123');
          } else {
            const demo = dbQueries.createConciergerie('Conciergerie Demo', 'demo@example.com', 'demo123');
            console.log('✅ Default conciergerie created: demo@example.com / demo123');
          }
        }
      } else {
        console.log(`✅ Database has ${conciergeries.length} conciergerie(s) - no initialization needed`);
        console.log(`ℹ️  ${conciergeries.length} conciergerie(s) already exist`);

        // Initialize Twilio clients for conciergeries with WhatsApp configured
        // Use getAllConciegeriesWithSecrets to get twilio_auth_token
        const { initTwilioForConciergerie } = require('./twilio');
        const conciegeriesWithSecrets = USE_POSTGRES
          ? await (dbQueriesPostgres as any).getAllConciegeriesWithSecretsAsync()
          : dbQueries.getAllConciegeriesWithSecrets();
        let initializedCount = 0;

        conciegeriesWithSecrets.forEach((conciergerie: any) => {
          if (conciergerie.whatsapp_number && conciergerie.twilio_account_sid && conciergerie.twilio_auth_token) {
            try {
              console.log(`🔄 Initializing Twilio for ${conciergerie.name} (ID: ${conciergerie.id})...`);
              initTwilioForConciergerie(
                conciergerie.id,
                conciergerie.twilio_account_sid,
                conciergerie.twilio_auth_token,
                conciergerie.whatsapp_number
              );
              initializedCount++;
              console.log(`✅ Twilio initialized for ${conciergerie.name}`);
            } catch (error: any) {
              console.error(`❌ Failed to initialize Twilio for ${conciergerie.name}:`, error.message);
            }
          } else {
            console.log(`⚠️  ${conciergerie.name} missing Twilio config:`, {
              hasWhatsApp: !!conciergerie.whatsapp_number,
              hasSid: !!conciergerie.twilio_account_sid,
              hasToken: !!conciergerie.twilio_auth_token
            });
          }
        });

        if (initializedCount > 0) {
          console.log(`📱 Initialized ${initializedCount} Twilio client(s)`);
        } else {
          console.log('ℹ️  No Twilio configurations found. Configure WhatsApp numbers via admin interface.');
        }
      }
    } catch (error) {
      console.log('Note: Run this to create your first conciergerie:');
      console.log('POST /api/admin/conciergeries with { name, email, password }');
    }
  }, 100);
  });
})();
