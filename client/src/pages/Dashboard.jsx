import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/PageHeader";
import BrandLogo from "../components/BrandLogo";

const QUICK = [
  {
    label: "Register student",
    to: "/registration",
    hint: "Create a new student record",
    tone: "primary",
  },
  {
    label: "Mark attendance",
    to: "/attendances",
    hint: "Open today’s class roster",
  },
  {
    label: "Enter exam marks",
    to: "/exams",
    hint: "Paper 40 + Practical 60",
  },
  {
    label: "Manage classes",
    to: "/classes",
    hint: "Create, edit or advance level",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getStats()
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message));
  }, []);

  const metrics = [
    { label: "Classes", value: stats?.classes, to: "/classes" },
    { label: "Students", value: stats?.students, to: "/students" },
    { label: "Exams done", value: stats?.examsComplete, to: "/exams" },
    { label: "Exams pending", value: stats?.examsPending, to: "/exams" },
    { label: "Attendance today", value: stats?.attendancesToday, to: "/attendances" },
  ];

  const firstName = user?.name?.split(" ")[0] || "Admin";

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero — brand plane with official logo */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#06235C] text-white min-h-[220px] md:min-h-[260px] flex flex-col justify-end px-6 py-8 md:px-10 md:py-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 100% 0%, rgba(255,255,255,0.14), transparent 50%), linear-gradient(145deg, #06235C 0%, #0A3A8F 55%, #06235C 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-[-20px] top-1/2 -translate-y-1/2 h-[280px] w-[280px] md:h-[340px] md:w-[340px] object-contain opacity-[0.14] select-none"
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="mb-4 md:hidden">
              <BrandLogo size="lg" variant="mark" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 mb-2">
              Al-Bayaan Institute
            </p>
            <p className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              DEPT_C
            </p>
            <p className="mt-3 max-w-lg text-white/75 text-sm md:text-base leading-relaxed">
              Good day, <span className="text-white font-semibold">{firstName}</span>.
              Manage classes, students, exams and attendance from one place.
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Enter to learn to lead
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/registration"
                className="ui-btn bg-white text-[#06235C] hover:bg-[#D6E0F5]"
              >
                Register student
              </Link>
              <Link
                to="/attendances"
                className="ui-btn bg-white/10 text-white border border-white/20 hover:bg-white/15"
              >
                Attendance
              </Link>
            </div>
          </div>
          <div className="hidden md:block shrink-0">
            <BrandLogo size="xl" variant="mark" className="drop-shadow-xl" />
          </div>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      {/* Metrics */}
      <section className="animate-fade-up-delay">
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-[#06235C]">
            Overview
          </h2>
          <span className="text-[11px] font-medium text-[#06235C]/45">
            Live data
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {metrics.map((m, i) => (
            <Link
              key={m.label}
              to={m.to}
              className={`ui-panel p-4 md:p-5 hover:border-[#06235C]/25 transition group ${
                i === 0 ? "col-span-2 lg:col-span-1" : ""
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#06235C]/45">
                {m.label}
              </p>
              <p className="mt-3 font-display text-3xl md:text-4xl font-bold tabular-nums text-[#06235C] group-hover:text-[#0A3A8F] transition">
                {m.value ?? "—"}
              </p>
              <p className="mt-2 text-[11px] text-[#06235C]/40 group-hover:text-[#06235C]/60">
                Open →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-lg font-semibold text-[#06235C] mb-3">
          Quick actions
        </h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {QUICK.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-2xl p-5 transition border ${
                item.tone === "primary"
                  ? "bg-[#06235C] text-white border-[#06235C] hover:bg-[#0A3A8F]"
                  : "ui-panel hover:border-[#06235C]/30"
              }`}
            >
              <p
                className={`font-semibold text-sm ${
                  item.tone === "primary" ? "text-white" : "text-[#06235C]"
                }`}
              >
                {item.label}
              </p>
              <p
                className={`text-xs mt-1.5 ${
                  item.tone === "primary" ? "text-white/65" : "text-[#06235C]/50"
                }`}
              >
                {item.hint}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
