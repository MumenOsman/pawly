import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, login } from '../../api/auth';
import { updateProfile, uploadUserPhoto } from '../../api/users';
import { createPet, uploadPetPhoto, setCachedMyPets, saveSelectedPetIds } from '../../api/pets';
import { geocodeLocation, reverseGeocode, searchLocations, POPULAR_LOCATIONS } from '../../utils/locations';
import Button from '../../components/Button/Button';
import './Register.css';

const STEPS = {
  PROFILE: 1,
  PET: 2,
  REVIEW: 3,
};

const TEMPERAMENT_OPTIONS = [
  'Friendly',
  'Playful',
  'Calm',
  'Energetic',
  'Social',
  'Gentle',
  'Curious',
  'Affectionate',
  'Protective',
  'Quiet',
];

export const USER_INTERESTS_POOL = [
  'Dog Walking', 'Agility Training', 'Park Hangouts', 'Pet Photography', 'Feline Toys',
  'Grooming & Spa', 'Outdoor Hiking', 'Beach Walks', 'Pet Nutrition', 'Animal Rescue',
  'Puppy Socialization', 'Clicker Training', 'Pet Cafes', 'Camping', 'Vet Care',
  'Obstacle Courses', 'Pet Fashion', 'Trick Training', 'Pet Care Workshops', 'Fostering'
];

export default function Register() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(STEPS.PROFILE);

  // If already signed in, redirect directly to Discover
  useEffect(() => {
    const token = localStorage.getItem('pawly_token');
    if (token) {
      navigate('/discover', { replace: true });
    }
  }, [navigate]);

  // --- Step 1 State: Person Profile & Account Details ---
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerBio, setOwnerBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState(['Dog Walking', 'Outdoor Hiking']);
  const [ownerPhotoFile, setOwnerPhotoFile] = useState(null);
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState('');

  // --- Step 2 State: First Pet Details ---
  const [petName, setPetName] = useState('');
  const [animalType, setAnimalType] = useState('dog');
  const [breed, setBreed] = useState('');
  const [size, setSize] = useState('medium');
  const [petAge, setPetAge] = useState('');
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [petAboutMe, setPetAboutMe] = useState('');
  const [selectedTemperaments, setSelectedTemperaments] = useState(['Friendly', 'Playful']);
  const [petPhotoFile, setPetPhotoFile] = useState(null);
  const [petPhotoPreview, setPetPhotoPreview] = useState('');

  // Live place search with 250ms debounce
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!location || location.length < 3) return;
      setLoadingLocations(true);
      try {
        const results = await searchLocations(location);
        if (active) {
          setLocationSuggestions(results || []);
        }
      } catch {
        if (active) setLocationSuggestions([]);
      } finally {
        if (active) setLoadingLocations(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [location]);

  // --- UI & Submission State ---
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // --- Handle Local File Uploads with Instant Object URL Preview ---
  const handleOwnerPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setOwnerPhotoFile(file);
      setOwnerPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePetPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPetPhotoFile(file);
      setPetPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleTemperament = (trait) => {
    setSelectedTemperaments((prev) => {
      if (prev.includes(trait)) {
        setError('');
        return prev.filter((t) => t !== trait);
      }
      if (prev.length >= 5) {
        setError('Maximum 5 traits allowed.');
        return prev;
      }
      setError('');
      return [...prev, trait];
    });
  };

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        setError('');
        return prev.filter((item) => item !== interest);
      }
      if (prev.length >= 5) {
        setError('Maximum 5 interests allowed.');
        return prev;
      }
      setError('');
      return [...prev, interest];
    });
  };

  // --- Step 1 Validation & Next ---
  const handleStep1Next = () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (!dateOfBirth) {
      setError('Please provide your date of birth.');
      return;
    }
    if (!location.trim()) {
      setError('Please provide your location.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (selectedInterests.length < 1) {
      setError('Please select at least 1 interest (maximum 5).');
      return;
    }
    if (selectedInterests.length > 5) {
      setError('Please select a maximum of 5 interests.');
      return;
    }

    setError('');
    setCurrentStep(STEPS.PET);
  };

  const handleStep1Submit = (e) => {
    if (e) e.preventDefault();
    handleStep1Next();
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();

    if (!petName.trim()) {
      setError("Please enter your pet's name.");
      return;
    }
    if (!breed.trim()) {
      setError("Please enter your pet's breed.");
      return;
    }
    const ageNum = Number(petAge);
    if (!Number.isFinite(ageNum) || ageNum < 0) {
      setError('Please enter a valid age for your pet.');
      return;
    }
    if (selectedTemperaments.length < 1) {
      setError('Please select at least 1 pet trait (maximum 5).');
      return;
    }
    if (selectedTemperaments.length > 5) {
      setError('Please select a maximum of 5 pet traits.');
      return;
    }

    setError('');
    setCurrentStep(STEPS.REVIEW);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const detectedCity = await reverseGeocode(latitude, longitude);
          setLocation(detectedCity);
          setShowLocationSuggestions(false);
        } catch {
          setError('Failed to resolve city address from GPS.');
        }
      },
      (err) => {
        setError(err.message || 'Location access denied.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleFinalSubmit = async () => {
    if (!agreedToTerms) {
      setError('Please agree to Pawly community safety guidelines to continue.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Resolve dynamic coordinates for any city/town typed
      const coords = await geocodeLocation(location.trim());

      // 1. Create User Account & JWT Session (or login if session exists)
      let registerRes;
      try {
        registerRes = await register(email.trim(), password, {
          owner_name: name.trim(),
          username: username.trim(),
          date_of_birth: dateOfBirth,
        });
      } catch (regErr) {
        if (regErr?.message && regErr.message.toLowerCase().includes('already registered')) {
          try {
            registerRes = await login(email.trim(), password);
          } catch {
            throw regErr;
          }
        } else {
          throw regErr;
        }
      }

      // 2. Upload Owner Profile Photo if provided
      let ownerPhotoURL = '';
      if (ownerPhotoFile) {
        try {
          const uploadRes = await uploadUserPhoto(ownerPhotoFile);
          if (uploadRes?.url) ownerPhotoURL = uploadRes.url;
        } catch (uploadErr) {
          console.warn('Owner photo upload warning:', uploadErr);
        }
      }

      // 3. Update User Profile Details with real coordinates
      await updateProfile({
        owner_name: name.trim(),
        username: username.trim(),
        date_of_birth: dateOfBirth,
        location: location.trim() || 'Helsinki, Finland',
        latitude: coords.lat,
        longitude: coords.lng,
        bio: ownerBio.trim(),
        interests: selectedInterests,
        owner_photo: ownerPhotoURL,
      });

      // 4. Create First Pet Profile inheriting real coordinates
      const petRes = await createPet({
        pet_name: petName.trim(),
        animal_type: animalType.toLowerCase(),
        breed: breed.trim(),
        size: size.toLowerCase(),
        pet_age: Number(petAge) || 0,
        energy_level: energyLevel.toLowerCase(),
        about_me: petAboutMe.trim() || 'Friendly pet looking for buddies!',
        temperament: selectedTemperaments,
        latitude: coords.lat,
        longitude: coords.lng,
        pet_photo: '/paw-icon.svg',
      });

      let finalPetPhoto = '/paw-icon.svg';
      // 5. Upload Pet Photo if local file provided
      if (petPhotoFile && petRes?.id) {
        try {
          const uploadPetRes = await uploadPetPhoto(petRes.id, petPhotoFile);
          if (uploadPetRes?.url || uploadPetRes?.raw_url) {
            finalPetPhoto = uploadPetRes.raw_url || uploadPetRes.url;
          }
        } catch (uploadPetErr) {
          console.warn('Pet photo upload warning:', uploadPetErr);
        }
      }

      // Populate local cache so Navbar and Discover show pet photo immediately
      if (petRes?.id) {
        const fullPetObj = {
          id: petRes.id,
          owner_id: registerRes?.user_id || 0,
          pet_name: petName.trim(),
          animal_type: animalType.toLowerCase(),
          breed: breed.trim(),
          size: size.toLowerCase(),
          pet_age: Number(petAge) || 0,
          energy_level: energyLevel.toLowerCase(),
          about_me: petAboutMe.trim() || 'Friendly pet looking for buddies!',
          temperament: selectedTemperaments,
          latitude: coords.lat,
          longitude: coords.lng,
          pet_photo: finalPetPhoto,
          photos: [finalPetPhoto],
        };
        setCachedMyPets([fullPetObj]);
        saveSelectedPetIds([petRes.id]);
      }

      // 6. Registration complete — redirect to Discover
      navigate('/discover');
    } catch (err) {
      console.error('Registration flow failed:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-wizard-page">
      <div className="register-wizard-card">
        {/* Step Progress Indicator */}
        <div className="wizard-progress-bar">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        <div className="wizard-step-indicators">
          <div className={`wizard-step-badge ${currentStep >= 1 ? 'active' : ''}`}>
            1. Profile & Account
          </div>
          <div className={`wizard-step-badge ${currentStep >= 2 ? 'active' : ''}`}>
            2. First Pet
          </div>
          <div className={`wizard-step-badge ${currentStep >= 3 ? 'active' : ''}`}>
            3. Review & Agree
          </div>
        </div>

        {error && (
          <div className="register-error-banner" role="alert">
            {error}
          </div>
        )}

        {/* ============================================================
            STEP 1: PERSON PROFILE & ACCOUNT CREATION
            ============================================================ */}
        {currentStep === STEPS.PROFILE && (
          <form className="wizard-form" onSubmit={handleStep1Submit}>
            <div className="wizard-header">
              <h1>Create Your Profile</h1>
              <p>Tell us about yourself and set up your login credentials.</p>
            </div>

            {/* Avatar Local File Upload */}
            <div className="avatar-upload-section">
              <div className="avatar-upload-preview">
                {ownerPhotoPreview ? (
                  <img src={ownerPhotoPreview} alt="Profile preview" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    <span>Add Photo</span>
                  </div>
                )}
              </div>
              <div className="avatar-upload-info">
                <label htmlFor="owner-photo-input" className="file-upload-btn">
                  Upload Profile Photo
                </label>
                <input
                  id="owner-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleOwnerPhotoChange}
                  style={{ display: 'none' }}
                />
                <span className="file-upload-hint">Supports JPG, PNG or WEBP</span>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="reg-name">Full Name *</label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Koskinen"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-username">Username *</label>
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. maria_k"
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="reg-dob">Date of Birth *</label>
                <input
                  id="reg-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="reg-location" style={{ margin: 0 }}>Location *</label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="Auto-detect current GPS location"
                  >
                    Use My Location
                  </button>
                </div>
                <input
                  id="reg-location"
                  name="pawly_search_location_field"
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 250)}
                  placeholder="Type any city worldwide (e.g. Stockholm, Vaasa, Berlin)..."
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <ul className="reg-location-dropdown">
                    {locationSuggestions.map((loc, idx) => (
                      <li
                        key={`${loc.name}-${idx}`}
                        onMouseDown={() => {
                          setLocation(loc.name);
                          setSelectedCoords({ lat: loc.lat, lng: loc.lng });
                          setShowLocationSuggestions(false);
                        }}
                        className="reg-location-item"
                      >
                        {loc.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email Address *</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="reg-password">Password *</label>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm-password">Confirm Password *</label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-about">About Me (Bio)</label>
              <textarea
                id="reg-about"
                value={ownerBio}
                onChange={(e) => setOwnerBio(e.target.value)}
                rows={3}
                placeholder="Share a short bio with other pet owners..."
              />
            </div>

            <div className="form-group">
              <label>Interests * (Choose 1 to 5, selected: {selectedInterests.length}/5)</label>
              <div className="temperament-chips-grid">
                {USER_INTERESTS_POOL.map((item) => {
                  const isSelected = selectedInterests.includes(item);
                  const isMaxReached = selectedInterests.length >= 5 && !isSelected;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={isMaxReached}
                      className={`trait-chip ${isSelected ? 'trait-chip--active' : ''}`}
                      style={isMaxReached ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                      onClick={() => toggleInterest(item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="wizard-actions">
              <Button type="submit" fullWidth>
                Continue to Add Pet
              </Button>
            </div>

            <p className="wizard-footer-link">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}

        {/* ============================================================
            STEP 2: ADD FIRST PET
            ============================================================ */}
        {currentStep === STEPS.PET && (
          <form className="wizard-form" onSubmit={handleStep2Submit}>
            <div className="wizard-header">
              <h1>Add Your First Pet</h1>
              <p>Create a profile for your pet so compatible playmates can find you.</p>
            </div>

            {/* Pet Photo Local File Upload */}
            <div className="pet-photo-upload-section">
              <div className="pet-photo-preview-wrap">
                {petPhotoPreview ? (
                  <img src={petPhotoPreview} alt="Pet preview" className="pet-photo-img" />
                ) : (
                  <div className="pet-photo-placeholder">
                    <span>Add Photo</span>
                  </div>
                )}
              </div>
              <div className="pet-photo-info">
                <label htmlFor="pet-photo-file-input" className="file-upload-btn">
                  Upload Pet Photo
                </label>
                <input
                  id="pet-photo-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePetPhotoChange}
                  style={{ display: 'none' }}
                />
                <span className="file-upload-hint">Supports JPG, PNG or WEBP</span>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="pet-name">Pet Name *</label>
                <input
                  id="pet-name"
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Bella"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="animal-type">Animal Type *</label>
                <select
                  id="animal-type"
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                  required
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="rabbit">Rabbit</option>
                  <option value="small_pet">Small Pet</option>
                </select>
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label htmlFor="pet-breed">Breed *</label>
                <input
                  id="pet-breed"
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Golden Retriever"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pet-size">Size *</label>
                <select
                  id="pet-size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  required
                >
                  <option value="small">Small (under 10 kg)</option>
                  <option value="medium">Medium (10–25 kg)</option>
                  <option value="large">Large (25+ kg)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="pet-age">Age (years) *</label>
                <input
                  id="pet-age"
                  type="number"
                  min="0"
                  max="30"
                  value={petAge}
                  onChange={(e) => setPetAge(e.target.value)}
                  placeholder="e.g. 3"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pet-energy">Energy Level</label>
              <select
                id="pet-energy"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(e.target.value)}
              >
                <option value="low">Low (Couch potato, relaxed)</option>
                <option value="medium">Medium (Moderate walks & play)</option>
                <option value="high">High (Energetic & athletic)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Temperament Traits * (Choose 1 to 5, selected: {selectedTemperaments.length}/5)</label>
              <div className="temperament-chips-grid">
                {TEMPERAMENT_OPTIONS.map((trait) => {
                  const isSelected = selectedTemperaments.includes(trait);
                  const isMaxReached = selectedTemperaments.length >= 5 && !isSelected;
                  return (
                    <button
                      key={trait}
                      type="button"
                      disabled={isMaxReached}
                      className={`trait-chip ${isSelected ? 'trait-chip--active' : ''}`}
                      style={isMaxReached ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                      onClick={() => toggleTemperament(trait)}
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pet-about">About Your Pet</label>
              <textarea
                id="pet-about"
                value={petAboutMe}
                onChange={(e) => setPetAboutMe(e.target.value)}
                rows={3}
                placeholder="What does your pet love doing? Favorite games, triggers, or play style..."
              />
            </div>

            <div className="wizard-actions-dual">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setError('');
                  setCurrentStep(STEPS.PROFILE);
                }}
              >
                Back
              </Button>
              <Button type="submit">
                Continue to Review
              </Button>
            </div>
          </form>
        )}

        {/* ============================================================
            STEP 3: VIEW PET CARD & AGREE
            ============================================================ */}
        {currentStep === STEPS.REVIEW && (
          <div className="wizard-review-view">
            <div className="wizard-header">
              <h1>Review Your Pet Card</h1>
              <p>Here is how your pet card and profile will appear to other users.</p>
            </div>

            <div className="review-cards-container">
              {/* Pet Card Preview (Exact replica of main app Pet Card) */}
              <div className="pet-card-preview">
                <div className="pet-card-preview__image-wrap">
                  <img
                    src={petPhotoPreview || '/paw-icon.svg'}
                    alt={petName}
                    className="pet-card-preview__img"
                  />
                  <div className="pet-card-preview__match-badge">100% Match</div>
                </div>

                <div className="pet-card-preview__body">
                  <div className="pet-card-preview__header">
                    <h2>{petName}</h2>
                    <span className="pet-card-preview__breed">{breed}</span>
                  </div>

                  <div className="pet-card-preview__meta">
                    <span>{animalType.toUpperCase()}</span>
                    <span>•</span>
                    <span>{size.toUpperCase()}</span>
                    <span>•</span>
                    <span>{petAge} YRS</span>
                    <span>•</span>
                    <span className="energy-tag">{energyLevel.toUpperCase()} ENERGY</span>
                  </div>

                  <div className="pet-card-preview__chips">
                    {selectedTemperaments.map((t) => (
                      <span key={t} className="review-trait-pill">
                        {t}
                      </span>
                    ))}
                  </div>

                  <p className="pet-card-preview__bio">
                    {petAboutMe || 'Friendly pet looking forward to meeting new neighborhood buddies!'}
                  </p>
                </div>
              </div>

              {/* Owner Summary Card */}
              <div className="owner-summary-card">
                <h3>Owner Details</h3>
                <div className="owner-summary-row">
                  <div className="owner-summary-avatar-wrap">
                    {ownerPhotoPreview ? (
                      <img src={ownerPhotoPreview} alt={name} className="owner-summary-avatar" />
                    ) : (
                      <div className="owner-summary-avatar-placeholder">
                        {name.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4>{name}</h4>
                    <p className="owner-summary-username">@{username}</p>
                    <p className="owner-summary-location">{location}</p>
                  </div>
                </div>

                {ownerBio && <p className="owner-summary-bio">"{ownerBio}"</p>}

                {selectedInterests.length > 0 && (
                  <div className="owner-summary-interests">
                    <strong>Interests:</strong> {selectedInterests.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Terms & Agreement Checkbox */}
            <div className="terms-checkbox-wrap">
              <label className="terms-checkbox-label">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    className="terms-modal-trigger-link"
                    onClick={() => setShowTermsModal(true)}
                  >
                    Pawly Terms and Conditions
                  </button>{' '}
                  for respectful and safe pet playdates.
                </span>
              </label>
            </div>

            <div className="wizard-actions-dual">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setError('');
                  setCurrentStep(STEPS.PET);
                }}
              >
                Back to Edit Pet
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                loading={loading}
              >
                Agree & Complete Registration
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div
            className="modal-card terms-dialog-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="terms-dialog-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: 0, color: 'var(--color-text)' }}>
                Pawly Terms & Conditions
              </h2>
              <button
                type="button"
                className="terms-dialog-close-x"
                onClick={() => setShowTermsModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="terms-dialog-body" style={{ overflowY: 'auto', padding: '1rem 0', margin: '0.5rem 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', lineHeight: '1.6', fontSize: '0.9rem', color: '#334155' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text)', marginTop: 0 }}>1. Welcome to Pawly</h3>
              <p>Pawly is a neighborhood pet matching platform designed to help pet owners connect, organize safe playdates, and build healthy social routines for their pets. By creating an account or using Pawly, you agree to these Terms and Conditions.</p>

              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text)' }}>2. Owner & Pet Safety Requirements</h3>
              <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
                <li><strong>Vaccinations:</strong> All pets listed on Pawly must have up-to-date core vaccinations and regular veterinary checkups.</li>
                <li><strong>Temperament Accuracy:</strong> Owners must accurately declare pet traits, energy levels, and any behavioral triggers or social preferences.</li>
                <li><strong>Supervision:</strong> All playdates and meetups arranged through Pawly must be supervised by adult owners in safe, designated areas.</li>
                <li><strong>Leash & Control:</strong> Dogs must remain leashed in public spaces where required by local regulations unless in designated fenced dog parks.</li>
              </ul>

              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text)' }}>3. Privacy & Location Usage</h3>
              <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
                <li><strong>Neighborhood-Level Location:</strong> Maps show neighborhood vicinity (e.g. Töölö, Kallio) rather than exact home addresses.</li>
                <li><strong>Contact Information:</strong> Direct communication occurs via in-app messaging. Phone numbers and emails are never shared publicly.</li>
              </ul>

              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text)' }}>4. Community Code of Conduct</h3>
              <p>Pawly maintains a zero-tolerance policy for harassment, abusive behavior, spam, fraudulent listings, or mistreatment of animals. Violations will result in immediate and permanent account termination.</p>

              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text)' }}>5. Liability & Mutual Agreement</h3>
              <p style={{ marginBottom: 0 }}>Owners are legally responsible for their pets’ actions and interactions during playdates. Pawly provides the matching technology platform and is not liable for accidents or disputes arising from independent playdates.</p>
            </div>

            <div className="terms-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowTermsModal(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setAgreedToTerms(true);
                  setShowTermsModal(false);
                }}
              >
                I Understand & Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
