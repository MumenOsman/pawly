import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

// Mock UI preview data for the monitor mockup screen
const PREVIEW_PETS = [
  {
    id: 1,
    name: "Luna",
    breed: "Golden Retriever",
    animal: "Dog",
    age: "2 yrs",
    match: 98,
    distance: "1.2 km away",
    location: "Töölö, Helsinki",
    image: "https://placedog.net/600/400?id=10",
    tags: ["Friendly", "Playful", "Energetic"]
  },
  {
    id: 2,
    name: "Milo",
    breed: "Siamese Cat",
    animal: "Cat",
    age: "3 yrs",
    match: 95,
    distance: "2.4 km away",
    location: "Kamppi, Helsinki",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80",
    tags: ["Curious", "Gentle", "Affectionate"]
  },
  {
    id: 3,
    name: "Rocky",
    breed: "French Bulldog",
    animal: "Dog",
    age: "2 yrs",
    match: 91,
    distance: "1.8 km away",
    location: "Punavuori, Helsinki",
    image: "https://placedog.net/600/400?id=15",
    tags: ["Social", "Calm", "Cuddly"]
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeScreenTab, setActiveScreenTab] = useState('discover'); // 'discover' | 'map' | 'chat'

  return (
    <div className="landing-page-wrapper">

      {/* 1. HEADER (Pawly Brand Logo Left, Sign In Right) */}
      <header className="landing-navbar">
        <div className="landing-navbar__logo" onClick={() => navigate('/')}>
          <span className="landing-navbar__logo-text">Pawly</span>
        </div>
        <div className="landing-navbar__actions">
          <button className="landing-nav-btn" onClick={() => navigate('/login')}>
            Sign In / Create Account
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION WITH BACKGROUND IMAGE */}
      <section className="hero-banner">
        <div className="hero-content">
          <h1>Find the Perfect Playdate</h1>
          <p>Connect with local pets and build a vibrant community for your furry family members.</p>
          <div className="hero-buttons">
            <button className="primary-btn large-btn" onClick={() => navigate('/tour')}>
              Take a Tour
            </button>
            <button className="secondary-btn large-btn" onClick={() => navigate('/register')}>
              Join Pawly
            </button>
          </div>
        </div>
      </section>

      {/* 3. MONITOR MOCKUP SECTION SHOWING APP VIEWS */}
      <section className="mockup-section">
        <div className="mockup-header">
          <h2>Experience Pawly Before You Join</h2>
          <p>Explore our intuitive interface designed for safe, compatible pet socialization in Finland.</p>
        </div>

        {/* Desktop Monitor Frame Mockup */}
        <div className="monitor-container">
          <div className="monitor-device">
            {/* Monitor Camera & Bezel */}
            <div className="monitor-bezel-top">
              <span className="monitor-camera"></span>
            </div>

            {/* Monitor Screen Content */}
            <div className="monitor-screen">
              {/* Screen Top Bar */}
              <div className="screen-header">
                <div className="screen-header__brand">
                  <span className="screen-header__logo">Pawly</span>
                </div>
                <div className="screen-header__nav">
                  <button
                    type="button"
                    className={`screen-tab-btn ${activeScreenTab === 'discover' ? 'screen-tab-btn--active' : ''}`}
                    onClick={() => setActiveScreenTab('discover')}
                  >
                    Discover Matches
                  </button>
                  <button
                    type="button"
                    className={`screen-tab-btn ${activeScreenTab === 'map' ? 'screen-tab-btn--active' : ''}`}
                    onClick={() => setActiveScreenTab('map')}
                  >
                    Interactive Map
                  </button>
                  <button
                    type="button"
                    className={`screen-tab-btn ${activeScreenTab === 'chat' ? 'screen-tab-btn--active' : ''}`}
                    onClick={() => setActiveScreenTab('chat')}
                  >
                    Direct Messages
                  </button>
                </div>
                <div className="screen-header__user">
                  <div className="screen-user-pill">Connected</div>
                </div>
              </div>

              {/* View 1: Discover Card Grid */}
              {activeScreenTab === 'discover' && (
                <div className="screen-content screen-content--discover">
                  <div className="screen-cards-grid">
                    {PREVIEW_PETS.map(pet => (
                      <div key={pet.id} className="preview-pet-card">
                        <div className="preview-pet-card__image-wrap">
                          <img src={pet.image} alt={pet.name} />
                          <div className="preview-match-badge">{pet.match}% Match</div>
                        </div>
                        <div className="preview-pet-card__body">
                          <div className="preview-pet-card__title-row">
                            <h3>{pet.name}</h3>
                            <span className="preview-pet-card__breed">{pet.breed}</span>
                          </div>
                          <p className="preview-pet-card__location">{pet.location} • {pet.distance}</p>
                          <div className="preview-pet-card__chips">
                            {pet.tags.map(tag => (
                              <span key={tag} className="preview-chip">{tag}</span>
                            ))}
                          </div>
                          <button type="button" className="preview-connect-btn">
                            Connect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View 2: Google Maps-styled Interactive Map View */}
              {activeScreenTab === 'map' && (
                <div className="screen-content screen-content--map">
                  <div className="gmap-mock-container">
                    {/* Google Map Mock UI Controls */}
                    <div className="gmap-search-bar">
                      <span className="gmap-search-text">Search Helsinki dog parks & pets...</span>
                    </div>

                    {/* Google Map Map Canvas with SVG Roads & Areas */}
                    <div className="gmap-canvas">
                      <svg className="gmap-svg-grid" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        {/* Water bodies */}
                        <path d="M 0,320 Q 150,280 300,340 T 600,300 T 900,360 L 900,450 L 0,450 Z" fill="#A5C9EB" opacity="0.8" />
                        <path d="M 650,0 Q 720,80 800,120 T 950,90 L 950,0 Z" fill="#A5C9EB" opacity="0.8" />
                        {/* Green parks */}
                        <rect x="60" y="40" width="180" height="120" rx="16" fill="#CEE6B4" />
                        <rect x="420" y="70" width="220" height="140" rx="20" fill="#CEE6B4" />
                        <rect x="250" y="190" width="150" height="100" rx="14" fill="#D7ECD9" />
                        {/* Main Roads */}
                        <path d="M 0,160 Q 250,150 500,170 T 1000,150" stroke="#FFF" strokeWidth="12" fill="none" />
                        <path d="M 0,160 Q 250,150 500,170 T 1000,150" stroke="#F4C430" strokeWidth="6" fill="none" />
                        <path d="M 280,0 Q 290,200 310,450" stroke="#FFF" strokeWidth="10" fill="none" />
                        <path d="M 280,0 Q 290,200 310,450" stroke="#FAD980" strokeWidth="5" fill="none" />
                        <path d="M 580,0 Q 560,220 590,450" stroke="#FFF" strokeWidth="10" fill="none" />
                        <path d="M 580,0 Q 560,220 590,450" stroke="#FAD980" strokeWidth="5" fill="none" />
                        {/* Local Street Grid */}
                        <line x1="120" y1="0" x2="120" y2="300" stroke="#FFF" strokeWidth="4" />
                        <line x1="450" y1="0" x2="450" y2="300" stroke="#FFF" strokeWidth="4" />
                        <line x1="750" y1="100" x2="750" y2="400" stroke="#FFF" strokeWidth="4" />
                        <line x1="0" y1="80" x2="800" y2="80" stroke="#FFF" strokeWidth="4" />
                        <line x1="0" y1="240" x2="800" y2="240" stroke="#FFF" strokeWidth="4" />
                      </svg>

                      {/* Map Location Pins */}
                      <div className="gmap-pin gmap-pin--1">
                        <div className="gmap-pin__bubble">
                          <img src={PREVIEW_PETS[0].image} alt="Luna" />
                          <span className="gmap-pin__label">Luna (98%)</span>
                        </div>
                        <div className="gmap-pin__point"></div>
                      </div>

                      <div className="gmap-pin gmap-pin--2">
                        <div className="gmap-pin__bubble">
                          <img src={PREVIEW_PETS[1].image} alt="Milo" />
                          <span className="gmap-pin__label">Milo (95%)</span>
                        </div>
                        <div className="gmap-pin__point"></div>
                      </div>

                      <div className="gmap-pin gmap-pin--3">
                        <div className="gmap-pin__bubble">
                          <img src={PREVIEW_PETS[2].image} alt="Rocky" />
                          <span className="gmap-pin__label">Rocky (91%)</span>
                        </div>
                        <div className="gmap-pin__point"></div>
                      </div>

                      {/* Google Map Zoom Controls */}
                      <div className="gmap-controls">
                        <div className="gmap-btn">+</div>
                        <div className="gmap-btn">−</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View 3: Chat View Mock View */}
              {activeScreenTab === 'chat' && (
                <div className="screen-content screen-content--chat">
                  <div className="chat-mock-layout">
                    <div className="chat-mock-sidebar">
                      <div className="chat-mock-user chat-mock-user--active">
                        <img src="https://placedog.net/600/400?id=5" alt="Oliver" />
                        <div>
                          <strong>Oliver & Sofia</strong>
                          <p>Let's meet at Kaivopuisto!</p>
                        </div>
                      </div>
                      <div className="chat-mock-user">
                        <img src={PREVIEW_PETS[0].image} alt="Luna" />
                        <div>
                          <strong>Luna & Mikael</strong>
                          <p>Great playdate yesterday!</p>
                        </div>
                      </div>
                    </div>
                    <div className="chat-mock-messages">
                      <div className="chat-mock-bubble chat-mock-bubble--incoming">
                        Hi! We saw your pet profile and would love to organize a weekend walk!
                      </div>
                      <div className="chat-mock-bubble chat-mock-bubble--outgoing">
                        That sounds wonderful! Saturday afternoon works perfectly for us.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Monitor Chin Logo */}
            <div className="monitor-chin">
              <span className="monitor-brand-tag">Pawly</span>
            </div>
          </div>

          {/* Monitor Stand */}
          <div className="monitor-stand-neck"></div>
          <div className="monitor-stand-base"></div>
        </div>
      </section>

      {/* 4. CALL TO ACTION */}
      <section className="cta-section">
        <h2>Ready to connect with these pets?</h2>
        <p>Join the community today to start messaging owners and scheduling safe, fun playdates.</p>
        <button className="primary-btn large-btn" onClick={() => navigate('/login')}>
          Create Your Free Account
        </button>
      </section>

      {/* 5. GUIDELINES SECTION */}
      <section className="guidelines-section">
        <h2>Guidelines for a Purr-fect Pet Date</h2>
        <div className="guidelines-grid">
          <div className="guide-card">
            <h3>The Meetup</h3>
            <p>Always choose a neutral, public location for the first meeting. Keep both pets on leashes initially to gauge their reactions safely and comfortably.</p>
          </div>
          <div className="guide-card">
            <h3>Owner Etiquette</h3>
            <p>Communicate openly about your pet's triggers, dietary restrictions, and play style before linking up for a walk. Good communication prevents surprises.</p>
          </div>
          <div className="guide-card">
            <h3>Location Safety</h3>
            <p>Stick to designated walking trails or fenced areas like the Central Park Dog Run. Avoid high-traffic roads, be aware of your surroundings, and always bring water.</p>
          </div>
        </div>
      </section>

      {/* 6. FOOTER (ONLY THE LOGO) */}
      <footer className="footer">
        <div className="footer-logo">
          Pawly
        </div>
      </footer>

    </div>
  );
}