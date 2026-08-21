/**
 * Navbar
 *
 * Top navigation bar shown on all pages.
 * Matches wireframe: Pawly logo (left) → view toggle (center) → pet avatars + icons (right)
 *
 * Displays circular pet avatars for the user's owned pets to filter discovery search.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getMyPets, getCachedMyPets, getSavedSelectedPetIds, saveSelectedPetIds } from '../../api/pets';
import './Navbar.css';

const MAX_VISIBLE_PETS = 4;

const DEFAULT_FALLBACK_PETS = [
  { id: 1, pet_name: 'Poppy', animal_type: 'dog', pet_photo: 'https://placedog.net/600/400?id=1' },
  { id: 2, pet_name: 'Peto', animal_type: 'cat', pet_photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80' },
];

const getFullPhotoUrl = (url, animalType) => {
  if (!url) return '/paw-icon.svg';
  if (url.startsWith('/uploads')) {
    return `http://localhost:3000${url}`;
  }
  if (url.startsWith('http') || url.startsWith('/')) {
    return url;
  }
  return animalType === 'cat'
    ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80'
    : 'https://placedog.net/120/120?id=1';
};

export default function Navbar({
  showViewToggle = false,
  currentView,
  onViewChange,
  myPets: myPetsProp,
  selectedPetIds: selectedPetIdsProp,
  onTogglePet,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const petDrawerRef = useRef(null);
  const { totalUnreadCount = 0 } = useWebSocket();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showPetDrawer, setShowPetDrawer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fallback internal pet fetching with local cache
  const [fetchedPets, setFetchedPets] = useState(() => getCachedMyPets());
  const [internalSelectedIds, setInternalSelectedIds] = useState(() => getSavedSelectedPetIds([]));

  useEffect(() => {
    async function loadPets() {
      try {
        const petsData = await getMyPets();
        if (petsData && petsData.length > 0) {
          const allIds = petsData.map((p) => p.id);
          setFetchedPets(petsData);
          setInternalSelectedIds(getSavedSelectedPetIds(allIds));
        }
      } catch {}
    }
    if (!myPetsProp || myPetsProp.length === 0) {
      loadPets();
    }
  }, [myPetsProp]);

  // Determine active pets (guaranteed fallback so avatars are always visible)
  const activePets = (myPetsProp && myPetsProp.length > 0)
    ? myPetsProp
    : (fetchedPets.length > 0 ? fetchedPets : DEFAULT_FALLBACK_PETS);

  const activeSelectedIds = (selectedPetIdsProp && selectedPetIdsProp.length > 0)
    ? selectedPetIdsProp
    : (internalSelectedIds.length > 0 ? internalSelectedIds : getSavedSelectedPetIds([]));

  // Auto-close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (petDrawerRef.current && !petDrawerRef.current.contains(event.target)) {
        setShowPetDrawer(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePetClick = (petId) => {
    if (onTogglePet) {
      onTogglePet(petId);
    } else {
      setInternalSelectedIds((prev) => {
        let updated;
        if (prev.includes(petId)) {
          if (prev.length === 1) return prev; // keep at least 1 selected
          updated = prev.filter((id) => id !== petId);
        } else {
          updated = [...prev, petId];
        }
        saveSelectedPetIds(updated);
        return updated;
      });
    }
  };

  // Keep stable pet order so clicking an avatar never causes layout shift/jumping
  const visiblePets = activePets.slice(0, MAX_VISIBLE_PETS);
  const overflowPets = activePets.slice(MAX_VISIBLE_PETS);
  const hasOverflow = overflowPets.length > 0;

  return (
    <nav className="navbar" id="main-navbar">
      {/* Logo */}
      <Link to="/discover" className="navbar__logo" id="navbar-logo">
        <span className="navbar__logo-text">Pawly</span>
      </Link>

      {/* Center: View toggle on /discover vs Single Discover button on other pages */}
      <div className="navbar__view-toggle" id="view-toggle">
        {location.pathname === '/discover' ? (
          ['Lists', 'Both', 'Map'].map((view) => (
            <button
              key={view}
              className={`navbar__view-btn ${currentView === view ? 'navbar__view-btn--active' : ''}`}
              onClick={() => onViewChange && onViewChange(view)}
              id={`view-toggle-${view.toLowerCase()}`}
            >
              {view}
            </button>
          ))
        ) : (
          <button
            className="navbar__view-btn navbar__view-btn--active"
            onClick={() => navigate('/discover')}
            id="nav-discover-btn"
          >
            Discover
          </button>
        )}
      </div>

      {/* Right side: Pet avatars + Messages + Profile */}
      <div className="navbar__right">
        {/* Pet Avatar Selectors */}
        <div className="navbar__pet-selectors" id="navbar-pet-selectors">
          {visiblePets.map((pet) => {
            const isSelected = activeSelectedIds.includes(pet.id);
            const photoUrl = getFullPhotoUrl(pet.pet_photo, pet.animal_type);
            return (
              <button
                key={pet.id}
                type="button"
                className={`navbar__pet-avatar-btn ${isSelected ? 'navbar__pet-avatar-btn--active' : 'navbar__pet-avatar-btn--muted'}`}
                onClick={() => handlePetClick(pet.id)}
                title={`${isSelected ? 'Deselect' : 'Select'} ${pet.pet_name}`}
                id={`navbar-pet-${pet.id}`}
              >
                <img
                  src={photoUrl}
                  alt={pet.pet_name}
                  className="navbar__pet-avatar-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = pet.animal_type === 'cat'
                      ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80'
                      : 'https://placedog.net/120/120?id=1';
                  }}
                />
              </button>
            );
          })}

          {/* Overflow dropdown for >4 pets */}
          {hasOverflow && (
            <div className="navbar__pet-overflow-wrapper" ref={petDrawerRef}>
              <button
                type="button"
                className="navbar__pet-overflow-btn"
                onClick={() => setShowPetDrawer(!showPetDrawer)}
                title="More pets"
                id="navbar-pet-overflow-btn"
              >
                +{overflowPets.length}
              </button>

              {showPetDrawer && (
                <div className="navbar__pet-drawer" id="navbar-pet-drawer">
                  {overflowPets.map((pet) => {
                    const isSelected = activeSelectedIds.includes(pet.id);
                    const photoUrl = getFullPhotoUrl(pet.pet_photo, pet.animal_type);
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        className={`navbar__pet-drawer-item ${isSelected ? 'navbar__pet-drawer-item--active' : 'navbar__pet-drawer-item--muted'}`}
                        onClick={() => handlePetClick(pet.id)}
                        title={`${isSelected ? 'Deselect' : 'Select'} ${pet.pet_name}`}
                        id={`navbar-pet-drawer-${pet.id}`}
                      >
                        <img
                          src={photoUrl}
                          alt={pet.pet_name}
                          className="navbar__pet-drawer-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placedog.net/120/120?id=1';
                          }}
                        />
                        <span className="navbar__pet-drawer-name">{pet.pet_name}</span>
                        <span className="navbar__pet-drawer-type">{pet.animal_type}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chats icon */}
        <Link
          to="/chats"
          className="navbar__icon-btn navbar__icon-btn--chats"
          aria-label="Messages"
          id="nav-chats-icon"
        >
          <svg className="navbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {totalUnreadCount > 0 && (
            <span className="navbar__unread-badge">{totalUnreadCount}</span>
          )}
        </Link>

        {/* Profile dropdown icon */}
        <div className="navbar__profile-wrapper" ref={dropdownRef}>
          <button
            className="navbar__icon-btn navbar__profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Profile menu"
            id="profile-menu-toggle"
          >
            <svg className="navbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {showDropdown && (
            <div className="navbar__dropdown" id="profile-dropdown">
              <Link
                to="/profile"
                className="navbar__dropdown-item"
                onClick={() => setShowDropdown(false)}
                id="dropdown-profile"
              >
                Profile
              </Link>
              <button
                className="navbar__dropdown-item navbar__dropdown-item--danger"
                onClick={handleLogout}
                id="dropdown-logout"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="navbar__mobile-menu" id="mobile-menu">
          <Link to="/discover" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>Discover</Link>
          <Link to="/connections" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>Connections</Link>
          <Link to="/chats" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>Chats</Link>
          <Link to="/profile" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
          <button className="navbar__mobile-link navbar__mobile-link--danger" onClick={handleLogout}>Log out</button>
        </div>
      )}
    </nav>
  );
}
