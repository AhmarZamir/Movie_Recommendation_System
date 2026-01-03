import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import type { AdminUserOut } from "../../types/admin.types";

export default function ManageUsersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminUserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const selected = useMemo(
    () => rows.find((u) => u.id === selectedId) ?? null,
    [rows, selectedId]
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("USER");
  const [status, setStatus] = useState<"ACTIVE" | "BLOCKED">("ACTIVE");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get("/admin/users");
      setRows((res.data ?? []) as AdminUserOut[]);
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser() {
    if (!selected) return;
    setConfirmState({
      title: "Update user",
      message: "Save changes to this user's profile?",
      onConfirm: async () => {
        setErr(null);
        try {
          await http.put(`/admin/users/${selected.id}`, {
            name,
            email,
            role,
            is_blocked: status === "BLOCKED",
            is_active: status === "ACTIVE",
          });
          await load();
        } catch (e: any) {
          if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
          else setErr((e.response?.data as any)?.detail || "Failed to update user.");
        } finally {
          setConfirmState(null);
        }
      },
    });
  }

  async function blockUser(id: number) {
    setConfirmState({
      title: "Block user",
      message: "Block this user? They will not be able to review.",
      onConfirm: async () => {
        setErr(null);
        try {
          await http.post(`/admin/users/${id}/block`);
          await load();
        } catch (e: any) {
          if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
          else setErr((e.response?.data as any)?.detail || "Failed to block user.");
        } finally {
          setConfirmState(null);
        }
      },
    });
  }

  async function unblockUser(id: number) {
    setConfirmState({
      title: "Unblock user",
      message: "Unblock this user and restore access?",
      onConfirm: async () => {
        setErr(null);
        try {
          await http.post(`/admin/users/${id}/unblock`);
          await load();
        } catch (e: any) {
          if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
          else setErr((e.response?.data as any)?.detail || "Failed to unblock user.");
        } finally {
          setConfirmState(null);
        }
      },
    });
  }

  async function deleteUser(id: number) {
    setConfirmState({
      title: "Delete user",
      message: "Delete this user? This cannot be undone.",
      onConfirm: async () => {
        setErr(null);
        try {
          await http.delete(`/admin/users/${id}`);
          setSelectedId(null);
          await load();
        } catch (e: any) {
          if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
          else setErr((e.response?.data as any)?.detail || "Failed to delete user.");
        } finally {
          setConfirmState(null);
        }
      },
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name ?? "");
    setEmail(selected.email ?? "");
    setRole(selected.role ?? "USER");
    setStatus(selected.is_blocked ? "BLOCKED" : "ACTIVE");
  }, [selected]);

  function formatDate(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return rows.filter((user) => {
      if (statusFilter === "active" && user.is_blocked) return false;
      if (statusFilter === "blocked" && !user.is_blocked) return false;
      if (!trimmed) return true;
      const nameMatch = (user.name ?? "").toLowerCase().includes(trimmed);
      const emailMatch = (user.email ?? "").toLowerCase().includes(trimmed);
      return nameMatch || emailMatch;
    });
  }, [rows, query, statusFilter]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">
            &lt;- Back
          </button>
          <h1 className="mt-2 text-2xl font-extrabold">Manage Users</h1>
          <div className="mt-1 text-xs text-white/55">Block, unblock, update, or remove users.</div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white/85">Users</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email..."
                className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "blocked")}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="blocked">Blocked only</option>
              </select>
            </div>
            {loading ? (
              <div className="mt-4 text-sm text-white/60">Loading...</div>
            ) : filteredRows.length === 0 ? (
              <div className="mt-4 text-sm text-white/60">No users found.</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs text-white/70">
                  <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/45">
                    <tr>
                      <th className="px-2 py-2">ID</th>
                      <th className="px-2 py-2">Username</th>
                      <th className="px-2 py-2">Email</th>
                      <th className="px-2 py-2">Role</th>
                      <th className="px-2 py-2">Created</th>
                      <th className="px-2 py-2">Last Login</th>
                      <th className="px-2 py-2">Blocked</th>
                      <th className="px-2 py-2">Active</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((u) => {
                      const isSelected = selectedId === u.id;
                      return (
                        <tr
                          key={u.id}
                          className={`border-b border-white/5 ${isSelected ? "bg-white/5" : ""}`}
                        >
                          <td className="px-2 py-2">{u.id}</td>
                          <td className="px-2 py-2 font-semibold text-white/85">
                            {u.name ?? `User #${u.id}`}
                          </td>
                          <td className="px-2 py-2 text-white/60">{u.email}</td>
                          <td className="px-2 py-2">{u.role}</td>
                          <td className="px-2 py-2">{formatDate(u.created_at)}</td>
                          <td className="px-2 py-2">{formatDate(u.last_login)}</td>
                          <td className="px-2 py-2">{u.is_blocked ? "Yes" : "No"}</td>
                          <td className="px-2 py-2">{u.is_blocked ? "No" : "Yes"}</td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedId(u.id)}
                                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/10"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteUser(u.id)}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white/85">User Details</div>
            {selected ? (
              <div className="mt-4 space-y-3">
                <div className="text-xs text-white/60">
                  Created: {formatDate(selected.created_at)} | Last login: {formatDate(selected.last_login)}
                </div>

                <div>
                  <label className="text-xs text-white/60">Username</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60">Status</label>
                  {selected.is_blocked ? (
                    <button
                      type="button"
                      onClick={() => unblockUser(selected.id)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
                    >
                      Unblock User
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => blockUser(selected.id)}
                      className="mt-2 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                    >
                      Block User
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={updateUser}
                    className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(selected.id)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/60">Select a user to edit.</div>
            )}
          </div>
        </div>
      </section>

      <Footer />

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#140f14] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="text-lg font-semibold text-white/90">{confirmState.title}</div>
            <p className="mt-2 text-sm text-white/60">{confirmState.message}</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmState.onConfirm()}
                className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
