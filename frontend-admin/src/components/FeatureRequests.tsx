import { useState } from 'react';
import { FeatureRequest } from '../types';
import './FeatureRequests.css';

interface Props {
  featureRequests: FeatureRequest[];
  onAddRequest: (title: string, description: string, priority: FeatureRequest['priority']) => void;
  onUpdateStatus: (id: number, status: FeatureRequest['status']) => void;
  onDeleteRequest: (id: number) => void;
}

function FeatureRequests({ featureRequests, onAddRequest, onUpdateStatus, onDeleteRequest }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeatureRequest['priority']>('medium');

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    onAddRequest(title, description, priority);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setShowForm(false);
  };

  const getStatusLabel = (status: FeatureRequest['status']) => {
    const labels = {
      pending: 'En attente',
      in_progress: 'En cours',
      completed: 'Terminé',
      rejected: 'Rejeté'
    };
    return labels[status];
  };

  const getPriorityLabel = (priority: FeatureRequest['priority']) => {
    const labels = {
      low: 'Basse',
      medium: 'Moyenne',
      high: 'Haute'
    };
    return labels[priority];
  };

  return (
    <div className="feature-requests">
      <div className="feature-requests-header">
        <h2>🚀 Demandes de Fonctionnalités</h2>
        <button className="add-request-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Annuler' : '+ Nouvelle demande'}
        </button>
      </div>

      {showForm && (
        <div className="request-form">
          <input
            type="text"
            className="request-input"
            placeholder="Titre de la fonctionnalité..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="request-textarea"
            placeholder="Description détaillée..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className="form-footer">
            <select
              className="priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as FeatureRequest['priority'])}
            >
              <option value="low">Priorité Basse</option>
              <option value="medium">Priorité Moyenne</option>
              <option value="high">Priorité Haute</option>
            </select>
            <button className="submit-request-btn" onClick={handleSubmit}>
              Soumettre
            </button>
          </div>
        </div>
      )}

      <div className="requests-list">
        {featureRequests.length === 0 ? (
          <div className="no-requests">
            <p>Aucune demande de fonctionnalité</p>
            <p className="hint">Cliquez sur "+ Nouvelle demande" pour en ajouter une</p>
          </div>
        ) : (
          featureRequests.map((request) => (
            <div key={request.id} className={`request-card ${request.status}`}>
              <div className="request-header">
                <h3>{request.title}</h3>
                <div className="request-badges">
                  <span className={`priority-badge ${request.priority}`}>
                    {getPriorityLabel(request.priority)}
                  </span>
                  <span className={`status-badge ${request.status}`}>
                    {getStatusLabel(request.status)}
                  </span>
                </div>
              </div>
              <p className="request-description">{request.description}</p>
              <div className="request-footer">
                <span className="request-date">
                  Créé le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                </span>
                <div className="request-actions">
                  <select
                    className="status-select"
                    value={request.status}
                    onChange={(e) => onUpdateStatus(request.id, e.target.value as FeatureRequest['status'])}
                  >
                    <option value="pending">En attente</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                  <button
                    className="delete-btn"
                    onClick={() => onDeleteRequest(request.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FeatureRequests;
