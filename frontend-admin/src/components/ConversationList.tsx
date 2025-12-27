import { Conversation } from '../types';
import './ConversationList.css';

interface Props {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

function ConversationList({ conversations, selectedConversation, onSelectConversation }: Props) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace('whatsapp:', '');
  };

  return (
    <div className="conversation-list">
      {conversations.length === 0 ? (
        <div className="no-conversations">
          <p>Aucune conversation pour le moment</p>
          <p className="hint">Les messages WhatsApp apparaîtront ici</p>
        </div>
      ) : (
        conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
            onClick={() => onSelectConversation(conversation)}
          >
            <div className="avatar">
              {formatPhoneNumber(conversation.phone_number).slice(-2)}
            </div>
            <div className="conversation-info">
              <div className="conversation-header">
                <h3>{formatPhoneNumber(conversation.phone_number)}</h3>
                <span className="time">{formatTime(conversation.last_message_at)}</span>
              </div>
              {conversation.conciergerie_name && (
                <div className="conciergerie-badge">💎 {conversation.conciergerie_name}</div>
              )}
              <p className="last-message">{conversation.last_message || 'Nouvelle conversation'}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ConversationList;
