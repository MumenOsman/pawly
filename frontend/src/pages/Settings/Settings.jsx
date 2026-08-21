/**
 * Settings Page
 *
 * App & Privacy Settings view.
 * Direct tab shortcut or fallback for Profile settings view.
 */
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Button from '../../components/Button/Button';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="settings-page" id="settings-page">
      <Navbar />

      <main className="settings-page__content">
        <div className="settings-page__card">
          <h1>Settings & Privacy</h1>
          <p className="settings-page__subtitle">
            Manage terms, privacy preferences, and account controls.
          </p>

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
            <Button variant="danger" size="sm">Delete My Account</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
