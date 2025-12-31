import { useState, useEffect } from 'react';
import axios from 'axios';
import { Conversation, Message } from './types';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import FAQ from './components/FAQ';
import Statistics from './components/Statistics';
import './App.css';

// Configure axios base URL from environment variable or default to localhost for dev
const getApiUrl = () => {
  // @ts-ignore - Vite replaces import.meta.env at build time
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    // @ts-ignore
    return import.meta.env.VITE_API_URL;
  }
  // Fallback: check window location for production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // If we're on Render, use the backend URL
    return 'https://conciergerie-whatsapp-ai.onrender.com';
  }
  return 'http://localhost:3000';
};

const API_URL = getApiUrl();
axios.defaults.baseURL = API_URL;

// Setup axios interceptor for auth token
const setupAxiosInterceptor = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<'conversations' | 'faq' | 'statistics'>('conversations');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [conciergerie, setConciergerie] = useState<{ id: number; name: string; email: string } | null>(null);
  const [displayedConversations, setDisplayedConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationAutoReply, setConversationAutoReply] = useState<Record<number, number>>({});
  const [showFeatureRequestModal, setShowFeatureRequestModal] = useState(false);
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [featurePriority, setFeaturePriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        setupAxiosInterceptor(token);
        const response = await axios.get('/api/auth/me');
        if (response.data.success) {
          setIsAuthenticated(true);
          setConciergerie(response.data.conciergerie);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
        setupAxiosInterceptor(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Handle login success
  const handleLoginSuccess = (token: string, conciergerieData: { id: number; name: string; email: string }) => {
    localStorage.setItem('auth_token', token);
    setupAxiosInterceptor(token);
    setIsAuthenticated(true);
    setConciergerie(conciergerieData);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setupAxiosInterceptor(null);
      setIsAuthenticated(false);
      setConciergerie(null);
      setDisplayedConversations([]);
      setSelectedConversation(null);
      setMessages([]);
    }
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/conversations');
      const fetchedConversations = response.data;
      setConversations(fetchedConversations);
      
      // Update conversationAutoReply state with current values from DB
      // Only update if not already set (preserve user's manual changes)
      setConversationAutoReply(prev => {
        const updated = { ...prev };
        fetchedConversations.forEach((conv: Conversation) => {
          if (!(conv.id in updated)) {
            updated[conv.id] = conv.ai_auto_reply ?? 1;
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: number) => {
    try {
      const response = await axios.get(`/api/conversations/${conversationId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async (conversationId: number, message: string) => {
    try {
      await axios.post(`/api/conversations/${conversationId}/send`, { message });
      // Refresh messages
      await fetchMessages(conversationId);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  // Select conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    
    // Initialize auto-reply state for this conversation if not already set
    if (!(conversation.id in conversationAutoReply)) {
      setConversationAutoReply(prev => ({
        ...prev,
        [conversation.id]: conversation.ai_auto_reply ?? 1
      }));
    }
  };

  // Handle auto-reply toggle update
  const handleAutoReplyUpdate = (conversationId: number, aiAutoReply: number) => {
    setConversationAutoReply(prev => ({
      ...prev,
      [conversationId]: aiAutoReply
    }));
  };

  // Submit feature request
  const handleSubmitFeatureRequest = async () => {
    if (!featureTitle.trim() || !featureDescription.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      await axios.post('/api/feature-requests', {
        title: featureTitle,
        description: featureDescription,
        priority: featurePriority
      });
      alert('Demande envoyée avec succès!');
      setShowFeatureRequestModal(false);
      setFeatureTitle('');
      setFeatureDescription('');
      setFeaturePriority('medium');
    } catch (error) {
      console.error('Error submitting feature request:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  // Poll for new messages
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversation, isAuthenticated]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>
            <span className="header-icon">💎</span>
            {conciergerie?.name || 'Conciergerie'}
          </h1>
          <div className="status">
            <span className="status-dot"></span>
            <span>Connecté</span>
            <button 
              onClick={handleLogout}
              style={{ 
                marginLeft: '10px', 
                padding: '6px 12px', 
                fontSize: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="tab-switcher">
          <button
            className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversations')}
          >
            💬 Conversations
          </button>
          <button
            className={`tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            ❓ FAQ
          </button>
          <button
            className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            📊 Statistiques
          </button>
        </div>

        <button className="feature-request-btn" onClick={() => setShowFeatureRequestModal(true)}>
          + Demander une fonctionnalité
        </button>

        {activeTab === 'conversations' && (
          <ConversationList
            conversations={displayedConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onSearchResults={setDisplayedConversations}
          />
        )}
      </div>
      <div className="main-content">
        {activeTab === 'statistics' ? (
          <Statistics />
        ) : activeTab === 'conversations' ? (
          selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={sendMessage}
              onConversationUpdate={fetchConversations}
              aiAutoReply={conversationAutoReply[selectedConversation.id] ?? selectedConversation.ai_auto_reply ?? 1}
              onAutoReplyUpdate={handleAutoReplyUpdate}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h2>Bienvenue dans le Dashboard</h2>
              <p>Sélectionnez une conversation dans la liste pour commencer</p>
            </div>
          )
        ) : (
          <FAQ />
        )}
      </div>

      {showFeatureRequestModal && (
        <div className="modal-overlay" onClick={() => setShowFeatureRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Demander une fonctionnalité</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="Titre de la demande..."
              value={featureTitle}
              onChange={(e) => setFeatureTitle(e.target.value)}
            />
            <textarea
              className="modal-textarea"
              placeholder="Description détaillée..."
              value={featureDescription}
              onChange={(e) => setFeatureDescription(e.target.value)}
              rows={5}
            />
            <select
              className="modal-select"
              value={featurePriority}
              onChange={(e) => setFeaturePriority(e.target.value as 'low' | 'medium' | 'high')}
            >
              <option value="low">Priorité Basse</option>
              <option value="medium">Priorité Moyenne</option>
              <option value="high">Priorité Haute</option>
            </select>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowFeatureRequestModal(false)}>
                Annuler
              </button>
              <button className="modal-submit" onClick={handleSubmitFeatureRequest}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
