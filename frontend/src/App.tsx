import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ProfilePage from "./pages/auth/ProfilePage";
import PlaylistDetailPage from "./pages/playlists/PlaylistDetailPage";
import PublicPlaylistPage from "./pages/playlists/PublicPlaylistPage";
import PublicPlaylistsListPage from "./pages/playlists/PublicPlaylistsListPage";

import BrowsePage from "./pages/movies/BrowsePage";
import MediaDetailsPage from "./pages/media/MediaDetailsPage";

import PlaylistsPage from "./pages/playlists/PlaylistsPage";

import RecommendationsPage from "./pages/recommendations/RecommendationsPage";
import HomePage from "./pages/HomePage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import ManageMoviesPage from "./pages/admin/ManageMoviesPage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import ModerateReviewsPage from "./pages/admin/ModerateReviewsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Guest routes */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/movie/:mediaId" element={<MediaDetailsPage mediaType="movie" />} />
        <Route path="/tv/:mediaId" element={<MediaDetailsPage mediaType="tv" />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/public-playlists" element={<PublicPlaylistsListPage />} />
        <Route path="/public-playlists/:playlistId" element={<PublicPlaylistPage />} />

        {/* Registered routes */}
        <Route
          path="/playlists"
          element={
            <ProtectedRoute>
              <PlaylistsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/playlists/:playlistId"
          element={
            <ProtectedRoute>
              <PlaylistDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recommendations"
          element={
            <ProtectedRoute>
              <RecommendationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminRoute>
              <AnalyticsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <ManageUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/movies"
          element={
            <AdminRoute>
              <ManageMoviesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminRoute>
              <ModerateReviewsPage />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
