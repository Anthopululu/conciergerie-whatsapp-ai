export interface FeatureRequest {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: number;
  conciergerie_id: number;
  conciergerie_name?: string;
  phone_number: string;
  ai_auto_reply: number;
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
  is_ai: number;
  created_at: string;
}
