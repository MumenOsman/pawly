import Button from '../../../components/Button/Button';
import './VerifyStep.css';

export default function VerifyStep({
  profileData = {},
  petData = {},
  saving = false,
  saveError = '',
  onBack,
  onFinish,
}) {
  const {
    ownerName,
    aboutMe,
    interests = [],
    photo,
  } = profileData;

  const {
    petName,
    animalType,
    breed,
    size,
    age,
    energyLevel,
    aboutMe: petAboutMe,
    photoUrl,
  } = petData;

  return (
    <section className="verify-step">
      <div
        className="verify-step__success-icon"
        aria-hidden="true"
      >
        ✓
      </div>

      <h1>Almost there!</h1>

      <p className="verify-step__intro">
        Check that everything looks right before you get started.
      </p>

      <div className="verify-step__summary">

        <section className="verify-step__section">
          <h2>Your profile</h2>

          {photo && (
            <p className="verify-step__photo">
              Profile photo selected:{' '}
              {photo.name || 'Photo selected'}
            </p>
          )}

          <div className="verify-step__details">
            <p>
              <strong>Name:</strong>{' '}
              {ownerName || 'Not provided'}
            </p>

            <p>
              <strong>About me:</strong>{' '}
              {aboutMe || 'Not provided'}
            </p>

            <p>
              <strong>Interests:</strong>{' '}
              {interests.length > 0
                ? interests.join(', ')
                : 'None added'}
            </p>
          </div>
        </section>

        <section className="verify-step__section">
          <h2>Your pet</h2>

          {photoUrl && (
            <p className="verify-step__photo">
              Pet photo selected
            </p>
          )}

          <div className="verify-step__details">
            <p>
              <strong>Name:</strong>{' '}
              {petName || 'Not provided'}
            </p>

            <p>
              <strong>Animal:</strong>{' '}
              {animalType || 'Not provided'}
            </p>

            <p>
              <strong>Size:</strong>{' '}
              {size || 'Not provided'}
            </p>

            <p>
              <strong>Age:</strong>{' '}
              {age !== null &&
              age !== undefined &&
              age !== ''
                ? age
                : 'Not provided'}
            </p>

            <p>
              <strong>Energy level:</strong>{' '}
              {energyLevel || 'Not provided'}
            </p>

            {petAboutMe && (
              <p>
                <strong>About:</strong> {petAboutMe}
              </p>
            )}
          </div>
        </section>

      </div>

      <div className="verify-step__verification">
        <h2>You're ready to go</h2>

        <p>
          Your profile is ready. Click Get Started to finish
          setting up your account and start discovering playmates.
        </p>
      </div>

      {saveError && (
        <p
          className="verify-step__error"
          role="alert"
        >
          {saveError}
        </p>
      )}

      <div className="verify-step__actions">
        <Button
          type="button"
          onClick={onBack}
          disabled={saving}
        >
          Back
        </Button>

        <Button
          type="button"
          onClick={onFinish}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Get Started'}
        </Button>
      </div>
    </section>
  );
}