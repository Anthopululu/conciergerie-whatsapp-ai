import { useState, useEffect } from 'react';
import axios from 'axios';
import { FeatureRequest, Conversation, Message } from './types';

// Configure axios base URL from environment variable or default to localhost for dev
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
axios.defaults.baseURL = API_URL;
import FeatureRequests from './components/FeatureRequests';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import Conciergeries from './components/Conciergeries';
import FAQAdmin from './components/FAQAdmin';
import PhoneRouting from './components/PhoneRouting';
import Login from './components/Login';
import './App.css';

interface Conciergerie {
  id: number;
  name: string;
  email: string;
  whatsapp_number?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  sandbox_join_code?: string;
  created_at: string;
}

function App() {
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [activeTab, setActiveTab] = useState<'conversations' | 'faqs' | 'routing' | 'conciergeries' | 'features'>('conversations');

  // Check admin session on mount and configure axios
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Set axios header immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify session is still valid
      axios.get('/api/admin/auth/check')
        .then(() => {
          // Session is valid, set token in state
          setAdminToken(token);
        })
        .catch(() => {
          // Session invalid, clear token
          setAdminToken(null);
          localStorage.removeItem('adminToken');
          delete axios.defaults.headers.common['Authorization'];
        });
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, []);

  // Update axios headers when adminToken changes
  useEffect(() => {
    if (adminToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [adminToken]);

  // Handle login success
  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('adminToken', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('/api/admin/auth/logout');
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setAdminToken(null);
    localStorage.removeItem('adminToken');
    delete axios.defaults.headers.common['Authorization'];
  };
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationAutoReply, setConversationAutoReply] = useState<Record<number, number>>({});
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);
  const [selectedConciergerieId, setSelectedConciergerieId] = useState<number | 'all'>('all');

  // Fetch conversations (admin endpoint to get ALL conversations)
  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/admin/conversations');
      console.log('📥 Conversations reçues:', response.data.length, 'conversations');
      console.log('📊 Données:', response.data);
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
      console.error('❌ Error fetching conversations:', error);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: number) => {
    try {
      const response = await axios.get(`/api/admin/conversations/${conversationId}/messages`);
      console.log(`📨 Messages reçus pour conversation ${conversationId}:`, response.data.length, 'messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async (conversationId: number, message: string) => {
    try {
      await axios.post(`/api/admin/conversations/${conversationId}/send`, { message });
      await fetchMessages(conversationId);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  // Fetch feature requests
  const fetchFeatureRequests = async () => {
    try {
      const response = await axios.get('/api/feature-requests');
      setFeatureRequests(response.data);
    } catch (error) {
      console.error('Error fetching feature requests:', error);
    }
  };

  const addFeatureRequest = async (title: string, description: string, priority: FeatureRequest['priority']) => {
    try {
      await axios.post('/api/admin/feature-requests', { title, description, priority });
      await fetchFeatureRequests();
    } catch (error: any) {
      console.error('Error adding feature request:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
      alert(`Erreur lors de l'ajout de la demande: ${errorMessage}`);
    }
  };

  const updateFeatureRequestStatus = async (id: number, status: FeatureRequest['status']) => {
    try {
      await axios.patch(`/api/feature-requests/${id}`, { status });
      await fetchFeatureRequests();
    } catch (error) {
      console.error('Error updating feature request:', error);
    }
  };

  const deleteFeatureRequest = async (id: number) => {
    try {
      await axios.delete(`/api/feature-requests/${id}`);
      await fetchFeatureRequests();
    } catch (error) {
      console.error('Error deleting feature request:', error);
    }
  };

  // Fetch conciergeries
  const fetchConciergeries = async () => {
    try {
      const response = await axios.get('/api/admin/conciergeries');
      setConciergeries(response.data);
    } catch (error) {
      console.error('Error fetching conciergeries:', error);
    }
  };

  // Create new conciergerie
  const createConciergerie = async (name: string, email: string, password: string) => {
    try {
      await axios.post('/api/admin/conciergeries', { name, email, password });
      await fetchConciergeries();
      return true;
    } catch (error: any) {
      console.error('Error creating conciergerie:', error);
      if (error.response?.status === 409) {
        alert('Cet email existe déjà');
      } else {
        alert('Erreur lors de la création de la conciergerie');
      }
      return false;
    }
  };

  // Update conciergerie
  const updateConciergerie = async (id: number, name: string, email: string, password: string) => {
    try {
      await axios.patch(`/api/admin/conciergeries/${id}`, { name, email, password: password || undefined });
      await fetchConciergeries();
      return true;
    } catch (error: any) {
      console.error('Error updating conciergerie:', error);
      if (error.response?.status === 409) {
        alert('Cet email existe déjà');
      } else {
        alert('Erreur lors de la modification de la conciergerie');
      }
      return false;
    }
  };

  // Delete conciergerie
  const deleteConciergerie = async (id: number) => {
    try {
      await axios.delete(`/api/admin/conciergeries/${id}`);
      await fetchConciergeries();
      return true;
    } catch (error) {
      console.error('Error deleting conciergerie:', error);
      alert('Erreur lors de la suppression de la conciergerie');
      return false;
    }
  };

  // Update sandbox join code
  const updateSandboxJoinCode = async (id: number, joinCode: string) => {
    try {
      console.log('🔄 Updating sandbox join code:', { id, joinCode });
      const response = await axios.patch(`/api/admin/conciergeries/${id}/sandbox`, { join_code: joinCode });
      console.log('✅ Update response:', response.data);
      
      // Force immediate refresh
      await fetchConciergeries();
      console.log('✅ Conciergeries refreshed');
      
      return true;
    } catch (error: any) {
      console.error('❌ Error updating sandbox join code:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
      alert(`Erreur lors de la mise à jour du code sandbox: ${errorMessage}`);
      return false;
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

  // Poll for new data (only if logged in)
  useEffect(() => {
    if (!adminToken) return;

    fetchConversations();
    fetchFeatureRequests();
    fetchConciergeries();
    const interval = setInterval(() => {
      fetchConversations();
      fetchFeatureRequests();
      // Don't refresh conciergeries when on conciergeries tab to avoid form reset
      if (activeTab !== 'conciergeries') {
        fetchConciergeries();
      }
      if (selectedConversation) {
        fetchMessages(selectedConversation.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversation, activeTab, adminToken]);

  // Filtrer conversations par conciergerie sélectionnée
  const filteredConversations = selectedConciergerieId === 'all'
    ? conversations
    : conversations.filter(c => c.conciergerie_id === selectedConciergerieId);

  console.log('🔍 État actuel:', {
    activeTab,
    totalConversations: conversations.length,
    filteredConversations: filteredConversations.length,
    selectedConciergerieId
  });

  // Show login if not authenticated
  if (!adminToken) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>
            <span className="header-icon">⚙️</span>
            Administration
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

        {/* Navigation principale divisée en sections */}
        <div className="nav-section">
          <div className="nav-section-header">Données Conciergerie</div>

          {/* Filtre conciergerie pour données */}
          <div className="conciergerie-filter">
            <select
              value={selectedConciergerieId}
              onChange={(e) => {
                const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setSelectedConciergerieId(value);
                setSelectedConversation(null);
              }}
            >
              <option value="all">Toutes les conciergeries</option>
              {conciergeries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="tab-switcher">
            <button
              className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('conversations');
                setSelectedConversation(null);
              }}
            >
              💬 Conversations
            </button>
            <button
              className={`tab-btn ${activeTab === 'faqs' ? 'active' : ''}`}
              onClick={() => setActiveTab('faqs')}
            >
              📚 FAQs
            </button>
            <button
              className={`tab-btn ${activeTab === 'routing' ? 'active' : ''}`}
              onClick={() => setActiveTab('routing')}
            >
              📞 Locataires
            </button>
          </div>
        </div>

        <div className="nav-divider"></div>

        {/* Navigation administration */}
        <div className="nav-section">
          <div className="nav-section-header">Administration</div>
          <div className="tab-switcher">
            <button
              className={`tab-btn ${activeTab === 'conciergeries' ? 'active' : ''}`}
              onClick={() => setActiveTab('conciergeries')}
            >
              🏢 Conciergeries
            </button>
            <button
              className={`tab-btn ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              🚀 Fonctionnalités
            </button>
          </div>
        </div>

      </div>

      <div className="main-content">
        {activeTab === 'conversations' && (
          <div className="conversations-layout">
            <div className="conversations-list-container">
              <ConversationList
                conversations={filteredConversations}
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
              />
            </div>
            <div className="chat-container">
              {selectedConversation ? (
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
                  <h2>Conversations</h2>
                  <p>Sélectionnez une conversation pour voir les messages</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'faqs' && (
          <FAQAdmin conciergerieId={selectedConciergerieId === 'all' ? null : selectedConciergerieId} />
        )}

        {activeTab === 'routing' && (
          <PhoneRouting 
            conciergerieId={selectedConciergerieId === 'all' ? null : selectedConciergerieId}
            conciergeries={conciergeries}
            onUpdateJoinCode={updateSandboxJoinCode}
            onRefresh={fetchConciergeries}
          />
        )}

        {activeTab === 'conciergeries' && (
          <Conciergeries
            conciergeries={conciergeries}
            onCreateConciergerie={createConciergerie}
            onUpdateConciergerie={updateConciergerie}
            onDeleteConciergerie={deleteConciergerie}
            onRefresh={fetchConciergeries}
          />
        )}

        {activeTab === 'features' && (
          <FeatureRequests
            featureRequests={featureRequests}
            onAddRequest={addFeatureRequest}
            onUpdateStatus={updateFeatureRequestStatus}
            onDeleteRequest={deleteFeatureRequest}
          />
        )}
      </div>
    </div>
  );
}

export default App;
