import { useState, useEffect } from 'react';
import axios from 'axios';
import WhatsAppOnboarding from './WhatsAppOnboarding';
import './PhoneRouting.css';

interface PhoneRoute {
  phone_number: string;
  conciergerie_id: number;
  conciergerie_name?: string;
}

interface Conciergerie {
  id: number;
  name: string;
}

interface ConciergerieFull {
  id: number;
  name: string;
  email: string;
  whatsapp_number?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  sandbox_join_code?: string;
  created_at: string;
}

interface PhoneRoutingProps {
  conciergerieId: number | null;
  conciergeries: ConciergerieFull[];
  onUpdateJoinCode: (id: number, code: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function PhoneRouting({ conciergerieId, conciergeries: allConciergeries, onUpdateJoinCode, onRefresh }: PhoneRoutingProps) {
  const [routes, setRoutes] = useState<PhoneRoute[]>([]);
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedConciergerieId, setSelectedConciergerieId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<'routing' | 'onboarding'>('routing');

  useEffect(() => {
    fetchRoutes();
  }, [conciergerieId]);

  // Convert full conciergeries to simple format for select
  useEffect(() => {
    const simpleConciergeries = allConciergeries.map(c => ({ id: c.id, name: c.name }));
    setConciergeries(simpleConciergeries);
  }, [allConciergeries]);

  const fetchRoutes = async () => {
    try {
      const response = await axios.get('/api/admin/phone-routing');
      const allRoutes = response.data;

      // Filter client-side if specific conciergerie is selected
      if (conciergerieId) {
        const filtered = allRoutes.filter((route: PhoneRoute) => route.conciergerie_id === conciergerieId);
        setRoutes(filtered);
      } else {
        setRoutes(allRoutes);
      }
    } catch (error) {
      console.error('Error fetching phone routes:', error);
      setRoutes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetConciergerieId = conciergerieId || selectedConciergerieId;

    if (!targetConciergerieId) {
      alert('Veuillez sélectionner une conciergerie');
      return;
    }

    setIsSubmitting(true);

    try {
      // Format phone number with whatsapp: prefix
      const formattedPhone = phoneNumber.startsWith('whatsapp:')
        ? phoneNumber
        : phoneNumber.startsWith('+')
        ? `whatsapp:${phoneNumber}`
        : `whatsapp:+${phoneNumber}`;

      await axios.post('/api/admin/phone-routing', {
        phone_number: formattedPhone,
        conciergerie_id: targetConciergerieId,
      });

      await fetchRoutes();
      setShowModal(false);
      setPhoneNumber('');
      setSelectedConciergerieId(null);
    } catch (error) {
      console.error('Error adding phone route:', error);
      alert('Erreur lors de l\'ajout du numéro locataire');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (phoneNumber: string) => {
    if (!confirm(`Supprimer le numéro locataire ${phoneNumber} ?`)) return;

    try {
      await axios.delete(`/api/admin/phone-routing/${encodeURIComponent(phoneNumber)}`);
      await fetchRoutes();
    } catch (error) {
      console.error('Error deleting phone route:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace('whatsapp:', '');
  };

  return (
    <div className="phone-routing-container">
      <div className="routing-header">
        <div>
          <h2>📞 Locataires</h2>
          <p className="routing-subtitle">
            Gérez les numéros de téléphone locataires et la configuration WhatsApp
          </p>
        </div>
        <div className="header-actions">
          <div className="section-tabs">
            <button
              className={`section-tab ${activeSection === 'routing' ? 'active' : ''}`}
              onClick={() => setActiveSection('routing')}
            >
              📱 Locataires
            </button>
            <button
              className={`section-tab ${activeSection === 'onboarding' ? 'active' : ''}`}
              onClick={() => setActiveSection('onboarding')}
            >
              🔗 Conciergerie
            </button>
          </div>
          {activeSection === 'routing' && (
            <button className="add-route-btn" onClick={() => setShowModal(true)}>
              + Ajouter un numéro
            </button>
          )}
        </div>
      </div>

      {activeSection === 'onboarding' ? (
        <WhatsAppOnboarding
          conciergerieId={conciergerieId || 'all'}
          conciergeries={allConciergeries}
          onUpdateJoinCode={async (id: number, code: string) => {
            await onUpdateJoinCode(id, code);
          }}
          onRefresh={onRefresh}
        />
      ) : (
        <>

      <div className="routes-list">
        {routes.length === 0 ? (
          <div className="routes-empty">
            <div className="empty-icon">📱</div>
            <h3>Aucun numéro locataire configuré</h3>
            <p>
              Ajoutez des numéros de téléphone pour router automatiquement les messages
              vers les bonnes conciergeries
            </p>
          </div>
        ) : (
          <div className="routes-grid">
            {routes.map((route) => (
              <div key={route.phone_number} className="route-card">
                <div className="route-info">
                  <div className="route-phone">
                    <span className="phone-icon">📱</span>
                    <span className="phone-number">{formatPhoneNumber(route.phone_number)}</span>
                  </div>
                  {!conciergerieId && route.conciergerie_name && (
                    <div className="route-conciergerie">
                      <span className="arrow">→</span>
                      <span className="conciergerie-badge">
                        💎 {route.conciergerie_name}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  className="delete-route-btn"
                  onClick={() => handleDelete(route.phone_number)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Ajouter un numéro locataire</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="phone">Numéro de téléphone locataire</label>
                <input
                  id="phone"
                  type="text"
                  className="modal-input"
                  placeholder="Ex: +33612345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <small className="form-hint">
                  Format international (ex: +33612345678, +14155551234)
                </small>
              </div>

              {!conciergerieId && (
                <div className="form-group">
                  <label htmlFor="conciergerie">Conciergerie</label>
                  <select
                    id="conciergerie"
                    className="modal-select"
                    value={selectedConciergerieId || ''}
                    onChange={(e) => setSelectedConciergerieId(Number(e.target.value))}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Sélectionner une conciergerie</option>
                    {conciergeries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-info">
                <strong>ℹ️ Comment ça marche ?</strong>
                <p>
                  Quand un locataire envoie un message depuis ce numéro, il sera automatiquement
                  routé vers la conciergerie sélectionnée avec ses FAQs et conversations dédiées.
                </p>
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
                  {isSubmitting ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default PhoneRouting;
