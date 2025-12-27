import { useState } from 'react';
import './Conciergeries.css';

interface Conciergerie {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface ConciegeriesProps {
  conciergeries: Conciergerie[];
  onCreateConciergerie: (name: string, email: string, password: string) => Promise<boolean>;
}

function Conciergeries({ conciergeries, onCreateConciergerie }: ConciegeriesProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <table className="conciergeries-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Date de création</th>
              </tr>
            </thead>
            <tbody>
              {conciergeries.map((conciergerie) => (
                <tr key={conciergerie.id}>
                  <td className="id-cell">{conciergerie.id}</td>
                  <td className="name-cell">
                    <span className="conciergerie-icon">💎</span>
                    {conciergerie.name}
                  </td>
                  <td className="email-cell">{conciergerie.email}</td>
                  <td className="date-cell">{formatDate(conciergerie.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <label htmlFor="email">Email de connexion</label>
                <input
                  id="email"
                  type="email"
                  className="modal-input"
                  placeholder="contact@conciergerie.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
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
    </div>
  );
}

export default Conciergeries;
