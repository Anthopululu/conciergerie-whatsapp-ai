import { useState, useEffect } from 'react';
import axios from 'axios';
import './WhatsAppOnboarding.css';

interface Conciergerie {
  id: number;
  name: string;
  whatsapp_number?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  sandbox_join_code?: string;
}

interface WhatsAppOnboardingProps {
  conciergerieId: number | 'all';
  conciergeries: Conciergerie[];
  onUpdateJoinCode: (id: number, code: string) => Promise<boolean>;
  onRefresh?: () => void;
}

function WhatsAppOnboarding({ conciergerieId, conciergeries, onUpdateJoinCode, onRefresh }: WhatsAppOnboardingProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sandboxNumber, setSandboxNumber] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [sandboxCode, setSandboxCode] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredConciergeries = conciergerieId === 'all'
    ? conciergeries
    : conciergeries.filter(c => c.id === conciergerieId);

  // Default Twilio sandbox number for WhatsApp
  const DEFAULT_TWILIO_SANDBOX_NUMBER = 'whatsapp:+14155238886';

  const formatPhoneNumber = (number?: string) => {
    if (!number) return '';
    return number.replace('whatsapp:', '');
  };

  const generateWhatsAppLink = (phoneNumber: string, code: string) => {
    if (!phoneNumber || !code) {
      return null;
    }
    const cleanNumber = phoneNumber.replace('whatsapp:', '').replace('+', '');
    const message = `join ${code}`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  // Get WhatsApp number for QR code generation (use sandbox number if not configured)
  const getWhatsAppNumberForQR = (conciergerie: Conciergerie): string | null => {
    // If conciergerie has a configured WhatsApp number, use it
    if (conciergerie.whatsapp_number) {
      return conciergerie.whatsapp_number;
    }
    // Otherwise, use default Twilio sandbox number if sandbox code exists
    if (conciergerie.sandbox_join_code) {
      return DEFAULT_TWILIO_SANDBOX_NUMBER;
    }
    return null;
  };

  const generateQRCodeUrl = (link: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
  };

  const handleSaveCode = async (conciergerieId: number) => {
    if (!joinCode.trim()) {
      alert('Veuillez entrer un code sandbox');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    
    try {
      const success = await onUpdateJoinCode(conciergerieId, joinCode.trim());
      setIsSubmitting(false);

      if (success) {
        setSuccessMessage('Code sandbox enregistré avec succès !');
        setEditingId(null);
        setJoinCode('');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        alert('Erreur lors de l\'enregistrement du code sandbox. Vérifiez la console pour plus de détails.');
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error in handleSaveCode:', error);
      alert('Erreur lors de l\'enregistrement du code sandbox');
    }
  };

  const handleEdit = (conciergerie: Conciergerie) => {
    setEditingId(conciergerie.id);
    setJoinCode(conciergerie.sandbox_join_code || '');
  };

  const handleEditConfig = (conciergerie: Conciergerie) => {
    setEditingConfigId(conciergerie.id);
    // Check if whatsapp_number is the default sandbox number
    const isDefaultSandbox = conciergerie.whatsapp_number === DEFAULT_TWILIO_SANDBOX_NUMBER || 
                             conciergerie.whatsapp_number === 'whatsapp:+14155238886' ||
                             (!conciergerie.whatsapp_number);
    // If it's the default sandbox, put it in sandboxNumber field, otherwise in whatsappNumber
    setWhatsappNumber(isDefaultSandbox ? '' : (conciergerie.whatsapp_number || ''));
    setSandboxNumber(isDefaultSandbox ? (conciergerie.whatsapp_number || DEFAULT_TWILIO_SANDBOX_NUMBER) : DEFAULT_TWILIO_SANDBOX_NUMBER);
    setTwilioSid(conciergerie.twilio_account_sid || '');
    setTwilioToken(conciergerie.twilio_auth_token || '');
    setSandboxCode(conciergerie.sandbox_join_code || '');
    setShowToken(false);
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (conciergerieId: number) => {
    if ((!whatsappNumber.trim() && !sandboxNumber.trim()) || !twilioSid.trim() || !twilioToken.trim()) {
      alert('Veuillez remplir tous les champs requis (au moins un numéro WhatsApp, Account SID, Auth Token)');
      return;
    }

    setIsSubmittingConfig(true);
    setSuccessMessage(null);

    try {
      // Use production number if provided, otherwise use sandbox number
      const numberToSave = whatsappNumber.trim() || sandboxNumber.trim();
      
      if (!numberToSave) {
        alert('Veuillez remplir au moins le numéro WhatsApp de production ou le numéro Sandbox');
        return;
      }

      // Ensure whatsapp number has correct prefix
      const formattedNumber = numberToSave.startsWith('whatsapp:')
        ? numberToSave
        : `whatsapp:${numberToSave}`;

      // Ensure we have the admin token in headers
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        alert('Erreur: Vous devez être connecté en tant qu\'administrateur');
        setIsSubmittingConfig(false);
        return;
      }

      await axios.patch(`/api/admin/conciergeries/${conciergerieId}/whatsapp`, {
        whatsapp_number: formattedNumber,
        twilio_account_sid: twilioSid.trim(),
        twilio_auth_token: twilioToken.trim(),
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      setSuccessMessage('Configuration Twilio enregistrée avec succès !');
      
      // Also update sandbox code if provided
      if (sandboxCode.trim()) {
        try {
          await onUpdateJoinCode(conciergerieId, sandboxCode.trim());
        } catch (error) {
          console.error('Error updating sandbox code:', error);
          // Don't fail the whole operation if sandbox code update fails
        }
      }
      handleCancelConfig();

      // Refresh conciergeries list
      if (onRefresh) {
        await onRefresh();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving Twilio config:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
      
      // If unauthorized, suggest re-login
      if (error.response?.status === 401) {
        alert('Votre session a expiré. Veuillez rafraîchir la page et vous reconnecter.');
        // Clear token and reload page
        localStorage.removeItem('adminToken');
        window.location.reload();
      } else {
        alert(`Erreur lors de l'enregistrement de la configuration Twilio: ${errorMessage}`);
      }
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  const handleCancelConfig = () => {
    setEditingConfigId(null);
    setWhatsappNumber('');
    setSandboxNumber('');
    setTwilioSid('');
    setTwilioToken('');
    setSandboxCode('');
    setShowToken(false);
    setShowConfigModal(false);
  };

  // Reset editing state when conciergeries update (after successful save)
  useEffect(() => {
    // If we were editing and the conciergerie now has a sandbox_join_code, close edit mode
    if (editingId !== null) {
      const conciergerie = conciergeries.find(c => c.id === editingId);
      if (conciergerie && conciergerie.sandbox_join_code && conciergerie.sandbox_join_code === joinCode.trim()) {
        // The code was successfully saved, keep edit mode closed
        if (successMessage) {
          // Already saved, do nothing
        }
      }
    }
  }, [conciergeries, editingId, joinCode, successMessage]);

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        {successMessage && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#10b981', 
            color: 'white', 
            borderRadius: '5px',
            textAlign: 'center'
          }}>
            ✅ {successMessage}
          </div>
        )}
      </div>

      {filteredConciergeries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📱</div>
          <p>Sélectionnez une conciergerie pour voir les options d'onboarding</p>
        </div>
      ) : (
        <div className="onboarding-cards">
          {filteredConciergeries.map(conciergerie => {
            // Get WhatsApp number (use default sandbox if not configured)
            const whatsappNumberForQR = getWhatsAppNumberForQR(conciergerie);
            const whatsappLink = whatsappNumberForQR && conciergerie.sandbox_join_code
              ? generateWhatsAppLink(whatsappNumberForQR, conciergerie.sandbox_join_code)
              : null;

            return (
              <div key={conciergerie.id} className="onboarding-card">
                <div className="card-header">
                  <h3>{conciergerie.name}</h3>
                  {conciergerie.whatsapp_number && (
                    <span className="phone-badge">{formatPhoneNumber(conciergerie.whatsapp_number)}</span>
                  )}
                </div>

                <div className="card-content">
                  {editingId === conciergerie.id ? (
                    <div className="edit-section">
                      <label>Code Sandbox Twilio</label>
                      <div className="input-group">
                        <span className="input-prefix">join</span>
                        <input
                          type="text"
                          className="join-code-input"
                          placeholder="happy-monkey"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <p className="hint">
                        Trouvez votre code dans le <a href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn" target="_blank" rel="noopener noreferrer">Twilio Console</a>
                      </p>
                      <div className="button-group">
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setEditingId(null);
                            setJoinCode('');
                          }}
                          disabled={isSubmitting}
                        >
                          Annuler
                        </button>
                        <button
                          className="btn-primary"
                          onClick={() => handleSaveCode(conciergerie.id)}
                          disabled={isSubmitting || !joinCode.trim()}
                        >
                          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  ) : conciergerie.sandbox_join_code ? (
                    <div className="onboarding-info">
                      {whatsappLink ? (
                        <>
                          {!conciergerie.whatsapp_number && (
                            <div style={{ 
                              padding: '10px', 
                              backgroundColor: '#fef3c7', 
                              borderRadius: '5px',
                              marginBottom: '15px',
                              fontSize: '14px',
                              color: '#92400e'
                            }}>
                              ℹ️ Utilisation du numéro sandbox Twilio par défaut (+14155238886). Configurez votre propre numéro WhatsApp pour personnaliser.
                            </div>
                          )}
                          <div className="qr-section">
                            <h4>QR Code</h4>
                            <div className="qr-code">
                              <img
                                src={generateQRCodeUrl(whatsappLink)}
                                alt="QR Code WhatsApp"
                              />
                            </div>
                            <p className="qr-hint">Scannez pour rejoindre automatiquement</p>
                          </div>

                          <div className="link-section">
                            <h4>Lien Direct</h4>
                            <div className="link-box">
                              <code>{whatsappLink}</code>
                              <button
                                className="copy-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(whatsappLink);
                                  alert('Lien copié!');
                                }}
                              >
                                📋 Copier
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="code-saved-section">
                          <div style={{ 
                            padding: '15px', 
                            backgroundColor: '#f0f9ff', 
                            borderRadius: '8px',
                            marginBottom: '15px'
                          }}>
                            <p style={{ margin: 0, color: '#0369a1' }}>
                              ✅ <strong>Code sandbox sauvegardé:</strong> <code>join {conciergerie.sandbox_join_code}</code>
                            </p>
                            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                              ⚠️ Pour générer le QR code et le lien, configurez d'abord le numéro WhatsApp de cette conciergerie.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="no-config">
                      <p>❌ Code sandbox non configuré</p>
                      <button
                        className="btn-primary"
                        onClick={() => handleEdit(conciergerie)}
                      >
                        Configurer maintenant
                      </button>
                    </div>
                  )}

                  {/* Configuration Twilio Section */}
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>⚙️ Configuration Twilio</h4>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditConfig(conciergerie)}
                        style={{ fontSize: '14px', padding: '6px 12px' }}
                      >
                        {conciergerie.twilio_account_sid ? '✏️ Modifier' : '➕ Configurer'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Configuration Twilio */}
      {showConfigModal && editingConfigId !== null && (
        <div className="modal-overlay" onClick={handleCancelConfig}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <h2 style={{ marginTop: 0 }}>⚙️ Configuration Twilio</h2>
            <div className="edit-section">
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Code Sandbox Twilio
                </label>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '5px', fontSize: '14px', color: '#666' }}>join</span>
                  <input
                    type="text"
                    className="join-code-input"
                    placeholder="happy-monkey"
                    value={sandboxCode}
                    onChange={(e) => setSandboxCode(e.target.value)}
                    disabled={isSubmittingConfig}
                    style={{ flex: 1 }}
                  />
                </div>
                <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                  Trouvez votre code dans le <a href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn" target="_blank" rel="noopener noreferrer">Twilio Console</a>
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Numéro WhatsApp Twilio (Production)
                </label>
                <input
                  type="text"
                  className="join-code-input"
                  placeholder="+14155238886 ou whatsapp:+14155238886"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  disabled={isSubmittingConfig}
                  style={{ width: '100%' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                  Laissez vide pour utiliser le numéro sandbox
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Numéro Sandbox Twilio
                </label>
                <input
                  type="text"
                  className="join-code-input"
                  placeholder="+14155238886 ou whatsapp:+14155238886"
                  value={sandboxNumber}
                  onChange={(e) => setSandboxNumber(e.target.value)}
                  disabled={isSubmittingConfig}
                  style={{ width: '100%' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                  Numéro utilisé si le numéro de production n'est pas configuré
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Twilio Account SID
                </label>
                <input
                  type="text"
                  className="join-code-input"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  disabled={isSubmittingConfig}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Twilio Auth Token
                </label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="join-code-input"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    disabled={isSubmittingConfig}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    disabled={isSubmittingConfig}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '5px', background: 'white', cursor: 'pointer' }}
                  >
                    {showToken ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="button-group">
                <button
                  className="btn-secondary"
                  onClick={handleCancelConfig}
                  disabled={isSubmittingConfig}
                >
                  Annuler
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (editingConfigId) {
                      handleSaveConfig(editingConfigId);
                    }
                  }}
                  disabled={isSubmittingConfig || (!whatsappNumber.trim() && !sandboxNumber.trim()) || !twilioSid.trim() || !twilioToken.trim()}
                >
                  {isSubmittingConfig ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppOnboarding;
