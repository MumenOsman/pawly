import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Pages — Person 1
import LandingPage from './pages/LandingPage/LandingPage';

// Pages — Person 2
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import TourStep from './pages/Onboarding/steps/TourStep';
import Terms from './pages/Terms/Terms';

// Pages — Person 3
import Discover from './pages/Discover/Discover';
import PetProfile from './pages/PetProfile/PetProfile';
import Profile from './pages/Profile/Profile';
import ChatList from './pages/ChatList/ChatList';
import ChatView from './pages/ChatView/ChatView';
import Settings from './pages/Settings/Settings';

// Layout & Providers
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/tour" element={<TourStep />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboard" element={<Navigate to="/register" replace />} />

          {/* Protected routes — require authentication */}
          <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
          <Route path="/pets/:id" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/chats" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />
          <Route path="/chats/:id" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </WebSocketProvider>
  );
}

export default App;
