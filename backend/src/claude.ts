import Anthropic from '@anthropic-ai/sdk';
import { dbQueries, Message } from './database';

let anthropic: Anthropic;

export function initClaude() {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export async function generateAISuggestion(conversationId: number, clientMessage: string): Promise<string> {
  try {
    // Get conversation history for context
    const history = dbQueries.getConversationHistory(conversationId, 10).reverse();

    // Get conversation to find conciergerie_id
    const allConversations = dbQueries.getAllConversations();
    const conversation = allConversations.find(c => c.id === conversationId);

    // Get FAQs for this conciergerie
    let faqContext = '';
    if (conversation) {
      const faqs = dbQueries.getFAQsByConciergerie(conversation.conciergerie_id);
      if (faqs.length > 0) {
        faqContext = '\n\nFAQ de cette conciergerie (utilise ces informations pour répondre si pertinent):\n';
        faqs.forEach(faq => {
          faqContext += `\nQ: ${faq.question}\nR: ${faq.answer}\n`;
        });
      }
    }

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    history.forEach((msg: Message) => {
      messages.push({
        role: msg.sender === 'client' ? 'user' : 'assistant',
        content: msg.message
      });
    });

    // Add current message
    messages.push({
      role: 'user',
      content: clientMessage
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      system: `Tu es un assistant IA pour une conciergerie de luxe. Ton rôle est de suggérer des réponses professionnelles, courtoises et utiles aux demandes des clients.

Règles:
- Sois poli, professionnel et chaleureux
- Réponds de manière concise (2-3 phrases maximum)
- Si le client demande une réservation ou service spécifique, propose de t'en occuper
- Utilise un ton français professionnel mais amical
- Si tu ne peux pas aider, propose de transférer à un humain
- Utilise la FAQ ci-dessous pour répondre aux questions courantes de manière précise et personnalisée

La réponse que tu génères sera envoyée automatiquement au client.${faqContext}`,
      messages: messages,
    });

    const textContent = response.content.find(block => block.type === 'text');
    return textContent && textContent.type === 'text'
      ? textContent.text
      : 'Je peux vous aider avec cela. Pouvez-vous me donner plus de détails ?';
  } catch (error) {
    console.error('Claude error:', error);
    return 'Bonjour, je suis là pour vous aider. Comment puis-je vous assister aujourd\'hui ?';
  }
}
