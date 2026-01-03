import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

const TOKEN_KEY = "access_token";

function hasValidToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  try {
    const part = token.split(".")[1];
    if (!part) return true;

    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);

    const exp = Number(payload.exp);
    if (!Number.isFinite(exp)) return true;

    return Date.now() < exp * 1000;
  } catch {
    return true;
  }
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [authed, setAuthed] = useState<boolean>(() => hasValidToken());

  useEffect(() => {
    const sync = () => setAuthed(hasValidToken());
    window.addEventListener("auth-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!authed) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
