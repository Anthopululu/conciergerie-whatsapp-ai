import { useState, useEffect } from 'react';
import axios from 'axios';
import './WhatsAppConfig.css';

interface Conciergerie {
  id: number;
  name: string;
  email: string;
  whatsapp_number?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  created_at: string;
}

interface WhatsAppConfigProps {
  conciergerie: Conciergerie;
  onUpdate: () => void;
}

function WhatsAppConfig({ conciergerie, onUpdate }: WhatsAppConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    // Populate form with existing values when editing
    if (isEditing) {
      setWhatsappNumber(conciergerie.whatsapp_number || '');
      setTwilioSid(conciergerie.twilio_account_sid || '');
      setTwilioToken(conciergerie.twilio_auth_token || '');
    }
  }, [isEditing, conciergerie]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Ensure whatsapp number has correct prefix
      const formattedNumber = whatsappNumber.startsWith('whatsapp:')
        ? whatsappNumber
        : `whatsapp:${whatsappNumber}`;

      // Ensure we have the admin token in headers
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        alert('Erreur: Vous devez être connecté en tant qu\'administrateur');
        setIsSubmitting(false);
        return;
      }

      await axios.patch(`/api/admin/conciergeries/${conciergerie.id}/whatsapp`, {
        whatsapp_number: formattedNumber,
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      alert('Configuration WhatsApp mise à jour avec succès !');
      setIsEditing(false);

      // Update local conciergerie object to reflect changes immediately
      conciergerie.whatsapp_number = formattedNumber;
      conciergerie.twilio_account_sid = twilioSid;
      conciergerie.twilio_auth_token = twilioToken;

      onUpdate(); // Refresh parent component
    } catch (error) {
      console.error('Error updating WhatsApp config:', error);
      alert('Erreur lors de la mise à jour de la configuration WhatsApp');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setWhatsappNumber('');
    setTwilioSid('');
    setTwilioToken('');
    setShowToken(false);
  };

  const isConfigured = !!(
    conciergerie.whatsapp_number &&
    conciergerie.twilio_account_sid
  );

  if (!isEditing) {
    return (
      <div className="whatsapp-config-display">
        <div className="config-header">
          <h3>📱 Configuration WhatsApp</h3>
          {isConfigured ? (
            <span className="config-status configured">✅ Configuré</span>
          ) : (
            <span className="config-status not-configured">⚠️ Non configuré</span>
          )}
        </div>

        {isConfigured ? (
          <div className="config-details">
            <div className="config-item">
              <span className="config-label">Numéro WhatsApp:</span>
              <span className="config-value">{conciergerie.whatsapp_number}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Twilio Account SID:</span>
              <span className="config-value">{conciergerie.twilio_account_sid}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Auth Token:</span>
              <span className="config-value">••••••••••••</span>
            </div>
          </div>
        ) : (
          <p className="config-empty">
            Aucune configuration WhatsApp. Cliquez sur "Configurer" pour ajouter les identifiants Twilio.
          </p>
        )}

        <button className="config-edit-btn" onClick={() => setIsEditing(true)}>
          {isConfigured ? '✏️ Modifier' : '⚙️ Configurer'}
        </button>
      </div>
    );
  }

  return (
    <div className="whatsapp-config-form">
      <div className="config-header">
        <h3>📱 Configuration WhatsApp - {conciergerie.name}</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="whatsapp-number">Numéro WhatsApp Twilio</label>
          <input
            id="whatsapp-number"
            type="text"
            className="form-input"
            placeholder="Ex: +14155238886 ou whatsapp:+14155238886"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            required
            disabled={isSubmitting}
          />
          <small className="form-hint">
            Numéro WhatsApp fourni par Twilio (avec ou sans préfixe "whatsapp:")
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="twilio-sid">Twilio Account SID</label>
          <input
            id="twilio-sid"
            type="text"
            className="form-input"
            placeholder="Ex: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={twilioSid}
            onChange={(e) => setTwilioSid(e.target.value)}
            required
            disabled={isSubmitting}
          />
          <small className="form-hint">
            Account SID disponible dans votre console Twilio
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="twilio-token">Twilio Auth Token</label>
          <div className="token-input-wrapper">
            <input
              id="twilio-token"
              type={showToken ? 'text' : 'password'}
              className="form-input"
              placeholder="Ex: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={twilioToken}
              onChange={(e) => setTwilioToken(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="toggle-token-btn"
              onClick={() => setShowToken(!showToken)}
              disabled={isSubmitting}
            >
              {showToken ? '🙈' : '👁️'}
            </button>
          </div>
          <small className="form-hint">
            Auth Token disponible dans votre console Twilio
          </small>
        </div>

        <div className="form-info">
          <strong>ℹ️ Important:</strong>
          <ul>
            <li>Ces identifiants proviennent de votre compte Twilio</li>
            <li>Le numéro WhatsApp doit être configuré dans Twilio Console</li>
            <li>Configurez le webhook Twilio pour pointer vers votre serveur</li>
          </ul>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default WhatsAppConfig;
