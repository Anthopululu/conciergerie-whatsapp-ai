import { useState, useEffect } from 'react';
import axios from 'axios';
import './FAQ.css';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

function FAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch FAQs
  const fetchFAQs = async () => {
    try {
      const response = await axios.get('/api/faqs');
      setFaqs(response.data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleOpenModal = (faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setQuestion(faq.question);
      setAnswer(faq.answer);
    } else {
      setEditingFaq(null);
      setQuestion('');
      setAnswer('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFaq(null);
    setQuestion('');
    setAnswer('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingFaq) {
        await axios.patch(`/api/faqs/${editingFaq.id}`, { question, answer });
      } else {
        await axios.post('/api/faqs', { question, answer });
      }
      await fetchFAQs();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette FAQ ?')) {
      return;
    }

    try {
      await axios.delete(`/api/faqs/${id}`);
      await fetchFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="faq-container">
      <div className="faq-header">
        <div>
          <h2>Base de connaissances FAQ</h2>
          <p className="faq-subtitle">L'IA utilisera ces informations pour répondre aux clients</p>
        </div>
        <button className="faq-add-btn" onClick={() => handleOpenModal()}>
          + Ajouter une question/réponse
        </button>
      </div>

      <div className="faq-list">
        {faqs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❓</div>
            <p>Aucune question/réponse pour le moment</p>
          </div>
        ) : (
          faqs.map((faq) => (
            <div key={faq.id} className="faq-item">
              <div className="faq-content">
                <div className="faq-question">
                  <span className="faq-icon">Q:</span>
                  {faq.question}
                </div>
                <div className="faq-answer">
                  <span className="faq-icon">R:</span>
                  {faq.answer}
                </div>
              </div>
              <div className="faq-actions">
                <button className="faq-edit-btn" onClick={() => handleOpenModal(faq)}>
                  ✏️
                </button>
                <button className="faq-delete-btn" onClick={() => handleDelete(faq.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && handleCloseModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingFaq ? 'Modifier la question/réponse' : 'Ajouter une question/réponse'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="question">Question</label>
                <input
                  id="question"
                  type="text"
                  className="modal-input"
                  placeholder="Quels sont vos horaires d'ouverture ?"
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
                  placeholder="Nous sommes ouverts du lundi au vendredi de 9h à 18h..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  required
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enregistrement...' : editingFaq ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FAQ;
