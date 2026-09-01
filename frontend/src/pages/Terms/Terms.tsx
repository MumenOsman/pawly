/**
 * Terms and Conditions Page
 *
 * Full Pawly Terms of Service, Community Safety Guidelines,
 * and Privacy Policies.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Button from '../../components/Button/Button';
import './Terms.css';

export default function Terms() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const from = queryParams.get('from');

  let returnLabel = 'Return to Profile';
  let returnPath = '/profile';

  if (from === 'register') {
    returnLabel = 'Return to Registration';
    returnPath = '/register';
  } else if (from === 'login') {
    returnLabel = 'Return to Login';
    returnPath = '/login';
  } else if (from === 'home') {
    returnLabel = 'Return to Home';
    returnPath = '/';
  } else {
    // If not logged in and no query param, default back
    const token = localStorage.getItem('pawly_token');
    if (!token) {
      returnLabel = 'Return to Registration';
      returnPath = '/register';
    }
  }

  const handleReturn = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(returnPath);
    }
  };

  return (
    <div className="terms-page" id="terms-page">
      <Navbar />

      <main className="terms-page__content">
        <div className="terms-page__container">
          <div className="terms-page__header">
            <button
              type="button"
              className="terms-page__back-btn"
              onClick={handleReturn}
            >
              ← Back
            </button>
            <h1>Terms and Conditions</h1>
            <p className="terms-page__subtitle">
              Last updated: August 2026 • Effective for all Pawly community members
            </p>
          </div>

          <div className="terms-page__body">
            <section className="terms-section">
              <h2>1. Welcome to Pawly</h2>
              <p>
                Pawly is a neighborhood pet matching platform designed to help pet owners connect, organize safe playdates, and build healthy social routines for their pets. By creating an account or using Pawly, you agree to these Terms and Conditions.
              </p>
            </section>

            <section className="terms-section">
              <h2>2. Owner & Pet Safety Requirements</h2>
              <p>
                The health, safety, and well-being of all animals is our highest priority:
              </p>
              <ul>
                <li><strong>Vaccinations:</strong> All pets listed on Pawly must have up-to-date core vaccinations and regular veterinary checkups.</li>
                <li><strong>Temperament Accuracy:</strong> Owners must accurately declare pet traits, energy levels, and any behavioral triggers or social preferences.</li>
                <li><strong>Supervision:</strong> All playdates and meetups arranged through Pawly must be supervised by adult owners in safe, designated areas.</li>
                <li><strong>Leash & Control:</strong> Dogs must remain leashed in public spaces where required by local Finnish regulations unless in designated fenced dog parks (koirapuistot).</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>3. Privacy & Location Usage</h2>
              <p>
                Pawly values your personal privacy and never reveals your exact street address:
              </p>
              <ul>
                <li><strong>Neighborhood-Level Location:</strong> Distances and maps show general neighborhood vicinity (e.g., Töölö, Kallio, Tapiola) rather than exact home addresses.</li>
                <li><strong>Contact Information:</strong> Direct communication occurs via in-app messaging. Personal phone numbers and emails are never shared publicly.</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>4. Community Code of Conduct</h2>
              <p>
                Pawly maintains a zero-tolerance policy for harassment, abusive behavior, spam, fraudulent listings, or mistreatment of animals. Violations will result in immediate and permanent account termination.
              </p>
            </section>

            <section className="terms-section">
              <h2>5. Liability & Mutual Agreement</h2>
              <p>
                Owners are legally responsible for their pets’ actions and interactions during playdates. Pawly provides the matching technology platform and is not liable for accidents, injuries, or disputes arising from independent playdates.
              </p>
            </section>

            <section className="terms-section">
              <h2>6. Account Management & Deletion</h2>
              <p>
                You retain full ownership of your data. You may update your profile or permanently delete your account and pet data at any time from your Privacy Settings.
              </p>
            </section>
          </div>

          <div className="terms-page__footer">
            <Button variant="primary" onClick={handleReturn}>
              {returnLabel}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
