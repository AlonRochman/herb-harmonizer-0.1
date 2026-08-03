import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import {
  Search, Sparkles, ClipboardList, MessageSquare,
  Database, BarChart3,
} from "lucide-react";

// ─── Action tiles (patient vs doctor) ────────────────────────────────────────
// DOCTOR_ACTIONS is the single source of truth for what a clinician can do;
// NAV_DOCTOR in Navbar.tsx mirrors it.
const PATIENT_ACTIONS = [
  { icon: Sparkles,     title: "My Recommendations", desc: "Rule-based matches",    path: "/recommendations", accent: "#16a34a" },
  { icon: ClipboardList,title: "Update Profile",     desc: "Keep symptoms current", path: "/patient-input",   accent: "#0284c7" },
  { icon: MessageSquare,title: "Log Feedback",       desc: "Report results",        path: "/feedback",        accent: "#d97706" },
  { icon: Database,     title: "Strains Catalog",    desc: "Explore varieties",     path: "/strains",         accent: "#7c3aed" },
];

const DOCTOR_ACTIONS = [
  { icon: BarChart3,    title: "Clinic Dashboard",  desc: "Review queue",         path: "/dashboard",      accent: "#4f46e5" },
  { icon: ClipboardList,title: "Patient Profiling", desc: "Clinical constraints", path: "/patient-input",  accent: "#0284c7" },
  { icon: Database,     title: "Strains Database",  desc: "Browse the formulary", path: "/strains",        accent: "#7c3aed" },
  { icon: MessageSquare,title: "Feedback Review",   desc: "Monitor efficacy",     path: "/feedback",       accent: "#d97706" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppState();
  const isDoctor = useIsDoctor();

  const [search, setSearch] = useState("");
  const actions = isDoctor ? DOCTOR_ACTIONS : PATIENT_ACTIONS;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/strains?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(160deg, #0a2d1e 0%, #0f3d28 40%, #0d3322 100%)" }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blob top-right */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #22c55e 0%, transparent 70%)" }}
        />

        <div className="relative z-10 px-6 py-12">
          {/* Greeting badge */}
          <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-emerald-300 text-[12px] font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Welcome back, {currentUser?.full_name ?? "Guest"}
          </div>

          <h1
            className="text-white font-extrabold leading-tight mb-3"
            style={{ fontSize: "clamp(1.9rem, 5vw, 2.9rem)", letterSpacing: "-0.02em" }}
          >
            Clinical Decision Support
          </h1>
          <p className="text-emerald-200/70 text-[15px] mb-8 max-w-md leading-relaxed">
            {isDoctor
              ? "Evidence-based cannabis matching for your patients."
              : "Recommendations built from your profile and reviewed by a clinician."}
          </p>

          {/* Search — runs the ?q= the catalogue actually reads */}
          <form onSubmit={handleSearch} className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search strains"
              placeholder="Search strains, producers, indications…"
              className="w-full rounded-xl pl-11 pr-24 py-3.5 text-[14px] bg-white/95 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400/60 shadow-lg"
              style={{ height: 52 }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ── QUICK ACTIONS (personalised by role) ─────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-slate-800">
            {isDoctor ? "Clinical tools" : "Your tools"}
          </h2>
          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
            {currentUser?.role ?? "patient"}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((a) => (
            <button
              key={a.title}
              onClick={() => navigate(a.path)}
              className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm p-4 text-left transition-all"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ background: a.accent + "18" }}
              >
                <a.icon style={{ color: a.accent, width: 18, height: 18 }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                {a.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
