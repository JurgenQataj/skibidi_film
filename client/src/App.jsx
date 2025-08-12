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
import WatchlistPage from "./pages/WatchlistPage"; // <-- QUESTA È LA RIGA MANCANTE

// Import Componenti
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
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
      <Routes>
        {/* Rotte pubbliche per Login e Registrazione */}
        <Route
          path="/register"
          element={token ? <Navigate to="/" /> : <RegistrationPage />}
        />
        <Route
          path="/login"
          element={token ? <Navigate to="/" /> : <LoginPage />}
        />

        {/* Tutte le rotte qui dentro sono protette */}
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
          <Route path="list/:listId" element={<ListPage />} />
          <Route path="profile/:userId" element={<ProfilePage />} />
          <Route path="movie/:tmdbId" element={<MovieDetailPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
