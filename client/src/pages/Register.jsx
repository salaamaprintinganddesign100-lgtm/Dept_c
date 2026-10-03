import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-[#F3F5FA] relative overflow-hidden">
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 object-contain opacity-[0.05]"
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md ui-panel p-7 sm:p-8 space-y-5 relative z-10"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <BrandLogo size="xl" variant="mark" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#06235C]/40">
              Al-Bayaan · DEPT_C
            </p>
            <h1 className="font-display text-2xl font-bold mt-1 text-[#06235C]">
              Create account
            </h1>
          </div>
        </div>

        {error && (
          <p className="text-sm text-clay bg-clay/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[#06235C]/55">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ui-input"
            required
          />
        </label>
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
            minLength={6}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>

        <p className="text-sm text-[#06235C]/55 text-center">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#06235C] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
