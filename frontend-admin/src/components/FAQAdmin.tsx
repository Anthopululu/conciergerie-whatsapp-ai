import { useState, useEffect } from 'react';
import axios from 'axios';
import './FAQAdmin.css';

interface FAQ {
  id: number;
  conciergerie_id: number;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
  conciergerie_name?: string;
}

interface Conciergerie {
  id: number;
  name: string;
}

interface FAQAdminProps {
  conciergerieId: number | null;
}

function FAQAdmin({ conciergerieId }: FAQAdminProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedConciergerieId, setSelectedConciergerieId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFaqs();
    fetchConciergeries();
  }, [conciergerieId]);

  const fetchConciergeries = async () => {
    try {
      const response = await axios.get('/api/admin/conciergeries');
      setConciergeries(response.data);
    } catch (error) {
      console.error('Error fetching conciergeries:', error);
    }
  };

  const fetchFaqs = async () => {
    try {
      // Always fetch all FAQs from admin endpoint
      const response = await axios.get(`/api/admin/faqs`);
      const allFaqs = response.data;

      // Filter client-side if specific conciergerie is selected
      if (conciergerieId) {
        const filtered = allFaqs.filter((faq: FAQ) => faq.conciergerie_id === conciergerieId);
        setFaqs(filtered);
      } else {
        setFaqs(allFaqs);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setFaqs([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetConciergerieId = conciergerieId || selectedConciergerieId;
    
    if (!targetConciergerieId) {
      alert('Veuillez sélectionner une conciergerie pour créer/modifier cette FAQ');
      return;
    }

    if (!question || !answer) {
      alert('La question et la réponse sont requises');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingFaq) {
        await axios.patch(`/api/admin/faqs/${editingFaq.id}`, { 
          question, 
          answer, 
          conciergerie_id: targetConciergerieId 
        });
      } else {
        await axios.post('/api/admin/faqs', { 
          question, 
          answer, 
          conciergerie_id: targetConciergerieId 
        });
      }

      await fetchFaqs();
      setShowModal(false);
      setEditingFaq(null);
      setQuestion('');
      setAnswer('');
      setSelectedConciergerieId('');
    } catch (error) {
      console.error('Error saving FAQ:', error);
      alert('Erreur lors de l\'enregistrement de la FAQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setSelectedConciergerieId(faq.conciergerie_id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette FAQ ?')) return;

    try {
      await axios.delete(`/api/admin/faqs/${id}`);
      await fetchFaqs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      alert('Erreur lors de la suppression de la FAQ');
    }
  };

  const handleNewFaq = () => {
    setEditingFaq(null);
    setQuestion('');
    setAnswer('');
    setSelectedConciergerieId(conciergerieId || '');
    setShowModal(true);
  };


  return (
    <div className="faq-admin-container">
      <div className="faq-header">
        <div>
          <h2>📚 Gestion des FAQs</h2>
          <p className="faq-subtitle">{faqs.length} question{faqs.length !== 1 ? 's' : ''} enregistrée{faqs.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="add-faq-btn" onClick={handleNewFaq}>
          + Ajouter une question/réponse
        </button>
      </div>

      <div className="faq-list">
        {faqs.length === 0 ? (
          <div className="faq-empty">
            <div className="empty-icon">📚</div>
            <h3>Aucune FAQ</h3>
            <p>Commencez par créer votre première question/réponse pour aider l'IA à répondre</p>
          </div>
        ) : (
          faqs.map((faq) => {
            const conciergerie = conciergeries.find(c => c.id === faq.conciergerie_id);
            const conciergerieName = faq.conciergerie_name || conciergerie?.name || `Conciergerie #${faq.conciergerie_id}`;
            
            return (
            <div key={faq.id} className="faq-item">
              <div className="faq-content">
                {!conciergerieId && (
                  <div className="faq-conciergerie-badge">
                    🏢 {conciergerieName}
                  </div>
                )}
                <div className="faq-question">
                  <span className="faq-icon">❓</span>
                  {faq.question}
                </div>
                <div className="faq-answer">
                  <span className="faq-icon">💡</span>
                  {faq.answer}
                </div>
              </div>
              <div className="faq-actions">
                <button className="edit-btn" onClick={() => handleEdit(faq)}>
                  ✏️ Modifier
                </button>
                <button className="delete-btn" onClick={() => handleDelete(faq.id)}>
                  🗑️ Supprimer
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingFaq ? 'Modifier la FAQ' : 'Nouvelle FAQ'}</h2>
            <form onSubmit={handleSubmit}>
              {!conciergerieId && (
                <div className="form-group">
                  <label htmlFor="conciergerie">Conciergerie</label>
                  <select
                    id="conciergerie"
                    className="modal-input"
                    value={selectedConciergerieId}
                    onChange={(e) => setSelectedConciergerieId(e.target.value ? parseInt(e.target.value) : '')}
                    required={!conciergerieId}
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

              <div className="form-group">
                <label htmlFor="question">Question</label>
                <input
                  id="question"
                  type="text"
                  className="modal-input"
                  placeholder="Ex: Quels sont vos horaires d'ouverture ?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="answer">Réponse</label>
                <textarea
                  id="answer"
                  className="modal-textarea"
                  placeholder="La réponse complète à cette question..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  required
                  rows={6}
                  disabled={isSubmitting}
                />
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
                  {isSubmitting ? 'Enregistrement...' : editingFaq ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FAQAdmin;
