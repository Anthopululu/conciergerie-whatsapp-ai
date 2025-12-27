export interface Conversation {
  id: number;
  phone_number: string;
  created_at: string;
  last_message_at: string;
  last_message: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'client' | 'concierge';
  message: string;
  ai_suggestion: string | null;
  created_at: string;
}
