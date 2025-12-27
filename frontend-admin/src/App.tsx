import { useState, useEffect } from 'react';
import axios from 'axios';
import { FeatureRequest, Conversation, Message } from './types';
import FeatureRequests from './components/FeatureRequests';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import Conciergeries from './components/Conciergeries';
import './App.css';

interface Conciergerie {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'conversations' | 'features' | 'conciergeries'>('conversations');
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);

  // Fetch conversations (admin endpoint to get ALL conversations)
  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/admin/conversations');
      setConversations(response.data);
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
      await axios.post('/api/feature-requests', { title, description, priority });
      await fetchFeatureRequests();
    } catch (error) {
      console.error('Error adding feature request:', error);
      alert('Erreur lors de l\'ajout de la demande');
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

  // Select conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  // Poll for new data
  useEffect(() => {
    fetchConversations();
    fetchFeatureRequests();
    fetchConciergeries();
    const interval = setInterval(() => {
      fetchConversations();
      fetchFeatureRequests();
      fetchConciergeries();
      if (selectedConversation) {
        fetchMessages(selectedConversation.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

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
            className={`tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            🚀 Features
          </button>
          <button
            className={`tab-btn ${activeTab === 'conciergeries' ? 'active' : ''}`}
            onClick={() => setActiveTab('conciergeries')}
          >
            🏢 Conciergeries
          </button>
        </div>

        {activeTab === 'conversations' ? (
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
          />
        ) : activeTab === 'features' ? (
          <div className="sidebar-stats">
            <div className="stat-card">
              <div className="stat-number">{featureRequests.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{featureRequests.filter(r => r.status === 'pending').length}</div>
              <div className="stat-label">En attente</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{featureRequests.filter(r => r.status === 'in_progress').length}</div>
              <div className="stat-label">En cours</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{featureRequests.filter(r => r.status === 'completed').length}</div>
              <div className="stat-label">Terminé</div>
            </div>
          </div>
        ) : (
          <div className="sidebar-stats">
            <div className="stat-card">
              <div className="stat-number">{conciergeries.length}</div>
              <div className="stat-label">Conciergeries</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{conversations.length}</div>
              <div className="stat-label">Conversations</div>
            </div>
          </div>
        )}
      </div>

      <div className="main-content">
        {activeTab === 'conversations' ? (
          selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={sendMessage}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h2>Administration des Conversations</h2>
              <p>Sélectionnez une conversation pour voir tous les messages</p>
            </div>
          )
        ) : activeTab === 'features' ? (
          <FeatureRequests
            featureRequests={featureRequests}
            onAddRequest={addFeatureRequest}
            onUpdateStatus={updateFeatureRequestStatus}
            onDeleteRequest={deleteFeatureRequest}
          />
        ) : (
          <Conciergeries
            conciergeries={conciergeries}
            onCreateConciergerie={createConciergerie}
          />
        )}
      </div>
    </div>
  );
}

export default App;
