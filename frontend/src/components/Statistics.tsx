import { useState, useEffect } from 'react';
import axios from 'axios';
import './Statistics.css';

interface Statistics {
  totalConversations: number;
  totalMessages: number;
  aiMessages: number;
  humanMessages: number;
  avgResponseTime: number;
  conversationsToday: number;
  messagesToday: number;
}

function Statistics() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    const interval = setInterval(fetchStatistics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/statistics');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="statistics-loading">Chargement des statistiques...</div>;
  }

  if (!stats) {
    return <div className="statistics-error">Erreur lors du chargement des statistiques</div>;
  }

  const aiPercentage = stats.totalMessages > 0 
    ? Math.round((stats.aiMessages / stats.totalMessages) * 100) 
    : 0;
  const humanPercentage = stats.totalMessages > 0 
    ? Math.round((stats.humanMessages / stats.totalMessages) * 100) 
    : 0;

  return (
    <div className="statistics">
      <h2>📊 Statistiques</h2>
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-value">{stats.totalConversations}</div>
          <div className="stat-label">Conversations totales</div>
          <div className="stat-sub">{stats.conversationsToday} aujourd'hui</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-value">{stats.totalMessages}</div>
          <div className="stat-label">Messages total</div>
          <div className="stat-sub">{stats.messagesToday} aujourd'hui</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-value">{stats.aiMessages}</div>
          <div className="stat-label">Messages IA</div>
          <div className="stat-sub">{aiPercentage}% du total</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-value">{stats.humanMessages}</div>
          <div className="stat-label">Messages humains</div>
          <div className="stat-sub">{humanPercentage}% du total</div>
        </div>

        <div className="stat-card stat-card-large">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">
            {stats.avgResponseTime > 0 
              ? `${stats.avgResponseTime.toFixed(1)} min`
              : 'N/A'}
          </div>
          <div className="stat-label">Temps de réponse moyen</div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;

