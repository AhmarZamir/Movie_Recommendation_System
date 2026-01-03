import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold">Admin Dashboard</h1>
          <div className="mt-1 text-xs text-white/55">
            Manage movies, users, reviews, and analytics.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate("/admin/movies")}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10"
          >
            <div className="text-base font-bold text-white/90">Manage Movies</div>
            <div className="mt-2 text-sm text-white/65">Add, update, or delete movies.</div>
          </button>

          <button
            onClick={() => navigate("/admin/users")}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10"
          >
            <div className="text-base font-bold text-white/90">Manage Users</div>
            <div className="mt-2 text-sm text-white/65">Block, update roles, or remove users.</div>
          </button>

          <button
            onClick={() => navigate("/admin/reviews")}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10"
          >
            <div className="text-base font-bold text-white/90">Moderate Reviews</div>
            <div className="mt-2 text-sm text-white/65">Approve, flag, or remove reviews.</div>
          </button>

          <button
            onClick={() => navigate("/admin/analytics")}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10"
          >
            <div className="text-base font-bold text-white/90">Analytics</div>
            <div className="mt-2 text-sm text-white/65">Top movies and active users.</div>
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
