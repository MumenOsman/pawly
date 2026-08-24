import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Button from '../../components/Button/Button';
import { deleteAccount } from '../../api/users';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError(err.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="settings-page" id="settings-page">
      <Navbar />

      <main className="settings-page__content">
        <div className="settings-page__card">
          <h1>Settings & Privacy</h1>
          <p className="settings-page__subtitle">
            Manage terms, privacy preferences, and account controls.
          </p>

          {error && (
            <div className="profile-form__alert profile-form__alert--error" style={{ marginBottom: '1rem' }}>
              <span>{error}</span>
            </div>
          )}

          <div className="settings-page__section">
            <h3>Terms of Service</h3>
            <p>Read the Pawly social community guidelines and security policy.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/terms')}>
              View Terms
            </Button>
          </div>

          <div className="settings-page__section settings-page__section--danger">
            <h3>Delete Account</h3>
            <p>Once you delete your account, your profile, pets, and connection requests will be permanently erased.</p>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
              Delete My Account
            </Button>
          </div>
        </div>
      </main>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Delete Account</h3>
            <p className="modal-body">
              Are you sure you want to permanently delete your account? This action cannot be undone and all your pets, photos, and messages will be removed.
            </p>
            <div className="modal-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                loading={deleting}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
