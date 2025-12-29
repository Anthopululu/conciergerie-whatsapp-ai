import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Conversation, Message } from '../types';
import './ChatWindow.css';

interface Props {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (conversationId: number, message: string) => Promise<void>;
  onConversationUpdate?: () => void;
  aiAutoReply: number;
  onAutoReplyUpdate: (conversationId: number, aiAutoReply: number) => void;
}

function ChatWindow({ conversation, messages, onSendMessage, onConversationUpdate, aiAutoReply: aiAutoReplyProp, onAutoReplyUpdate }: Props) {
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(aiAutoReplyProp);
  const [isUpdatingAutoReply, setIsUpdatingAutoReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatique désactivé
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  useEffect(() => {
    setAiAutoReply(aiAutoReplyProp);
  }, [aiAutoReplyProp]);

  const handleToggleAutoReply = async () => {
    const newValue = aiAutoReply === 1 ? 0 : 1;
    setIsUpdatingAutoReply(true);
    try {
      const response = await axios.patch(`/api/admin/conversations/${conversation.id}/auto-reply`, {
        ai_auto_reply: newValue
      });
      console.log('✅ Auto-reply updated:', response.data);
      setAiAutoReply(newValue);
      // Update parent state to persist across view changes
      onAutoReplyUpdate(conversation.id, newValue);
      if (onConversationUpdate) {
        onConversationUpdate();
      }
    } catch (error: any) {
      console.error('❌ Error updating auto-reply setting:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
      alert(`Erreur lors de la mise à jour du paramètre: ${errorMessage}`);
    } finally {
      setIsUpdatingAutoReply(false);
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(conversation.id, messageInput.trim());
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace('whatsapp:', '');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <h2>{formatPhoneNumber(conversation.phone_number)}</h2>
          <span className="online-status">WhatsApp</span>
        </div>
        <div className="chat-header-actions">
          <div className="auto-reply-control">
            <span className="auto-reply-label">Mode réponse:</span>
            <button
              className={`auto-reply-toggle ${aiAutoReply === 1 ? 'active' : ''}`}
              onClick={handleToggleAutoReply}
              disabled={isUpdatingAutoReply}
              title={aiAutoReply === 1 ? 'Cliquez pour désactiver la réponse automatique IA' : 'Cliquez pour activer la réponse automatique IA'}
            >
              {aiAutoReply === 1 ? '🤖 IA' : '👤 Humain'}
            </button>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>Début de la conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.sender === 'client' ? 'client' : 'concierge'}`}>
              <div className="message-content">
                <p>{message.message}</p>
                <div className="message-footer">
                  <span className="message-time">{formatTime(message.created_at)}</span>
                  {message.sender === 'concierge' && (
                    <span className="ai-badge-inline">
                      {message.is_ai === 1 ? '🤖 IA' : '👤 Humain'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        <div className="input-row">
          <textarea
            className="message-input"
            placeholder="Tapez votre message ici..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            disabled={isSending}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
