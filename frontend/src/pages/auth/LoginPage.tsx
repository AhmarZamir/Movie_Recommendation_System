import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import AuthTopbar from "../../components/Navbar/AuthTopBar";

const poster1 = "/poster1.jpg";
const poster2 = "/poster2.jpg";
const poster3 = "/poster3.jpg";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(""); // backend expects email
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length >= 3 && password.length >= 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const res = await http.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const token = (res.data as any)?.access_token;
      if (!token) throw new Error("Login failed: missing token");
      localStorage.setItem("access_token", token);
      window.dispatchEvent(new Event("auth-changed"));
      navigate("/home", { replace: true });

    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as any)?.detail ||
          (err.response?.data as any)?.message ||
          "Login failed";
        setError(msg);
      } else {
        setError(err?.message ?? "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AuthTopbar />
      <div className="grid h-[calc(100vh-56px)] w-full grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/45 via-black/40 to-fuchsia-900/30" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_20%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(700px_420px_at_80%_25%,rgba(236,72,153,0.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/45 to-black/70" />

          <div className="relative flex h-full flex-col p-12">
            <div className="mt-auto max-w-lg pb-10">
              <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
                Experience Movies <br /> Like Never Before
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
                Our AI-powered engine analyzes thousands of films to find the perfect match for your mood. Join our
                community of cinephiles today.
              </p>
              <div className="mt-10 flex items-end gap-4">
                <div
                  className="h-28 w-24 rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.5)] bg-cover bg-center"
                  style={{ backgroundImage: `url(${poster1})` }}
                />
                <div
                  className="h-32 w-28 -translate-y-2 rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.5)] bg-cover bg-center"
                  style={{ backgroundImage: `url(${poster2})` }}
                />
                <div
                  className="h-28 w-24 rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.5)] bg-cover bg-center"
                  style={{ backgroundImage: `url(${poster3})` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Form panel */}
        <div className="flex h-full items-center justify-center px-6 lg:px-12">
              <div className="w-full max-w-lg">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur">
              <h2 className="text-2xl font-extrabold">Welcome Back</h2>
              <p className="mt-1 text-sm text-white/60">
                Log in to access your personalized recommendations.
              </p>

              {error && (
                <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {/* Email */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/70">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      type="email"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/50"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
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
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-white/70">
                      Password
                    </label>
                    {/* optional placeholder link */}
                    <button
                      type="button"
                      className="text-xs font-semibold text-purple-300/80 hover:text-purple-200"
                      onClick={() => setError("Password reset is not implemented yet.")}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      type={showPass ? "text" : "password"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/70"
                      aria-label="Toggle password visibility"
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
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>

                <div className="pt-4 text-center text-xs text-white/55">
                  Don&apos;t have an account?{" "}
                  <Link to="/auth/register" className="font-semibold text-purple-300 hover:text-purple-200">
                    Sign up for free
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
