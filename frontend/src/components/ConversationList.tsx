import { Conversation } from '../types';
import './ConversationList.css';

interface Props {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

function ConversationList({ conversations, selectedConversation, onSelectConversation }: Props) {
  const formatTime = (dateString: string) => {
    // SQLite stores dates as "YYYY-MM-DD HH:MM:SS" without timezone
    // Parse it as local time by treating it as a local datetime string
    let date: Date;
    if (dateString.includes('T')) {
      // ISO format with timezone
      date = new Date(dateString);
    } else {
      // SQLite format: "YYYY-MM-DD HH:MM:SS" - treat as local time
      const [datePart, timePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number);
      date = new Date(year, month - 1, day, hour, minute, second || 0);
    }
    
    const now = new Date();
    
    // Check if same day
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
      return timeStr;
    } else if (isYesterday) {
      return `Hier ${timeStr}`;
    } else {
      // Check if within last 7 days
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
        return `${dayName} ${timeStr}`;
      } else {
        // Older than a week: show date and time
        const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return `${dateStr} ${timeStr}`;
      }
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace('whatsapp:', '');
  };

  const getAvatarEmoji = (phoneNumber: string) => {
    // Liste d'emojis sympas
    const emojis = ['😊', '😎', '🤩', '😍', '🥳', '😇', '🤗', '😋', '😄', '😃', 
                    '😁', '🤓', '🧐', '😏', '😌', '😉', '😊', '🙂', '🤔', '😴',
                    '🤤', '😪', '😵', '🤯', '🥶', '😱', '🤠', '🥸', '😷', '🤒'];
    
    // Utiliser le numéro de téléphone comme seed pour sélectionner un emoji de manière déterministe
    const cleanNumber = phoneNumber.replace(/\D/g, ''); // Garder seulement les chiffres
    const seed = parseInt(cleanNumber.slice(-4) || '0', 10); // Prendre les 4 derniers chiffres
    const index = seed % emojis.length;
    return emojis[index];
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
              {getAvatarEmoji(conversation.phone_number)}
            </div>
            <div className="conversation-info">
              <div className="conversation-header">
                <h3>{formatPhoneNumber(conversation.phone_number)}</h3>
                <span className="time">{formatTime(conversation.last_message_at)}</span>
              </div>
              <p className="last-message">{conversation.last_message || 'Nouvelle conversation'}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ConversationList;
