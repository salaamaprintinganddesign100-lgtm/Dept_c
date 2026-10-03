import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@deptc.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#F3F5FA]">
      <section className="relative hidden md:flex flex-col justify-between p-10 lg:p-14 bg-[#06235C] text-white overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(255,255,255,0.14), transparent), linear-gradient(160deg,#06235C,#0A3A8F 55%,#06235C)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Soft watermark logo */}
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-8 -bottom-10 h-[420px] w-[420px] object-contain opacity-[0.08] select-none"
        />

        <div className="relative z-10">
          <BrandLogo size="md" tone="light" />
        </div>

        <div className="relative z-10 flex flex-col items-start gap-8 pb-4">
          <BrandLogo size="hero" variant="mark" className="drop-shadow-2xl" />
          <div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
              Al-Bayaan
              <br />
              Computer Features
            </h1>
            <p className="mt-4 max-w-sm text-white/70 text-base leading-relaxed">
              Classes, registration, exams, books and attendance — one modern workspace.
            </p>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Enter to learn to lead
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 object-contain opacity-[0.04] md:hidden"
        />
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md ui-panel p-7 sm:p-8 space-y-5 relative z-10"
        >
          <div className="flex flex-col items-center text-center gap-3 md:items-start md:text-left">
            <div className="md:hidden">
              <BrandLogo size="xl" variant="mark" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-[#06235C]">
                Sign in
              </h2>
              <p className="text-sm text-[#06235C]/55 mt-1">
                DEPT_C · Al-Bayaan Institute
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-clay bg-clay/10 px-3 py-2 rounded-lg border border-clay/20">
              {error}
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-[#06235C]/55">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ui-input"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-[#06235C]/55">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui-input"
              required
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Continue"}
          </button>

          <p className="text-sm text-[#06235C]/55 text-center">
            No account?{" "}
            <Link to="/register" className="font-semibold text-[#06235C] hover:underline">
              Register
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
