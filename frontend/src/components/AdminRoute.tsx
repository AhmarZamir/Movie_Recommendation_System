function isAdminToken(): boolean {
  const token = localStorage.getItem("access_token");
  if (!token) return false;
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return (payload.role || "").toUpperCase() === "ADMIN";
  } catch {
    return false;
  }
}

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAdminToken()) {
    return <div>Access denied. Admins only.</div>;
  }
  return <>{children}</>;
}
