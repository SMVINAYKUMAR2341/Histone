import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash;
    const m = /session_id=([^&]+)/.exec(hash || "");
    if (!m) {
      nav("/", { replace: true });
      return;
    }
    const sessionId = decodeURIComponent(m[1]);
    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id: sessionId });
        setUser(r.data.user);
        // Clean hash and go to dashboard
        window.history.replaceState({}, "", "/dashboard");
        nav("/dashboard", { replace: true, state: { user: r.data.user } });
      } catch (e) {
        console.error(e);
        nav("/", { replace: true });
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 text-sm">Establishing secure session…</div>
    </div>
  );
}
