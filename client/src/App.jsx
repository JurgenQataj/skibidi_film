import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import { useState } from "react";

// Import Pagine
import DiscoverPage from "./pages/DiscoverPage";
import HomePage from "./pages/HomePage";
import ListPage from "./pages/ListPage";
import LoginPage from "./pages/LoginPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import TvShowDetailPage from "./pages/TvShowDetailPage"; // [NEW] Import TvShowDetailPage
import MyListsPage from "./pages/MyListsPage";
import ProfilePage from "./pages/ProfilePage";
import RegistrationPage from "./pages/RegistrationPage";
import SearchPage from "./pages/SearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import NotificationsPage from "./pages/NotificationsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StatsPage from "./pages/StatsPage"; // Import StatsPage
import UserHistoryPage from "./pages/UserHistoryPage"; // [NEW] Import UserHistoryPage
import PersonPage from "./pages/PersonPage";
import CollectionPage from "./pages/CollectionPage"; // [NEW] Import CollectionPage
import PartialCollectionsPage from "./pages/PartialCollectionsPage";
import HorizonPage from "./pages/HorizonPage"; // [NEW] Skibidi Horizon
import GoalsPage from "./pages/GoalsPage";
import RatingGamePage from "./pages/RatingGamePage";
import RatingGamePlay from "./pages/RatingGamePlay";


// Import Componenti
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import UpdatePrompt from "./components/UpdatePrompt";
import SplashScreen from "./components/SplashScreen";
import "./App.css";

import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

// Modifica MainLayout per accettare location e gestire l'animazione
function AnimatedLayout() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="page-transition-wrapper"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

// Layout per le pagine protette che mostra la Navbar
function MainLayout() {
  return (
    <div>
      <Navbar />
      <main>
        <AnimatedLayout />
      </main>
    </div>
  );
}

function App() {
  const { token } = useAuthStore();
  // Mostra splash solo al primo accesso della sessione
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('splashShown')
  );

  const handleSplashFinish = () => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <UpdatePrompt />
      <Routes>
        {/* Rotte Pubbliche (Auth) */}
        <Route
          path="/register"
          element={token ? <Navigate to="/" /> : <RegistrationPage />}
        />
        <Route
          path="/login"
          element={token ? <Navigate to="/" /> : <LoginPage />}
        />
        
        {/* Rotte Password Reset */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Rotte Protette (Richiedono Login) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="my-lists" element={<MyListsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="list/:listId" element={<ListPage />} />
          <Route path="partial-collections" element={<PartialCollectionsPage />} />
          <Route path="horizon" element={<HorizonPage />} /> {/* [NEW] Skibidi Horizon */}
          <Route path="rating-game" element={<RatingGamePage />} />
          <Route path="rating-game/play" element={<RatingGamePlay />} />
          
          {/* Profilo e Statistiche */}
          <Route path="profile/:userId" element={<ProfilePage />} />
          <Route path="profile/:userId/stats" element={<StatsPage />} />
          <Route path="profile/:userId/goals" element={<GoalsPage />} />
          <Route path="profile/:userId/history" element={<UserHistoryPage />} />
          <Route path="person/:name" element={<PersonPage />} />
          <Route path="movie/:tmdbId" element={<MovieDetailPage />} />
          <Route path="tv/:tmdbId" element={<TvShowDetailPage />} /> {/* [NEW] TV Route */}
          <Route path="collection/:id" element={<CollectionPage />} />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;