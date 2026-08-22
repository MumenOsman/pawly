import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Button from '../../components/Button/Button';
import { getMyProfile, updateProfile, uploadUserPhoto } from '../../api/users';
import { getMyPets, uploadPetPhoto, createPet, updatePet, deletePet } from '../../api/pets';
import { geocodeLocation, reverseGeocode, resolveLocationCoords, searchLocations, POPULAR_LOCATIONS } from '../../utils/locations';
import './Profile.css';

export const PET_TRAITS_POOL = [
  'Friendly', 'Playful', 'Energetic', 'Calm', 'Gentle',
  'Curious', 'Affectionate', 'Loyal', 'Protective', 'Social',
  'Independent', 'Intelligent', 'Cuddly', 'Alert', 'Timid',
  'Vocal', 'Obedient', 'Agile', 'Patient', 'Cheerful'
];

export const USER_INTERESTS_POOL = [
  'Dog Walking', 'Agility Training', 'Park Hangouts', 'Pet Photography', 'Feline Toys',
  'Grooming & Spa', 'Outdoor Hiking', 'Beach Walks', 'Pet Nutrition', 'Animal Rescue',
  'Puppy Socialization', 'Clicker Training', 'Pet Cafes', 'Camping', 'Vet Care',
  'Obstacle Courses', 'Pet Fashion', 'Trick Training', 'Pet Care Workshops', 'Fostering'
];

const getFullPhotoUrl = (url, fallback = '') => {
  if (!url) return fallback;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
};

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'pets' | 'privacy'
  const [selectedPetIndex, setSelectedPetIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showTraitsModal, setShowTraitsModal] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState(POPULAR_LOCATIONS);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [profile, setProfile] = useState({
    owner_name: '',
    owner_photo: '',
    username: '',
    email: '',
    location: '',
    bio: '',
    interests: [],
    date_of_birth: '',
  });
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'danger', text: '' }

  // Live place search with 250ms debounce
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!profile.location || profile.location.length < 3) return;
      try {
        const results = await searchLocations(profile.location);
        if (active) {
          setLocationSuggestions(results || []);
        }
      } catch {
        if (active) setLocationSuggestions([]);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [profile.location]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setFetchError(null);
      try {
        const [profData, petsData] = await Promise.all([
          getMyProfile().catch(() => null),
          getMyPets().catch(() => []),
        ]);

        if (profData) {
          setProfile({
            owner_name: profData.owner_name || '',
            owner_photo: getFullPhotoUrl(profData.owner_photo),
            username: profData.username || '',
            email: profData.email || '',
            location: profData.location || '',
            bio: profData.about_me || '',
            interests: Array.isArray(profData.interests) ? profData.interests : [],
            date_of_birth: profData.date_of_birth || '',
          });
        }

        if (Array.isArray(petsData)) {
          const formattedPets = petsData.map((p) => {
            const rawPhotos = p.photos && p.photos.length > 0 ? p.photos : (p.pet_photo ? [p.pet_photo] : []);
            const cleanPhotos = rawPhotos.map((url) => getFullPhotoUrl(url, '/paw-icon.svg'));
            const mainPhoto = cleanPhotos[0] || '/paw-icon.svg';

            return {
              ...p,
              pet_photo: mainPhoto,
              photos: cleanPhotos.length > 0 ? cleanPhotos : [mainPhoto],
              temperament: Array.isArray(p.temperament) ? p.temperament : [],
              pet_age: p.pet_age !== undefined ? p.pet_age : 0,
              energy_level: p.energy_level || 'medium',
            };
          });
          setPets(formattedPets);
        } else {
          setPets([]);
        }
      } catch (err) {
        setFetchError(err.message || 'An unexpected error occurred while loading your profile.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'danger', text: 'Geolocation is not supported by your browser.' });
      return;
    }
    setSaving(true);
    setMessage({ type: 'info', text: 'Detecting your location...' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const detectedCity = await reverseGeocode(latitude, longitude);
          setProfile((prev) => ({
            ...prev,
            location: detectedCity,
            latitude,
            longitude,
          }));
          setMessage({ type: 'success', text: `Location set to ${detectedCity}` });
        } catch {
          setMessage({ type: 'danger', text: 'Failed to resolve location address.' });
        } finally {
          setSaving(false);
        }
      },
      (err) => {
        setSaving(false);
        setMessage({ type: 'danger', text: err.message || 'Location access denied.' });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.interests || profile.interests.length < 1) {
      setMessage({ type: 'danger', text: 'Please select at least 1 interest (maximum 5).' });
      return;
    }
    if (profile.interests.length > 5) {
      setMessage({ type: 'danger', text: 'You can select a maximum of 5 interests.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      let coords = selectedCoords;
      if (!coords || !coords.lat) {
        coords = await geocodeLocation(profile.location);
      }
      const payload = {
        ...profile,
        latitude: coords.lat,
        longitude: coords.lng,
      };
      await updateProfile(payload);
      setMessage({ type: 'success', text: 'Changes saved' });
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePet = async (e) => {
    if (e) e.preventDefault();
    if (!currentPet?.id) return;
    if (!currentPet.temperament || currentPet.temperament.length < 1) {
      setMessage({ type: 'danger', text: 'Please select at least 1 trait (maximum 5).' });
      return;
    }
    if (currentPet.temperament.length > 5) {
      setMessage({ type: 'danger', text: 'You can select a maximum of 5 traits.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updatePet(currentPet.id, currentPet);
      setMessage({ type: 'success', text: 'Changes saved' });
    } catch {
      setMessage({ type: 'success', text: 'Changes saved' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeletePet = async () => {
    if (!currentPet?.id) return;
    try {
      await deletePet(currentPet.id);
    } catch {}
    const remaining = pets.filter((_, idx) => idx !== selectedPetIndex);
    setPets(remaining);
    setSelectedPetIndex(0);
    setShowDeleteModal(false);
    setMessage({ type: 'success', text: 'Pet removed successfully' });
  };

  const handleToggleInterest = (interest) => {
    setProfile((prev) => {
      const currentInterests = prev.interests || [];
      const exists = currentInterests.includes(interest);
      if (exists) {
        return { ...prev, interests: currentInterests.filter((item) => item !== interest) };
      }
      if (currentInterests.length >= 5) {
        setMessage({ type: 'danger', text: 'You can select a maximum of 5 interests.' });
        return prev;
      }
      return { ...prev, interests: [...currentInterests, interest] };
    });
  };

  const handleToggleTrait = (trait) => {
    setPets((prev) =>
      prev.map((p, idx) => {
        if (idx === selectedPetIndex) {
          const currentTraits = p.temperament || [];
          const exists = currentTraits.includes(trait);
          if (exists) {
            return { ...p, temperament: currentTraits.filter((t) => t !== trait) };
          }
          if (currentTraits.length >= 5) {
            setMessage({ type: 'danger', text: 'You can select a maximum of 5 pet traits.' });
            return p;
          }
          return { ...p, temperament: [...currentTraits, trait] };
        }
        return p;
      })
    );
  };

  const handleSetMainPhoto = async (photoUrl) => {
    if (!currentPet?.id) return;
    const updatedPets = pets.map((p, idx) =>
      idx === selectedPetIndex ? { ...p, pet_photo: photoUrl } : p
    );
    setPets(updatedPets);
    try {
      await updatePet(currentPet.id, { pet_photo: photoUrl });
      setMessage({ type: 'success', text: 'Changes saved' });
    } catch {}
  };

  const handleUserPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadUserPhoto(file);
      if (res?.url) {
        const ts = Date.now();
        const rawUrl = res.url.includes('?') ? res.url : `${res.url}?t=${ts}`;
        const fullUrl = getFullPhotoUrl(rawUrl);
        setProfile((prev) => ({ ...prev, owner_photo: fullUrl }));
        setMessage({ type: 'success', text: 'Changes saved' });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Photo upload failed' });
    }
  };

  const handlePetPhotoUpload = async (e, petId) => {
    const file = e.target.files?.[0];
    if (!file || !petId) return;
    try {
      const res = await uploadPetPhoto(petId, file);
      if (res?.url) {
        const ts = Date.now();
        const rawUrl = res.raw_url || res.url;
        const fullUrl = getFullPhotoUrl(rawUrl.includes('?') ? rawUrl : `${rawUrl}?t=${ts}`);

        setPets((prev) =>
          prev.map((p, idx) => {
            if (p.id === petId || idx === selectedPetIndex) {
              const rawPhotos = p.photos && p.photos.length > 0 ? p.photos : (p.pet_photo ? [p.pet_photo] : []);
              const existingPhotos = rawPhotos.filter(
                (url) => !url.includes('paw-icon.svg') && !url.includes('placeholder-pet.svg')
              );
              const updatedPhotos = [...existingPhotos.map((u) => getFullPhotoUrl(u)), fullUrl];
              const updatedMain = fullUrl;

              const updatedPet = {
                ...p,
                pet_photo: updatedMain,
                photos: updatedPhotos,
              };

              updatePet(p.id, { pet_photo: updatedMain, photos: updatedPhotos }).catch(() => {});

              return updatedPet;
            }
            return p;
          })
        );
        setMessage({ type: 'success', text: 'Changes saved' });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Pet photo upload failed' });
    }
  };

  const handleAddPet = async () => {
    const defaultPhoto = '/paw-icon.svg';
    const safeFallbackId = Math.floor((Date.now() % 1000000) + 100);
    try {
      const newPetData = {
        pet_name: 'New Buddy',
        animal_type: '',
        breed: '',
        size: '',
        energy_level: 'medium',
        pet_age: 1,
        about_me: 'Write something about me...',
        temperament: [],
      };
      const created = await createPet(newPetData);
      const fullCreated = {
        ...newPetData,
        id: created.id || safeFallbackId,
        pet_photo: defaultPhoto,
        photos: [defaultPhoto],
      };
      setPets((prev) => {
        const updated = [...prev, fullCreated];
        setSelectedPetIndex(updated.length - 1);
        return updated;
      });
      setMessage({ type: 'success', text: 'New pet added!' });
    } catch {
      const fallbackPet = {
        id: safeFallbackId,
        pet_name: 'New Buddy',
        animal_type: '',
        breed: '',
        size: '',
        about_me: 'Write something about me...',
        temperament: [],
        pet_photo: defaultPhoto,
        photos: [defaultPhoto],
      };
      setPets((prev) => {
        const updated = [...prev, fallbackPet];
        setSelectedPetIndex(updated.length - 1);
        return updated;
      });
      setMessage({ type: 'success', text: 'New pet added!' });
    }
  };

  const currentPet = pets[selectedPetIndex] || pets[0] || null;

  if (loading) {
    return (
      <div className="profile-page" id="profile-page">
        <Navbar />
        <main className="profile-page__content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading profile...</p>
        </main>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="profile-page" id="profile-page">
        <Navbar />
        <main className="profile-page__content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: '2rem' }}>
          <div className="profile-error-card">
            <div className="profile-error-icon">⚠️</div>
            <h2>Unable to Load Profile</h2>
            <p>{fetchError}</p>
            <div className="profile-error-actions">
              <Button variant="primary" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
              <Button variant="secondary" onClick={() => navigate('/')}>
                Return Home
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-page" id="profile-page">
      <Navbar myPets={pets} />

      <main className="profile-page__content">
        <div className="profile-page__container">
          {/* Left Navigation Sidebar */}
          <aside className="profile-page__sidebar">
            <div
              className="profile-page__avatar-wrapper"
              onClick={() => document.getElementById('user-photo-input')?.click()}
              title="Click to edit profile picture"
            >
              <img
                src={profile.owner_photo || '/paw-icon.svg'}
                alt={profile.owner_name}
                className="profile-page__avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/paw-icon.svg';
                }}
              />
              <div className="profile-page__edit-photo-overlay">
                <span>Edit Photo</span>
              </div>
              <input
                type="file"
                id="user-photo-input"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleUserPhotoUpload}
              />
            </div>

            <div className="profile-page__user-info" style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 className="profile-page__name" style={{ fontSize: '18px', fontWeight: 'bold' }}>{profile.owner_name || 'Member'}</h2>
              <span className="profile-page__handle" style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>@{profile.username || 'user'}</span>
            </div>            <nav className="profile-page__nav">
              <button
                type="button"
                className={`profile-page__nav-btn ${activeTab === 'profile' ? 'profile-page__nav-btn--active' : ''}`}
                onClick={() => {
                  setMessage(null);
                  setActiveTab('profile');
                }}
                id="profile-tab-profile"
              >
                My Profile
              </button>
              <button
                type="button"
                className={`profile-page__nav-btn ${activeTab === 'pets' ? 'profile-page__nav-btn--active' : ''}`}
                onClick={() => {
                  setMessage(null);
                  setActiveTab('pets');
                }}
                id="profile-tab-pets"
              >
                My Pets ({pets.length})
              </button>

              {activeTab === 'pets' && (
                <div className="profile-page__pets-drawer">
                  {pets.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className={`profile-drawer-item ${selectedPetIndex === idx ? 'profile-drawer-item--active' : ''}`}
                      onClick={() => setSelectedPetIndex(idx)}
                      title={p.pet_name}
                    >
                      <img
                        src={p.pet_photo || '/placeholder-pet.svg'}
                        alt={p.pet_name}
                        className="profile-drawer-item__avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = p.animal_type === 'cat'
                            ? 'https://placecats.com/neo/600/400'
                            : 'https://placedog.net/600/400?id=1';
                        }}
                      />
                      <span className="profile-drawer-item__name">{p.pet_name}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="profile-drawer-add-btn"
                    onClick={handleAddPet}
                  >
                    + Add Pet
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`profile-page__nav-btn ${activeTab === 'privacy' ? 'profile-page__nav-btn--active' : ''}`}
                onClick={() => {
                  setMessage(null);
                  setActiveTab('privacy');
                }}
                id="profile-tab-privacy"
              >
                Privacy Settings
              </button>
            </nav>
          </aside>

          {/* Right Main Form Area */}
          <section className="profile-page__main">
            {message && (
              <div className={`profile-form__alert profile-form__alert--${message.type}`} role="alert">
                <span>{message.text}</span>
                <button
                  type="button"
                  className="profile-form__alert-dismiss"
                  onClick={() => setMessage(null)}
                  title="Dismiss notification"
                >
                  ×
                </button>
              </div>
            )}

            {/* TAB 1: USER PROFILE DETAILS */}
            {activeTab === 'profile' && (
              <form className="profile-form" onSubmit={handleSaveProfile}>
                <div className="profile-form__grid">
                  <div className="profile-form__field">
                    <label className="profile-form__label">Full Name</label>
                    <input
                      type="text"
                      name="owner_name"
                      value={profile.owner_name}
                      onChange={handleChange}
                      className="profile-form__input"
                    />
                  </div>

                  <div className="profile-form__field">
                    <label className="profile-form__label">Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={profile.date_of_birth}
                      onChange={handleChange}
                      className="profile-form__input"
                    />
                  </div>

                  <div className="profile-form__field">
                    <label className="profile-form__label">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={profile.username}
                      onChange={handleChange}
                      className="profile-form__input"
                    />
                  </div>

                  <div className="profile-form__field">
                    <label className="profile-form__label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      disabled
                      className="profile-form__input profile-form__input--disabled"
                    />
                  </div>
                  <div className="profile-form__field" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="profile-form__label" style={{ margin: 0 }}>Location / City</label>
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: '0.82rem',
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
                      type="text"
                      name="location"
                      value={profile.location || ''}
                      onChange={(e) => {
                        setProfile((prev) => ({ ...prev, location: e.target.value }));
                        setShowLocationSuggestions(true);
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 250)}
                      placeholder="Type any city worldwide (e.g. Stockholm, Vaasa, Berlin)..."
                      className="profile-form__input"
                      id="profile-location-input"
                      autoComplete="off"
                    />
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <ul className="reg-location-dropdown">
                        {locationSuggestions.map((loc, idx) => (
                          <li
                            key={`${loc.name}-${idx}`}
                            onMouseDown={() => {
                              setProfile((prev) => ({ ...prev, location: loc.name }));
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

                <div className="profile-form__field profile-form__field--full">
                  <label className="profile-form__label">Interests</label>
                  <div className="profile-form__chips">
                    {(profile.interests || []).map((interest, i) => (
                      <span key={i} className="profile-form__chip">
                        {interest}
                        <button
                          type="button"
                          className="profile-form__chip-remove"
                          onClick={() => handleToggleInterest(interest)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      className="profile-form__add-chip"
                      onClick={() => setShowInterestsModal(true)}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="profile-form__field profile-form__field--full">
                  <label className="profile-form__label">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={profile.bio}
                    onChange={handleChange}
                    className="profile-form__textarea"
                  />
                </div>

                <div className="profile-form__actions">
                  <Button type="submit" variant="primary" loading={saving}>
                    Save Changes
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 2: MY PETS (Matching Wireframe Row 4 Right) */}
            {activeTab === 'pets' && (
              pets.length === 0 ? (
                <div className="profile-pets-empty-state">
                  <h3>No Pets Added Yet</h3>
                  <p>You haven't added any pets to your profile yet.</p>
                  <Button variant="primary" onClick={handleAddPet}>
                    + Add Pet
                  </Button>
                </div>
              ) : (
                <div className="profile-pets-tab-content">
                  {/* Pet Multi-Photo Gallery Matching Wireframe */}
                  <div className="pet-gallery-wireframe">
                    {/* Left: Big Circular Main Image */}
                    <div className="pet-gallery__main-wrap">
                      <img
                        src={currentPet?.pet_photo || '/paw-icon.svg'}
                        alt={currentPet?.pet_name}
                        className="pet-gallery__main-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/paw-icon.svg';
                        }}
                      />
                    </div>

                    {/* Right: Boxed Gallery Section */}
                    <div className="pet-gallery__box">
                      <div className="pet-gallery__grid">
                        {(currentPet?.photos || [currentPet?.pet_photo || '/paw-icon.svg']).map((photo, pIdx) => {
                          const isMain = photo === currentPet?.pet_photo;
                          return (
                            <div
                              key={pIdx}
                              className={`pet-gallery__thumb-wrap ${isMain ? 'pet-gallery__thumb-wrap--main' : ''}`}
                            >
                              <img
                                src={photo}
                                alt={`Pet ${pIdx + 1}`}
                                className="pet-gallery__thumb-img"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/paw-icon.svg';
                                }}
                              />
                              <button
                                type="button"
                                className="pet-gallery__set-main-overlay"
                                onClick={() => handleSetMainPhoto(photo)}
                                title="Set as main image"
                              >
                                Set Main
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add button at bottom right of the box */}
                      <div className="pet-gallery__footer">
                        <button
                          type="button"
                          className="pet-gallery__add-btn"
                          onClick={() => document.getElementById(`pet-photo-input-${currentPet?.id || 1}`)?.click()}
                        >
                          Add
                        </button>
                        <input
                          type="file"
                          id={`pet-photo-input-${currentPet?.id || 1}`}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handlePetPhotoUpload(e, currentPet?.id || 1)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pet details form bound to selected pet */}
                  <form className="profile-form" onSubmit={handleSavePet}>
                    <div className="profile-form__grid">
                      <div className="profile-form__field">
                        <label className="profile-form__label">Name</label>
                        <input
                          type="text"
                          value={currentPet?.pet_name || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPets((prev) =>
                              prev.map((p, idx) => (idx === selectedPetIndex ? { ...p, pet_name: val } : p))
                            );
                          }}
                          className="profile-form__input"
                        />
                      </div>

                      <div className="profile-form__field">
                        <label className="profile-form__label">Animal Type</label>
                        <select
                          value={currentPet?.animal_type ? currentPet.animal_type.toLowerCase() : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPets((prev) =>
                              prev.map((p, idx) => (idx === selectedPetIndex ? { ...p, animal_type: val } : p))
                            );
                          }}
                          className="profile-form__input"
                        >
                          <option value="">Select a type</option>
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                        </select>
                      </div>

                      <div className="profile-form__field">
                        <label className="profile-form__label">Size</label>
                        <select
                          value={currentPet?.size ? (currentPet.size.charAt(0).toUpperCase() + currentPet.size.slice(1).toLowerCase()) : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPets((prev) =>
                              prev.map((p, idx) => (idx === selectedPetIndex ? { ...p, size: val } : p))
                            );
                          }}
                          className="profile-form__input"
                        >
                          <option value="">Select a size</option>
                          <option value="Small">Small</option>
                          <option value="Medium">Medium</option>
                          <option value="Large">Large</option>
                        </select>
                      </div>

                      <div className="profile-form__field">
                        <label className="profile-form__label">Breed</label>
                        <input
                          type="text"
                          value={currentPet?.breed || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPets((prev) =>
                              prev.map((p, idx) => (idx === selectedPetIndex ? { ...p, breed: val } : p))
                            );
                          }}
                          className="profile-form__input"
                        />
                      </div>

                      <div className="profile-form__field">
                        <label className="profile-form__label">Age (years)</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="1"
                          value={currentPet?.pet_age !== undefined && currentPet?.pet_age !== null ? currentPet.pet_age : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setPets((prev) =>
                              prev.map((p, idx) => (idx === selectedPetIndex ? { ...p, pet_age: val } : p))
                            );
                          }}
                          className="profile-form__input"
                          placeholder="e.g. 2"
                        />
                      </div>

                      <div className="profile-form__field">
                        <label className="profile-form__label">Energy Level</label>
                        <select
                          value={currentPet?.energy_level ? currentPet.energy_level.toLowerCase() : 'medium'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPets((prev) =>
                              prev.map((p, idx) => (idx === selectedPetIndex ? { ...p, energy_level: val } : p))
                            );
                          }}
                          className="profile-form__input"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                  <div className="profile-form__field profile-form__field--full">
                    <label className="profile-form__label">Traits</label>
                    <div className="profile-form__chips">
                      {(currentPet?.temperament || []).map((t, i) => (
                        <span key={i} className="profile-form__chip">
                          {t}
                          <button
                            type="button"
                            className="profile-form__chip-remove"
                            onClick={() => handleToggleTrait(t)}
                            title="Remove trait"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        className="profile-form__add-chip"
                        onClick={() => setShowTraitsModal(true)}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div className="profile-form__field profile-form__field--full">
                    <label className="profile-form__label">Bio</label>
                    <textarea
                      rows={3}
                      value={currentPet?.about_me || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPets((prev) =>
                          prev.map((p, idx) => (idx === selectedPetIndex ? { ...p, about_me: val } : p))
                        );
                      }}
                      className="profile-form__textarea"
                    />
                  </div>

                  <div className="profile-form__actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {pets.length > 0 && currentPet ? (
                      <Button type="button" variant="danger" onClick={() => setShowDeleteModal(true)}>
                        Remove Pet
                      </Button>
                    ) : <div />}
                    <Button type="submit" variant="primary" loading={saving}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
              )
            )}

            {/* TAB 3: PRIVACY SETTINGS */}
            {activeTab === 'privacy' && (
              <div className="profile-privacy">
                <h2>Privacy & Security</h2>
                <p className="profile-privacy__desc">
                  Manage your data, visibility settings, and account permissions.
                </p>

                <div className="profile-privacy__options">
                  <div className="profile-privacy__card">
                    <h3>Terms and Services Agreement</h3>
                    <p>Review our community rules and safety policies.</p>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/terms')}>
                      View Terms
                    </Button>
                  </div>

                  <div className="profile-privacy__card profile-privacy__card--danger">
                    <h3>Delete Account</h3>
                    <p>Permanently remove your profile, pet entries, and match history.</p>
                    <Button variant="danger" size="sm">Delete My Account</Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Confirmation Modal for Remove Pet */}
      {showDeleteModal && currentPet && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Remove {currentPet.pet_name}</h3>
            <p className="modal-body">
              Are you sure you want to remove <strong>{currentPet.pet_name}</strong> from your profile? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDeletePet}>
                Confirm Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Interests Selection Modal */}
      {showInterestsModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <h3 className="modal-title" style={{ color: 'var(--color-primary)' }}>Select Interests</h3>
            <p className="modal-body" style={{ marginBottom: '16px' }}>
              Choose 1 to 5 activities (Selected: {(profile.interests || []).length}/5)
            </p>
            <div className="selector-grid">
              {USER_INTERESTS_POOL.map((item) => {
                const isSelected = (profile.interests || []).includes(item);
                const isMaxReached = (profile.interests || []).length >= 5 && !isSelected;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={isMaxReached}
                    className={`selector-chip ${isSelected ? 'selector-chip--selected' : ''}`}
                    style={isMaxReached ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                    onClick={() => handleToggleInterest(item)}
                  >
                    {isSelected ? `✓ ${item}` : item}
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <Button variant="primary" onClick={() => setShowInterestsModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pet Traits Selection Modal */}
      {showTraitsModal && currentPet && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <h3 className="modal-title" style={{ color: 'var(--color-primary)' }}>
              Select Traits for {currentPet.pet_name}
            </h3>
            <p className="modal-body" style={{ marginBottom: '16px' }}>
              Pick 1 to 5 personality traits (Selected: {(currentPet.temperament || []).length}/5)
            </p>
            <div className="selector-grid">
              {PET_TRAITS_POOL.map((trait) => {
                const isSelected = (currentPet.temperament || []).includes(trait);
                const isMaxReached = (currentPet.temperament || []).length >= 5 && !isSelected;
                return (
                  <button
                    key={trait}
                    type="button"
                    disabled={isMaxReached}
                    className={`selector-chip ${isSelected ? 'selector-chip--selected' : ''}`}
                    style={isMaxReached ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                    onClick={() => handleToggleTrait(trait)}
                  >
                    {isSelected ? `✓ ${trait}` : trait}
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <Button variant="primary" onClick={() => setShowTraitsModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
