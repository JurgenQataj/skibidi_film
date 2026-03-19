import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import { useState, lazy, Suspense } from "react";

// Lazy import Pagine (code splitting: ogni pagina è un chunk separato)
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ListPage = lazy(() => import("./pages/ListPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const MovieDetailPage = lazy(() => import("./pages/MovieDetailPage"));
const TvShowDetailPage = lazy(() => import("./pages/TvShowDetailPage"));
const MyListsPage = lazy(() => import("./pages/MyListsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RegistrationPage = lazy(() => import("./pages/RegistrationPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const UserHistoryPage = lazy(() => import("./pages/UserHistoryPage"));
const PersonPage = lazy(() => import("./pages/PersonPage"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const PartialCollectionsPage = lazy(() => import("./pages/PartialCollectionsPage"));
const HorizonPage = lazy(() => import("./pages/HorizonPage"));
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const RatingGamePage = lazy(() => import("./pages/RatingGamePage"));
const RatingGamePlay = lazy(() => import("./pages/RatingGamePlay"));
const ActorAgeGamePage = lazy(() => import("./pages/ActorAgeGamePage"));
const ActorAgeGamePlay = lazy(() => import("./pages/ActorAgeGamePlay"));
const GuessActorGamePage = lazy(() => import("./pages/GuessActorGamePage"));
const GuessActorGamePlay = lazy(() => import("./pages/GuessActorGamePlay"));
const GuessYearGamePage = lazy(() => import("./pages/GuessYearGamePage"));
const GuessYearGamePlay = lazy(() => import("./pages/GuessYearGamePlay"));


// Import Componenti
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import UpdatePrompt from "./components/UpdatePrompt";
import InstallPrompt from "./components/InstallPrompt";
import EnableNotificationsPrompt from "./components/EnableNotificationsPrompt";
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
        initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.01, filter: "blur(4px)" }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="page-transition-wrapper"
        onAnimationComplete={(definition) => {
          // Quando finisce l'animazione di entrata, rimuovi filter e transform
          // per evitare che diventino context block per "position: fixed" 
          // e per risolvere il bug di Safari che rende neri gli iframe
          const el = document.querySelector('.page-transition-wrapper');
          if (el) {
            el.style.transform = 'none';
            el.style.filter = 'none';
          }
        }}
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
      <InstallPrompt />
      <EnableNotificationsPrompt />
      <Suspense fallback={null}>
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
            <Route path="horizon" element={<HorizonPage />} />
            <Route path="rating-game" element={<RatingGamePage />} />
            <Route path="rating-game/play" element={<RatingGamePlay />} />
            <Route path="actor-age-game" element={<ActorAgeGamePage />} />
            <Route path="actor-age-game/play" element={<ActorAgeGamePlay />} />
            <Route path="guess-actor" element={<GuessActorGamePage />} />
            <Route path="guess-actor/play" element={<GuessActorGamePlay />} />
            <Route path="guess-year" element={<GuessYearGamePage />} />
            <Route path="guess-year/play" element={<GuessYearGamePlay />} />
            
            {/* Profilo e Statistiche */}
            <Route path="profile/:userId" element={<ProfilePage />} />
            <Route path="profile/:userId/stats" element={<StatsPage />} />
            <Route path="profile/:userId/goals" element={<GoalsPage />} />
            <Route path="profile/:userId/history" element={<UserHistoryPage />} />
            <Route path="person/:name" element={<PersonPage />} />
            <Route path="movie/:tmdbId" element={<MovieDetailPage />} />
            <Route path="tv/:tmdbId" element={<TvShowDetailPage />} />
            <Route path="collection/:id" element={<CollectionPage />} />

          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;