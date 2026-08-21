/**
 * TourStep (Tour Version — /tour)
 *
 * Isolated, zero-backend interactive sandbox app tour guided by Pawly.
 * All state lives in memory/sessionStorage — no database calls.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import PetCard from '../../../components/PetCard/PetCard';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import Button from '../../../components/Button/Button';
import {
  TOUR_MY_PETS,
  INITIAL_TOUR_DEMO_PETS,
  MESSAGES_CONNECTED_PET,
  PAWLY_CONTEXT_MESSAGES,
} from '../mockTourData';
import './TourStep.css';

// Custom Leaflet circular pet photo marker matching main app Discover page
const createCustomPetMarker = (photoUrl, petName) => {
  const url = photoUrl || '/paw-icon.svg';
  return L.divIcon({
    className: 'custom-pet-map-marker custom-pet-map-marker--active',
    html: `
      <div class="map-marker-pin map-marker-pin--active">
        <img src="${url}" alt="${petName}" class="map-marker-img" />
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

export default function TourStep() {
  const navigate = useNavigate();

  // Active tour state & Pawly guidance speech
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'messages' | 'profile'
  const [currentViewMode, setCurrentViewMode] = useState('Both'); // 'Lists' | 'Both' | 'Map'
  const [pawlySpeech, setPawlySpeech] = useState(PAWLY_CONTEXT_MESSAGES.default);
  const [showCtaModal, setShowCtaModal] = useState(false);

  // Selected user pets for filtering (Pawly dog & Misi cat)
  const [selectedPetIds, setSelectedPetIds] = useState(['tour_my_dog', 'tour_my_cat']);

  // Demo interactive state (in memory only)
  const [demoPets, setDemoPets] = useState(INITIAL_TOUR_DEMO_PETS);
  const [connectedPetIds, setConnectedPetIds] = useState([]);
  const [demoInput, setDemoInput] = useState('');
  const [demoMessages, setDemoMessages] = useState([
    {
      id: 1,
      sender_user_id: 'connected_owner_1',
      body: 'Hi! Sofia and Oliver here. We saw your pet profile and would love to meet up for a dog park playdate!',
      created_at: 'Just now',
    },
  ]);

  const messagesEndRef = useRef(null);

  // Esc key listener to close sign-up CTA modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showCtaModal) {
        setShowCtaModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCtaModal]);

  // Auto-scroll demo chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [demoMessages]);

  // Toggle pet filter (Pawly dog vs Misi cat)
  const handleTogglePetFilter = (petId) => {
    setSelectedPetIds((prev) => {
      let updated;
      if (prev.includes(petId)) {
        if (prev.length === 1) return prev; // keep at least 1 selected
        updated = prev.filter((id) => id !== petId);
      } else {
        updated = [...prev, petId];
      }

      // Update Pawly speech based on filter selection
      const hasDog = updated.includes('tour_my_dog');
      const hasCat = updated.includes('tour_my_cat');
      if (hasDog && !hasCat) {
        setPawlySpeech(PAWLY_CONTEXT_MESSAGES.pet_avatar_dog);
      } else if (hasCat && !hasDog) {
        setPawlySpeech(PAWLY_CONTEXT_MESSAGES.pet_avatar_cat);
      } else {
        setPawlySpeech(PAWLY_CONTEXT_MESSAGES.pet_avatar_both);
      }

      return updated;
    });
  };

  // Filtered demo pets based on active pet selection
  const filteredDemoPets = useMemo(() => {
    const hasDog = selectedPetIds.includes('tour_my_dog');
    const hasCat = selectedPetIds.includes('tour_my_cat');

    return demoPets.filter((pet) => {
      if (hasDog && hasCat) return true;
      if (hasDog && pet.animal_type === 'dog') return true;
      if (hasCat && pet.animal_type === 'cat') return true;
      return false;
    });
  }, [demoPets, selectedPetIds]);

  // Handle View Mode Toggles (Lists / Both / Map)
  const handleViewToggle = (mode) => {
    setCurrentViewMode(mode);
    if (mode === 'Lists') {
      setPawlySpeech(PAWLY_CONTEXT_MESSAGES.view_lists);
    } else if (mode === 'Both') {
      setPawlySpeech(PAWLY_CONTEXT_MESSAGES.view_both);
    } else if (mode === 'Map') {
      setPawlySpeech(PAWLY_CONTEXT_MESSAGES.view_map);
    }
  };

  // Handle Tab Switch (Discover / Messages / Profile)
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === 'discover') {
      setPawlySpeech(PAWLY_CONTEXT_MESSAGES.tab_discover);
    } else if (tab === 'messages') {
      setPawlySpeech(PAWLY_CONTEXT_MESSAGES.tab_messages);
    } else if (tab === 'profile') {
      setPawlySpeech(PAWLY_CONTEXT_MESSAGES.tab_profile);
    }
  };

  // Handle Demo Connect Action
  const handleDemoConnect = (petId) => {
    if (!connectedPetIds.includes(petId)) {
      setConnectedPetIds((prev) => [...prev, petId]);
    }
    setDemoPets((prev) => prev.filter((p) => p.id !== petId));
    setPawlySpeech(PAWLY_CONTEXT_MESSAGES.connect_click);
  };

  // Handle Demo Message Send
  const handleSendDemoMessage = (e) => {
    e.preventDefault();
    if (!demoInput.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender_user_id: 'me',
      body: demoInput.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDemoMessages((prev) => [...prev, userMsg]);
    setDemoInput('');
    setPawlySpeech(PAWLY_CONTEXT_MESSAGES.send_message);

    // Trigger simulated reply from Sofia after 1s
    setTimeout(() => {
      setDemoMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender_user_id: 'connected_owner_1',
          body: 'That sounds awesome! Saturday afternoon at Kaivopuisto works great for us.',
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  return (
    <div className="tour-page" id="tour-version-page">
      {/* Single Unified Pawly Tour Header */}
      <header className="tour-header" id="tour-main-header">
        <div className="tour-header__left">
          <span className="tour-header__logo">Pawly</span>
          <span className="tour-header__mode-tag">TOUR</span>
        </div>

        {/* Center Pawly Mascot Companion Speech Guidance Bar */}
        <div className="tour-header__center">
          <img
            src="/paw-icon.svg"
            alt="Pawly Mascot"
            className="tour-header__avatar"
          />
          <div className="tour-header__info">
            <p className="tour-header__speech">{pawlySpeech}</p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="tour-header__right">
          <button
            className="tour-btn tour-btn--primary-finish"
            onClick={() => setShowCtaModal(true)}
          >
            Finish & Sign Up
          </button>
        </div>
      </header>

      {/* Main App Mirror Sub-Header Controls */}
      <div className="tour-app-nav">
        {/* Left Side: Lists/Both/Map toggles when in Discover, OR single Discover button when in Messages/Profile */}
        {activeTab === 'discover' ? (
          <div className="tour-view-toggle">
            {['Lists', 'Both', 'Map'].map((mode) => (
              <button
                key={mode}
                className={`tour-view-btn ${currentViewMode === mode ? 'tour-view-btn--active' : ''}`}
                onClick={() => handleViewToggle(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        ) : (
          <button
            className="tour-view-btn tour-view-btn--active"
            onClick={() => handleTabSwitch('discover')}
          >
            Discover
          </button>
        )}

        {/* Right Side: Pet Avatar Selectors (Pawly dog + Misi cat) & Navigation Tabs */}
        <div className="tour-app-nav__right">
          {/* Pet Avatars Filter (Dog + Cat) */}
          <div className="navbar__pet-selectors" style={{ display: 'flex', gap: '6px' }}>
            {TOUR_MY_PETS.map((pet) => {
              const isSelected = selectedPetIds.includes(pet.id);
              return (
                <button
                  key={pet.id}
                  type="button"
                  className={`navbar__pet-avatar-btn ${isSelected ? 'navbar__pet-avatar-btn--active' : 'navbar__pet-avatar-btn--muted'}`}
                  onClick={() => handleTogglePetFilter(pet.id)}
                  title={`Filter for ${pet.pet_name} (${pet.animal_type})`}
                >
                  <img src={pet.pet_photo} alt={pet.pet_name} className="navbar__pet-avatar-img" />
                </button>
              );
            })}
          </div>

          <button
            className={`tour-nav-tab ${activeTab === 'messages' ? 'tour-nav-tab--active' : ''}`}
            onClick={() => handleTabSwitch('messages')}
          >
            Messages
          </button>

          <button
            className={`tour-nav-tab ${activeTab === 'profile' ? 'tour-nav-tab--active' : ''}`}
            onClick={() => handleTabSwitch('profile')}
          >
            Profile
          </button>
        </div>
      </div>

      {/* Main Tour Sandbox Workspace */}
      <main className="tour-sandbox-container">
        {/* VIEW 1: DISCOVER SANDBOX WITH LEAFLET MAP & PET FILTERING */}
        {activeTab === 'discover' && (
          <div className={`discover__content discover__content--${currentViewMode.toLowerCase()}`}>
            {filteredDemoPets.length === 0 ? (
              <div className="chat-mid-empty" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <h2>No Pets Match Filter</h2>
                <p>Select Pawly (dog) or Misi (cat) in the header to view matches!</p>
              </div>
            ) : (
              <>
                {/* List View Cards Column (visible in Lists and Both modes) */}
                {(currentViewMode === 'Lists' || currentViewMode === 'Both') && (
                  <div className="discover__card-grid">
                    {filteredDemoPets.map((pet) => (
                      <PetCard
                        key={pet.id}
                        pet={pet}
                        matchPercentage={pet.match_percentage}
                        distanceKm={pet.distance_km}
                        onConnect={handleDemoConnect}
                        onRemove={(id) => {
                          setDemoPets((prev) => prev.filter((p) => p.id !== id));
                          setPawlySpeech(PAWLY_CONTEXT_MESSAGES.remove_click);
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Leaflet Map (visible in Both and Map modes) */}
                {(currentViewMode === 'Both' || currentViewMode === 'Map') && (
                  <div className="discover__map-wrapper">
                    <MapContainer
                      center={[60.171, 24.933]}
                      zoom={13}
                      scrollWheelZoom={true}
                      className="discover__leaflet-container"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {filteredDemoPets.map((pet) => (
                        <Marker
                          key={pet.id}
                          position={[pet.latitude, pet.longitude]}
                          icon={createCustomPetMarker(pet.pet_photo, pet.pet_name)}
                        >
                          <Popup>
                            <div className="discover__popup-single-card" style={{ width: '220px', padding: '0.5rem', textAlign: 'center' }}>
                              <img
                                src={pet.pet_photo}
                                alt={pet.pet_name}
                                style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.5rem' }}
                              />
                              <h4 style={{ margin: '0 0 0.25rem', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
                                {pet.pet_name}
                              </h4>
                              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {pet.breed} • {pet.distance_km} km away
                              </p>
                              <Button
                                variant="primary"
                                size="sm"
                                style={{ width: '100%' }}
                                onClick={() => handleDemoConnect(pet.id)}
                              >
                                Connect
                              </Button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW 2: MESSAGES SANDBOX (With Pet & Owner Info Panel) */}
        {activeTab === 'messages' && (
          <div className="unified-chat-grid" style={{ height: 'calc(100vh - 220px)' }}>
            {/* Left Conversations Column */}
            <aside className="chat-left-col">
              <div className="chat-left-header">
                <h2>Messages</h2>
              </div>
              <div className="chat-list-scroll">
                <div className="chat-list-item chat-list-item--active">
                  <div className="chat-list-item__avatar-wrap">
                    <img
                      src={MESSAGES_CONNECTED_PET.pet_photo}
                      alt={MESSAGES_CONNECTED_PET.pet_name}
                      className="chat-list-item__avatar"
                    />
                    <StatusBadge isOnline={true} size="sm" />
                  </div>
                  <div className="chat-list-item__body">
                    <div className="chat-list-item__row1">
                      <span className="chat-list-item__name">
                        {MESSAGES_CONNECTED_PET.pet_name} & {MESSAGES_CONNECTED_PET.owner_name}
                      </span>
                      <span className="chat-list-item__time">Just now</span>
                    </div>
                    <p className="chat-list-item__snippet truncate">
                      {demoMessages[demoMessages.length - 1]?.body}
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Middle Chat Stream Column */}
            <section className="chat-mid-col">
              <div className="chat-mid-header">
                <img
                  src={MESSAGES_CONNECTED_PET.pet_photo}
                  alt={MESSAGES_CONNECTED_PET.pet_name}
                  className="chat-mid-header__avatar"
                />
                <div>
                  <h3 className="chat-mid-header__name">
                    {MESSAGES_CONNECTED_PET.pet_name} & {MESSAGES_CONNECTED_PET.owner_name}
                  </h3>
                  <div className="chat-mid-header__status">
                    <StatusBadge isOnline={true} size="sm" />
                    <span>Connected Match</span>
                  </div>
                </div>
              </div>

              <div className="chat-mid-messages">
                {demoMessages.map((msg) => {
                  const isMe = msg.sender_user_id === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={`chat-bubble-row ${isMe ? 'chat-bubble-row--me' : 'chat-bubble-row--other'}`}
                    >
                      <div className="chat-bubble">
                        <p style={{ whiteSpace: 'pre-line' }}>{msg.body}</p>
                        <span className="chat-bubble__time">{msg.created_at}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendDemoMessage} className="chat-mid-input-bar">
                <input
                  type="text"
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  placeholder="Type a demo message..."
                  className="chat-mid-input"
                  id="tour-chat-input"
                />
                <Button type="submit" variant="accent" id="tour-send-btn">
                  Send
                </Button>
              </form>
            </section>

            {/* Right Profile Summary Column (With Pet & Owner Info matching main app) */}
            <aside className="chat-right-col">
              <div className="in-place-pet-detail" style={{ margin: 0, padding: 0, background: 'transparent', boxShadow: 'none' }}>
                <div className="in-place-pet-detail__hero">
                  <img
                    src={MESSAGES_CONNECTED_PET.pet_photo}
                    alt={MESSAGES_CONNECTED_PET.pet_name}
                    className="in-place-pet-detail__photo"
                  />
                  <div className="chat-right-col__match-pill">
                    {MESSAGES_CONNECTED_PET.match_percentage}% matched
                  </div>
                </div>
                <h1 className="in-place-pet-detail__name">{MESSAGES_CONNECTED_PET.pet_name}</h1>
                <div className="in-place-pet-detail__meta">
                  <span>{MESSAGES_CONNECTED_PET.animal_type.toUpperCase()}</span>
                  <span>{MESSAGES_CONNECTED_PET.breed}</span>
                  <span>{MESSAGES_CONNECTED_PET.size.toUpperCase()}</span>
                </div>
                <div className="in-place-pet-detail__chips">
                  {MESSAGES_CONNECTED_PET.temperament.map((t) => (
                    <span key={t} className="in-place-chip">{t.toUpperCase()}</span>
                  ))}
                </div>
                <p className="in-place-pet-detail__bio">
                  {MESSAGES_CONNECTED_PET.about_me}
                </p>

                <hr className="in-place-divider" />

                {/* Owner Info Section matching main app */}
                <div className="in-place-owner-section">
                  <div className="in-place-owner-header">
                    <img
                      src={MESSAGES_CONNECTED_PET.owner_photo}
                      alt={MESSAGES_CONNECTED_PET.owner_name}
                      className="in-place-owner-avatar"
                    />
                    <div>
                      <h2 className="in-place-owner-title">
                        {MESSAGES_CONNECTED_PET.owner_name} <span className="in-place-owner-label">(Owner)</span>
                      </h2>
                      <div className="in-place-owner-status">
                        <StatusBadge isOnline={true} size="sm" />
                        <span>Online</span>
                      </div>
                    </div>
                  </div>

                  <p className="in-place-owner-bio">{MESSAGES_CONNECTED_PET.owner_bio}</p>

                  <div className="in-place-owner-badges">
                    <span className="in-place-badge in-place-badge--verified">✓ Verified user</span>
                    <span className="in-place-badge">100% response rate</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* VIEW 3: PROFILE SANDBOX */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '700px', margin: '2rem auto', textAlign: 'center' }}>
            <div className="chat-left-col" style={{ padding: '2.5rem 2rem' }}>
              <img
                src="/paw-icon.svg"
                alt="Pawly Guide"
                style={{ width: '90px', height: '90px', margin: '0 auto 1rem' }}
              />
              <h1>Pet Profile Management Sandbox</h1>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                In your profile, you can manage your owner bio, add your pets with photos, breed info, energy levels, and traits to start matching.
              </p>
              <Button variant="primary" onClick={() => setShowCtaModal(true)}>
                Create Free Account
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* REGISTRATION CTA MODAL WITH ESC & CLOSE BUTTON */}
      {showCtaModal && (
        <div className="tour-cta-backdrop" onClick={() => setShowCtaModal(false)}>
          <div className="tour-cta-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="tour-cta-card__close"
              onClick={() => setShowCtaModal(false)}
              aria-label="Close"
              title="Close (Esc)"
            >
              ×
            </button>
            <img src="/paw-icon.svg" alt="Pawly" className="tour-cta-card__avatar" />
            <h2>Ready to Connect Real Pets?</h2>
            <p>
              You have experienced the Pawly Tour! Join hundreds of pet owners in Helsinki today.
            </p>
            <button
              className="tour-cta-card__btn-primary"
              onClick={() => navigate('/register')}
            >
              Create Free Account
            </button>
            <button
              className="tour-cta-card__btn-secondary"
              onClick={() => navigate('/')}
            >
              Go back to landing page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
