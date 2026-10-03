import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

const links = [
  { to: "/", label: "Dashboard", permission: "dashboard:read", end: true, icon: "grid" },
  { to: "/classes", label: "Classes", permission: "classes:read", icon: "layers" },
  { to: "/registration", label: "Registration", permission: "students:create", icon: "plus" },
  { to: "/students", label: "Students", permission: "students:read", icon: "users" },
  { to: "/exams", label: "Exams", permission: "exams:read", icon: "edit" },
  { to: "/attendances", label: "Attendances", permission: "attendances:read", icon: "check" },
  { to: "/books", label: "Books", permission: "books:read", icon: "book" },
  { to: "/users", label: "Users", permission: "users:read", icon: "shield" },
];

const pageTitles = {
  "/": "Dashboard",
  "/classes": "Classes",
  "/registration": "Registration",
  "/students": "Students",
  "/exams": "Exams",
  "/attendances": "Attendances",
  "/books": "Books",
  "/users": "Users",
};

function Icon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 12 10 5 10-5" />
          <path d="m2 17 10 5 10-5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const visible = links.filter((l) => hasPermission(l.permission));

  const crumb = useMemo(() => {
    const base = location.pathname.split("/").slice(0, 2).join("/") || "/";
    const key = base === "" ? "/" : base;
    if (pageTitles[key]) return pageTitles[key];
    if (location.pathname.startsWith("/students/")) return "Student detail";
    return "DEPT_C";
  }, [location.pathname]);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date()),
    []
  );

  function onSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (hasPermission("students:read")) {
      navigate(`/students?q=${encodeURIComponent(q)}`);
      setQuery("");
      return;
    }
    navigate("/classes");
  }

  return (
    <div className="h-dvh overflow-hidden flex bg-fog">
      {/* Mobile top */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-3 px-4 h-14 bg-[#06235C] text-white">
        <BrandLogo size="xs" tone="light" />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-30 bg-[#06235C]/40 backdrop-blur-[2px]"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`z-40 flex flex-col bg-[#06235C] text-white h-full shrink-0
          md:w-[260px] md:static md:translate-x-0
          fixed top-14 bottom-0 left-0 w-[82%] max-w-[280px] md:top-0 transition-transform duration-200
          ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="hidden md:block px-4 pt-5 pb-4 shrink-0">
          <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-3.5">
            <BrandLogo size="sm" tone="light" />
            <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 px-0.5">
              Enter to learn to lead
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 flex-1 min-h-0 overflow-y-auto pb-4 pt-2 md:pt-0">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
            Menu
          </p>
          {visible.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-[#06235C] shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span className="opacity-90">
                <Icon name={link.icon} />
              </span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 mt-auto rounded-xl bg-white/8 border border-white/10 p-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold">
              {(user?.name || "A").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-[11px] text-white/50 truncate">{user?.role?.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs font-semibold text-white/90 hover:bg-white/15"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full pt-14 md:pt-0">
        {/* Desktop top bar */}
        <header className="hidden md:flex shrink-0 h-[68px] items-center gap-4 px-6 lg:px-8 border-b border-[#E2E8F2] bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <BrandLogo size="xs" variant="mark" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#06235C]/35">
                Al-Bayaan · DEPT_C
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="font-display text-[15px] font-bold text-[#06235C] truncate">
                  {crumb}
                </h2>
                <span className="hidden lg:inline text-[#06235C]/25">/</span>
                <span className="hidden lg:inline text-xs text-[#06235C]/45">{today}</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={onSearch}
            className="flex-1 max-w-xl mx-auto relative"
            role="search"
          >
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#06235C]/35">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students…"
              className="w-full h-10 rounded-xl border border-[#E2E8F2] bg-[#F3F5FA]/80 pl-10 pr-4 text-sm text-[#06235C] placeholder:text-[#06235C]/35 outline-none transition focus:bg-white focus:border-[#06235C]/35 focus:shadow-[0_0_0_3px_rgba(6,35,92,0.08)]"
            />
          </form>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#F3F5FA] px-3 py-1.5 border border-[#E2E8F2]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-[#06235C]/70">System online</span>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#E2E8F2] bg-white pl-1.5 pr-3 py-1.5 shadow-[0_1px_2px_rgba(6,35,92,0.04)]">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#06235C] text-white text-xs font-bold">
                {(user?.name || "A").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 hidden xl:block">
                <p className="text-xs font-semibold text-[#06235C] truncate max-w-[120px] leading-tight">
                  {user?.name}
                </p>
                <p className="text-[10px] text-[#06235C]/45 uppercase tracking-wide">
                  {user?.role?.name}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl animate-fade-up pb-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
