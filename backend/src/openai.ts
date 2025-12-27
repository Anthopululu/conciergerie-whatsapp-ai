import OpenAI from 'openai';
import { dbQueries, Message } from './database';

let openai: OpenAI;

export function initOpenAI() {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function generateAISuggestion(conversationId: number, clientMessage: string): Promise<string> {
  try {
    // Get conversation history for context
    const history = dbQueries.getConversationHistory(conversationId, 10).reverse();

    // Build messages for ChatGPT
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `Tu es un assistant IA pour une conciergerie de luxe. Ton rôle est de suggérer des réponses professionnelles, courtoises et utiles aux demandes des clients.

Règles:
- Sois poli, professionnel et chaleureux
- Réponds de manière concise (2-3 phrases maximum)
- Si le client demande une réservation ou service spécifique, propose de t'en occuper
- Utilise un ton français professionnel mais amical
- Si tu ne peux pas aider, propose de transférer à un humain

La réponse que tu génères sera une SUGGESTION que la conciergerie pourra modifier avant d'envoyer.`
      }
    ];

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Plus économique et rapide
      messages: messages,
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || 'Je peux vous aider avec cela. Pouvez-vous me donner plus de détails ?';
  } catch (error) {
    console.error('OpenAI error:', error);
    return 'Bonjour, je suis là pour vous aider. Comment puis-je vous assister aujourd\'hui ?';
  }
}
