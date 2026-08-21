import { useState } from 'react';
import Button from '../../../components/Button/Button';
import './CreateProfileStep.css';

export default function CreateProfileStep({ onNext, onBack }) {
  const [ownerName, setOwnerName] = useState(() => sessionStorage.getItem('pawly_onboard_owner_name') || '');
  const [photo, setPhoto] = useState(null);
  const [aboutMe, setAboutMe] = useState('');
  const [interests, setInterests] = useState('');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  const handleLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        'Geolocation is not supported by your browser.'
      );
      return;
    }

    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError('');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            'Location permission was denied. You can continue without it.'
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError(
            'Your location is currently unavailable.'
          );
        } else if (error.code === error.TIMEOUT) {
          setLocationError(
            'Getting your location took too long. Please try again.'
          );
        } else {
          setLocationError('Could not get your location.');
        }
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = ownerName.trim();

    if (!trimmedName) {
      return;
    }

    onNext({
      ownerName: trimmedName,
      photo,
      aboutMe: aboutMe.trim(),
      interests: interests
        .split(',')
        .map((interest) => interest.trim())
        .filter(Boolean),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    });
  };

  return (
    <form
      className="create-profile-form"
      onSubmit={handleSubmit}
    >
      <h1>Create your profile</h1>

      <label htmlFor="owner-name">Name</label>
      <input
        id="owner-name"
        type="text"
        value={ownerName}
        onChange={(e) => setOwnerName(e.target.value)}
        placeholder="Your name"
        required
      />

      <label htmlFor="profile-photo">Profile photo</label>
      <input
        id="profile-photo"
        type="file"
        accept="image/*"
        onChange={(e) =>
          setPhoto(e.target.files?.[0] || null)
        }
      />

      {photo && (
        <p className="create-profile-file">
          Selected: {photo.name}
        </p>
      )}

      <label htmlFor="about-me">About me</label>
      <textarea
        id="about-me"
        value={aboutMe}
        onChange={(e) => setAboutMe(e.target.value)}
        rows={4}
        placeholder="Tell us a little about yourself..."
      />

      <label htmlFor="interests">Interests</label>
      <input
        id="interests"
        type="text"
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        placeholder="e.g. hiking, running, photography"
      />

      <p className="create-profile-hint">
        Separate your interests with commas.
      </p>

      <div className="create-profile-location">
        <Button
          type="button"
          onClick={handleLocation}
        >
          Use my location
        </Button>

        {location && (
          <p>Location added successfully.</p>
        )}

        {locationError && (
          <p
            className="create-profile-location-error"
            role="alert"
          >
            {locationError}
          </p>
        )}
      </div>

      <div className="create-profile-actions">
        <Button
          type="button"
          onClick={onBack}
        >
          Back
        </Button>

        <Button type="submit">
          Continue
        </Button>
      </div>
    </form>
  );
}