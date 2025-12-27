import { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '../types';
import './ChatWindow.css';

interface Props {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (conversationId: number, message: string) => Promise<void>;
}

function ChatWindow({ conversation, messages, onSendMessage }: Props) {
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
                    <span className="ai-badge-inline">🤖 IA</span>
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
