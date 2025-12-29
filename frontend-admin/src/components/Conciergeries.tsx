import { useState } from 'react';
import axios from 'axios';
import './Conciergeries.css';

interface Conciergerie {
  id: number;
  name: string;
  email: string;
  whatsapp_number?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  created_at: string;
}

interface ConciegeriesProps {
  conciergeries: Conciergerie[];
  onCreateConciergerie: (name: string, email: string, password: string) => Promise<boolean>;
  onUpdateConciergerie: (id: number, name: string, email: string, password: string) => Promise<boolean>;
  onDeleteConciergerie: (id: number) => Promise<boolean>;
  onRefresh: () => void;
}

function Conciergeries({ conciergeries, onCreateConciergerie, onUpdateConciergerie, onDeleteConciergerie, onRefresh }: ConciegeriesProps) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingConciergerie, setEditingConciergerie] = useState<Conciergerie | null>(null);
  const [deletingConciergerie, setDeletingConciergerie] = useState<Conciergerie | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const success = await onCreateConciergerie(name, email, password);

    setIsSubmitting(false);

    if (success) {
      setShowModal(false);
      setName('');
      setEmail('');
      setPassword('');
    }
  };

  const handleEdit = async (conciergerie: Conciergerie) => {
    setEditingConciergerie(conciergerie);
    setName(conciergerie.name);
    setEmail(conciergerie.email);
    
    // Try to load current password
    try {
      const response = await axios.get(`/api/admin/conciergeries/${conciergerie.id}/credentials`);
      const currentPassword = response.data.password;
      // Only set password if it's valid (not the error message)
      if (currentPassword && currentPassword !== 'Non disponible - Veuillez réinitialiser le mot de passe') {
        setPassword(currentPassword);
      } else {
        setPassword('');
      }
    } catch (error) {
      console.error('Error fetching password:', error);
      setPassword('');
    }
    
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConciergerie) return;

    setIsSubmitting(true);
    // Update with password only if provided (not empty), otherwise keep existing
    // Pass undefined if empty so backend doesn't update password
    const passwordToUpdate = password.trim() ? password : undefined;
    const success = await onUpdateConciergerie(editingConciergerie.id, name, email, passwordToUpdate || '');
    setIsSubmitting(false);

    if (success) {
      setShowEditModal(false);
      setEditingConciergerie(null);
      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      await onRefresh();
    }
  };

  const handleDeleteClick = (conciergerie: Conciergerie) => {
    setDeletingConciergerie(conciergerie);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingConciergerie) return;

    setIsSubmitting(true);
    const success = await onDeleteConciergerie(deletingConciergerie.id);
    setIsSubmitting(false);

    if (success) {
      setShowDeleteConfirm(false);
      setDeletingConciergerie(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papier !');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="conciergeries-container">
      <div className="conciergeries-header">
        <h2>Gestion des Conciergeries</h2>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          + Nouvelle Conciergerie
        </button>
      </div>

      <div className="conciergeries-list">
        {conciergeries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <p>Aucune conciergerie créée</p>
            <button className="add-btn-secondary" onClick={() => setShowModal(true)}>
              Créer la première
            </button>
          </div>
        ) : (
          <div className="conciergeries-cards">
            {conciergeries.map((conciergerie) => (
              <div key={conciergerie.id} className="conciergerie-card">
                <div className="card-header-simple">
                  <div className="card-info">
                    <div className="card-title">
                      <span className="conciergerie-icon">💎</span>
                      <h3>{conciergerie.name}</h3>
                    </div>
                    <div className="card-meta">
                      <span className="card-email">👤 {conciergerie.email}</span>
                      <span className="card-date">📅 {formatDate(conciergerie.created_at)}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(conciergerie)}
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteClick(conciergerie)}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Créer une nouvelle conciergerie</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Nom de la conciergerie</label>
                <input
                  id="name"
                  type="text"
                  className="modal-input"
                  placeholder="Ma Conciergerie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Login</label>
                <input
                  id="email"
                  type="text"
                  className="modal-input"
                  placeholder="conciergerie1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <small className="form-hint">Identifiant de connexion</small>
              </div>

              <div className="form-group">
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  type="password"
                  className="modal-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isSubmitting}
                />
                <small className="form-hint">Minimum 6 caractères</small>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Modifier la conciergerie</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label htmlFor="edit-name">Nom de la conciergerie</label>
                <input
                  id="edit-name"
                  type="text"
                  className="modal-input"
                  placeholder="Ma Conciergerie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-email">Login</label>
                <input
                  id="edit-email"
                  type="text"
                  className="modal-input"
                  placeholder="conciergerie1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <small className="form-hint">Identifiant de connexion</small>
              </div>

              <div className="form-group">
                <label htmlFor="edit-password">Mot de passe</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    id="edit-password"
                    type={showPassword ? 'text' : 'password'}
                    className="modal-input"
                    placeholder="Laissez vide pour conserver l'actuel"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    disabled={isSubmitting}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    style={{ 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '5px', 
                      background: 'white', 
                      cursor: 'pointer',
                      fontSize: '18px'
                    }}
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <small className="form-hint">
                  {password ? 'Nouveau mot de passe (minimum 6 caractères)' : 'Laissez vide pour conserver le mot de passe actuel'}
                </small>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingConciergerie(null);
                    setName('');
                    setEmail('');
                    setPassword('');
                    setShowPassword(false);
                  }}
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && deletingConciergerie && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowDeleteConfirm(false)}>
          <div className="modal-content modal-delete" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmer la suppression</h2>
            <p>Êtes-vous sûr de vouloir supprimer la conciergerie <strong>{deletingConciergerie.name}</strong> ?</p>
            <p className="warning-text">⚠️ Cette action est irréversible et supprimera toutes les données associées.</p>
            <div className="modal-buttons">
              <button
                type="button"
                className="modal-cancel"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingConciergerie(null);
                }}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="modal-submit modal-delete-btn"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Conciergeries;
