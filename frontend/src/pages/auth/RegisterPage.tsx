import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http"; 
import AuthTopbar from "../../components/Navbar/AuthTopBar";

const cinemaBg = "/cinema.png";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    username.trim().length >= 2 &&
    email.trim().length >= 3 &&
    password.length >= 8 &&
    confirm.length >= 8 &&
    password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Password and confirm password do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
    await http.post("/auth/register", {
        email: email.trim().toLowerCase(),
        password,
        name: username.trim(),
    });

    navigate("/auth/login?registered=1");
    } catch (err: any) {
    if (axios.isAxiosError(err)) {
        const msg =
        (err.response?.data as any)?.detail ||
        (err.response?.data as any)?.message ||
        "Registration failed";
        setError(msg);
    } else {
        setError(err?.message ?? "Registration failed");
    }
    } finally {
    setLoading(false);
    }
  }

  return (
    <div className="h-screen overflow-hidden">
    <AuthTopbar />
    <div className="grid h-[calc(100vh-56px)] w-full grid-cols-1 lg:grid-cols-2">
        {/* LEFT: Image panel */}
        <div className="relative hidden overflow-hidden lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: cinemaBg ? `url(${cinemaBg})` : undefined,
            }}
          />
          {/* fallback gradient if no image */}
          {!cinemaBg && (
            <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-900/30 to-black" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/55 to-black/80" />

          <div className="relative flex h-full flex-col p-10">
            <div className="mt-auto max-w-md pb-10">
              <h1 className="text-4xl font-extrabold leading-tight">
                Unlock Your Next <br /> Favorite Movie
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Create an account to personalize your recommendations, track your watch history,
                and discover the magic of cinema tailored just for you.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Form panel */}
        <div className="flex h-full items-center justify-center px-6 lg:px-12">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-8 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur">
              <h2 className="text-xl font-extrabold">Create Your Account</h2>
              <p className="mt-1 text-sm text-white/60">
                Join us to start your cinematic journey.
              </p>

              {error && (
                <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {/* Username */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/70">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a unique username"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/50"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                      {/* user icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 21a8 8 0 0 0-16 0"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 13a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/70">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/50"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                      {/* mail icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4 6h16v12H4V6Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <path
                          d="m4 7 8 6 8-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/70">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      type={showPass ? "text" : "password"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/70"
                      aria-label="Toggle password visibility"
                    >
                      {/* eye icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 15a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-white/40">Min 8 characters</div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/70">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      type={showConfirm ? "text" : "password"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/70"
                      aria-label="Toggle confirm password visibility"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 15a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                  {confirm.length > 0 && password !== confirm && (
                    <div className="mt-1 text-[11px] text-red-200/80">
                      Passwords do not match
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Registering..." : "Register"}
                </button>

                <div className="pt-3 text-center text-xs text-white/45">or</div>

                <div className="text-center text-xs text-white/55">
                  Already have an account?{" "}
                  <Link to="/auth/login" className="font-semibold text-purple-300 hover:text-purple-200">
                    Login
                  </Link>
                </div>
              </form>
            </div>

            <div className="mt-6 text-center text-[11px] text-white/35">
              © 2025 CinematicAI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
