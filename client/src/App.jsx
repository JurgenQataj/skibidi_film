import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Import Pagine
import DiscoverPage from "./pages/DiscoverPage";
import HomePage from "./pages/HomePage";
import ListPage from "./pages/ListPage";
import LoginPage from "./pages/LoginPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import MyListsPage from "./pages/MyListsPage";
import ProfilePage from "./pages/ProfilePage";
import RegistrationPage from "./pages/RegistrationPage";
import SearchPage from "./pages/SearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import NotificationsPage from "./pages/NotificationsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StatsPage from "./pages/StatsPage"; // Import StatsPage
import PersonPage from "./pages/PersonPage";
import CollectionPage from "./pages/CollectionPage"; // [NEW] Import CollectionPage
import PartialCollectionsPage from "./pages/PartialCollectionsPage";

// Import Componenti
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import UpdatePrompt from "./components/UpdatePrompt";
import "./App.css";

// Layout per le pagine protette che mostra la Navbar
function MainLayout() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  const { token } = useAuth();

  return (
    <Router>
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
          
          {/* Profilo e Statistiche */}
          <Route path="profile/:userId" element={<ProfilePage />} />
          <Route path="profile/:userId/stats" element={<StatsPage />} />
          <Route path="person/:name" element={<PersonPage />} />
          <Route path="movie/:tmdbId" element={<MovieDetailPage />} />
          <Route path="collection/:id" element={<CollectionPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;