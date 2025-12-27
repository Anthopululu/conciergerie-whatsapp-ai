import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before importing other modules
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { dbQueries } from './database';
import { generateAISuggestion, initClaude } from './claude';
import { sendWhatsAppMessage, initTwilio } from './twilio';

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

// Generate session token
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// AUTHENTICATION ENDPOINTS

// API: Create conciergerie (for admin/setup)
app.post('/api/admin/conciergeries', (req: Request, res: Response) => {
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

// Twilio webhook - Receive WhatsApp messages
// NOTE: This will assign new conversations to conciergerie ID 1 by default
// You could modify this to route to different conciergeries based on phone number or other logic
app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    const { From, Body } = req.body;

    console.log(`📩 Received message from ${From}: ${Body}`);

    // Default to conciergerie ID 1 for incoming messages
    // In production, you might route based on Twilio number or other logic
    const DEFAULT_CONCIERGERIE_ID = 1;

    // Get or create conversation for this conciergerie
    const conversation = dbQueries.getOrCreateConversation(From, DEFAULT_CONCIERGERIE_ID);

    // Save client message first
    dbQueries.addMessage(conversation.id, 'client', Body, null);

    // Respond to Twilio immediately (required to acknowledge receipt)
    res.type('text/xml');
    res.send('<Response></Response>');

    // Generate AI response asynchronously (don't block Twilio)
    (async () => {
      try {
        const aiResponse = await generateAISuggestion(conversation.id, Body);
        console.log(`🤖 AI generated response: ${aiResponse}`);

        // Send AI response automatically via WhatsApp
        await sendWhatsAppMessage(From, aiResponse);
        console.log(`✅ Auto-sent AI response to ${From}`);

        // Save the AI response in database
        dbQueries.addMessage(conversation.id, 'concierge', aiResponse, null);
      } catch (error) {
        console.error('❌ Error in AI auto-response:', error);
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

    // Send via Twilio
    await sendWhatsAppMessage(conversation.phone_number, message);

    // Save message in database
    const savedMessage = dbQueries.addMessage(conversationId, 'concierge', message);

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

// ADMIN API ENDPOINTS (no auth required for now - in production, add admin auth)

// API: Get ALL conversations (for admin)
app.get('/api/admin/conversations', (_req: Request, res: Response) => {
  try {
    const conversations = dbQueries.getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// API: Get all conciergeries (for admin)
app.get('/api/admin/conciergeries', (_req: Request, res: Response) => {
  try {
    const conciergeries = dbQueries.getAllConciergeries();
    res.json(conciergeries);
  } catch (error) {
    console.error('Error fetching conciergeries:', error);
    res.status(500).json({ error: 'Failed to fetch conciergeries' });
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

  // Wait a bit for database to be ready, then create default conciergerie
  setTimeout(() => {
    try {
      const conciergeries = dbQueries.getAllConciergeries();
      if (conciergeries.length === 0) {
        console.log('⚠️  No conciergeries found. Creating default conciergerie...');
        dbQueries.createConciergerie('Conciergerie Demo', 'demo@example.com', 'demo123');
        console.log('✅ Default conciergerie created: demo@example.com / demo123');
      } else {
        console.log(`ℹ️  ${conciergeries.length} conciergerie(s) already exist`);
      }
    } catch (error) {
      console.log('Note: Run this to create your first conciergerie:');
      console.log('POST /api/admin/conciergeries with { name, email, password }');
    }
  }, 100);
});
