import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before importing other modules
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { dbQueries, Conciergerie } from './database';
import { generateAISuggestion, initClaude } from './claude';
import { sendWhatsAppMessage, initTwilio, twilioClients } from './twilio';

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
    const configStatus = conciergeries.map(c => ({
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
      conciergeries: conciergeries.map(c => ({
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
    const conciergerie = conciergeries.find(c => c.id === session.conciergerieId);

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
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
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
    const conversation = dbQueries.getOrCreateConversation(From, conciergerie.id);
    console.log(`📋 Conversation retrieved/created:`, {
      id: conversation.id,
      phone_number: conversation.phone_number,
      ai_auto_reply: conversation.ai_auto_reply
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
    dbQueries.addMessage(conversation.id, 'client', Body, null);

    // Respond to Twilio immediately (required to acknowledge receipt)
    res.type('text/xml');
    res.send('<Response></Response>');

    // Generate AI response asynchronously (don't block Twilio)
    // Only if ai_auto_reply is enabled for this conversation
    (async () => {
      try {
        // Use the conversation object we already have (it has ai_auto_reply)
        // But refresh it from DB to ensure we have the latest value
        const conversationData = dbQueries.getConversationById(conversation.id);
        console.log(`🔍 Checking auto-reply for conversation ${conversation.id}:`, {
          conversationFromGetOrCreate: {
            id: conversation.id,
            ai_auto_reply: conversation.ai_auto_reply
          },
          conversationDataFromGetById: conversationData ? {
            id: conversationData.id,
            ai_auto_reply: conversationData.ai_auto_reply,
            phone_number: conversationData.phone_number
          } : null
        });
        
        if (!conversationData) {
          console.log(`❌ Conversation ${conversation.id} not found. Skipping automatic response.`);
          return;
        }
        
        // Check ai_auto_reply - use conversationData (from DB) or fallback to conversation object
        const aiAutoReplyValue = conversationData.ai_auto_reply ?? conversation.ai_auto_reply ?? 1;
        console.log(`🔍 ai_auto_reply value: ${aiAutoReplyValue} (from conversationData: ${conversationData.ai_auto_reply}, from conversation: ${conversation.ai_auto_reply})`);
        
        if (aiAutoReplyValue === 0) {
          console.log(`⏸️  AI auto-reply is disabled (ai_auto_reply=${aiAutoReplyValue}) for conversation ${conversation.id}. Skipping automatic response.`);
          return;
        }
        
        console.log(`✅ AI auto-reply is enabled (ai_auto_reply=${aiAutoReplyValue}) for conversation ${conversation.id}. Proceeding with AI response.`);

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
        dbQueries.addMessage(conversation.id, 'concierge', aiResponse, null, 1);
        console.log(`✅ AI response saved to database`);

        // Send AI response automatically via WhatsApp using conciergerie's Twilio config
        // Only send if WhatsApp number is configured
        if (conciergerie.whatsapp_number) {
          console.log(`📤 Attempting to send message to ${From} from ${conciergerie.whatsapp_number} (conciergerie ${conciergerie.id})`);
          console.log(`🔍 Twilio client available: ${twilioClients.has(conciergerie.id)}`);
          
          // If Twilio client is not initialized, try to initialize it now
          if (!twilioClients.has(conciergerie.id)) {
            console.log(`⚠️  Twilio client not initialized for conciergerie ${conciergerie.id}, attempting to initialize...`);
            const conciergerieWithSecrets = dbQueries.getConciergerieById(conciergerie.id);
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
          console.log(`💡 AI response saved to database for manual review`);
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
app.get('/api/conversations/:id/messages', requireAuth, (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const messages = dbQueries.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// API: Update conversation auto-reply setting (conciergerie)
app.patch('/api/conversations/:id/auto-reply', requireAuth, (req: Request, res: Response) => {
  try {
    const { conciergerieId } = (req as any).session;
    const conversationId = parseInt(req.params.id);
    const { ai_auto_reply } = req.body;

    console.log(`🔄 Updating auto-reply for conversation ${conversationId} (conciergerie ${conciergerieId}):`, { ai_auto_reply, type: typeof ai_auto_reply });

    if (typeof ai_auto_reply !== 'number' || (ai_auto_reply !== 0 && ai_auto_reply !== 1)) {
      console.error(`❌ Invalid ai_auto_reply value: ${ai_auto_reply} (type: ${typeof ai_auto_reply})`);
      return res.status(400).json({ error: 'ai_auto_reply must be 0 or 1' });
    }

    // Verify conversation belongs to this conciergerie
    // Use getConversationById to check if conversation exists and belongs to this conciergerie
    const conversation = dbQueries.getConversationById(conversationId);
    
    if (!conversation) {
      console.error(`❌ Conversation ${conversationId} not found`);
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.conciergerie_id !== conciergerieId) {
      console.error(`❌ Conversation ${conversationId} does not belong to conciergerie ${conciergerieId} (belongs to ${conversation.conciergerie_id})`);
      return res.status(403).json({ error: 'Conversation does not belong to this conciergerie' });
    }

    console.log(`📋 Conversation found:`, { id: conversation.id, current_ai_auto_reply: conversation.ai_auto_reply });
    dbQueries.updateConversationAutoReply(conversationId, ai_auto_reply);
    console.log(`✅ Updated ai_auto_reply to ${ai_auto_reply} for conversation ${conversationId}`);
    res.json({ success: true, ai_auto_reply });
  } catch (error) {
    console.error('❌ Error updating auto-reply setting:', error);
    res.status(500).json({ error: 'Failed to update auto-reply setting' });
  }
});

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
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get conciergerie details for Twilio config
    const conciergeries = dbQueries.getAllConciergeries();
    const conciergerie = conciergeries.find(c => c.id === conciergerieId);

    // Send via Twilio using conciergerie's credentials
    if (!conciergerie?.whatsapp_number) {
      return res.status(400).json({ error: 'WhatsApp number not configured for this conciergerie. Please configure it in the admin panel.' });
    }

    await sendWhatsAppMessage(conversation.phone_number, message, conciergerieId, conciergerie.whatsapp_number);

    // Save message in database (manual message, not AI)
    const savedMessage = dbQueries.addMessage(conversationId, 'concierge', message, null, 0);

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
app.get('/api/admin/conversations/:id/messages', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const messages = dbQueries.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// API: Update conversation auto-reply setting (admin)
app.patch('/api/admin/conversations/:id/auto-reply', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { ai_auto_reply } = req.body;

    console.log(`🔄 Updating auto-reply for conversation ${conversationId}:`, { ai_auto_reply, type: typeof ai_auto_reply });

    if (typeof ai_auto_reply !== 'number' || (ai_auto_reply !== 0 && ai_auto_reply !== 1)) {
      console.error(`❌ Invalid ai_auto_reply value: ${ai_auto_reply} (type: ${typeof ai_auto_reply})`);
      return res.status(400).json({ error: 'ai_auto_reply must be 0 or 1' });
    }

    // Verify conversation exists
    const conversation = dbQueries.getConversationById(conversationId);
    if (!conversation) {
      console.error(`❌ Conversation ${conversationId} not found`);
      return res.status(404).json({ error: 'Conversation not found' });
    }

    console.log(`📋 Conversation found:`, { id: conversation.id, current_ai_auto_reply: conversation.ai_auto_reply });
    dbQueries.updateConversationAutoReply(conversationId, ai_auto_reply);
    console.log(`✅ Updated ai_auto_reply to ${ai_auto_reply} for conversation ${conversationId}`);
    res.json({ success: true, ai_auto_reply });
  } catch (error) {
    console.error('❌ Error updating auto-reply setting:', error);
    res.status(500).json({ error: 'Failed to update auto-reply setting' });
  }
});

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
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add message to database (manual message, not AI)
    dbQueries.addMessage(conversationId, 'concierge', message, null, 0);

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
    const existingConciergerie = dbQueries.getAllConciergeries().find(c => c.email === email && c.id !== id);
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
    const { default: seed } = await import('./seed-data');
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 WhatsApp webhook: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`💬 Ready to receive messages!`);

  // Wait a bit for database to be ready, then initialize Twilio clients
  setTimeout(() => {
    try {
      const conciergeries = dbQueries.getAllConciergeries();
      if (conciergeries.length === 0) {
        console.log('⚠️  No conciergeries found. Creating default conciergerie...');
        const demo = dbQueries.createConciergerie('Conciergerie Demo', 'demo@example.com', 'demo123');
        console.log('✅ Default conciergerie created: demo@example.com / demo123');
        // Also create a main conciergerie
        const main = dbQueries.createConciergerie('Conciergerie Principale', 'conciergerie@example.com', 'concierge123');
        console.log('✅ Main conciergerie created: conciergerie@example.com / concierge123');
      } else {
        console.log(`ℹ️  ${conciergeries.length} conciergerie(s) already exist`);

        // Initialize Twilio clients for conciergeries with WhatsApp configured
        // Use getAllConciegeriesWithSecrets to get twilio_auth_token
        const { initTwilioForConciergerie } = require('./twilio');
        const conciegeriesWithSecrets = dbQueries.getAllConciegeriesWithSecrets();
        let initializedCount = 0;

        conciegeriesWithSecrets.forEach(conciergerie => {
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
