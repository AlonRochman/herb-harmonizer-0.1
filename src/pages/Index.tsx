import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import {
  Search, Sparkles, ClipboardList, MessageSquare,
  Database, BarChart3, ArrowRight, TrendingUp,
  ShieldCheck, Leaf, Bell, Percent,
} from "lucide-react";

// ─── Quick filter chips (below search bar) ────────────────────────────────────
const QUICK_CHIPS = [
  { label: "Popular now",  icon: TrendingUp,  query: "popular"    },
  { label: "Price drops",  icon: Percent,     query: "price"      },
  { label: "New arrivals", icon: Bell,        query: "new"        },
];

// ─── Category cards (like CANNABIZ catalog entry) ────────────────────────────
const CATEGORIES = [
  { label: "Flower",  sub: "Dried cannabis",   icon: "🌿", color: "#1B4D35" },
  { label: "Oils",    sub: "Tinctures & drops", icon: "💧", color: "#14432E" },
  { label: "Joints",  sub: "Pre-rolled",        icon: "🍃", color: "#0F3826" },
  { label: "Mini",    sub: "Small format",      icon: "✦",  color: "#0A2D1E" },
];

// ─── Feature highlights ───────────────────────────────────────────────────────
const FEATURES = [
  { icon: Search,      title: "Full catalog search",   desc: "Find products & pharmacies in one place." },
  { icon: TrendingUp,  title: "Smart price comparison", desc: "Save on every purchase across the country." },
  { icon: ShieldCheck, title: "Trusted & certified",   desc: "Under Ministry of Health supervision." },
  { icon: Leaf,        title: "Complete strain database", desc: "Strains, doctors & expert opinions." },
];

// ─── Action tiles (patient vs doctor) ────────────────────────────────────────
const PATIENT_ACTIONS = [
  { icon: Sparkles,     title: "My Recommendations", desc: "AI-matched strains",     path: "/recommendations", accent: "#16a34a" },
  { icon: ClipboardList,title: "Update Profile",     desc: "Keep symptoms current",  path: "/patient-input",   accent: "#0284c7" },
  { icon: MessageSquare,title: "Log Feedback",       desc: "Report results",         path: "/feedback",        accent: "#d97706" },
  { icon: Database,     title: "Strains Catalog",    desc: "Explore varieties",      path: "/strains",         accent: "#7c3aed" },
];

const DOCTOR_ACTIONS = [
  { icon: BarChart3,    title: "Clinic Dashboard",  desc: "Global analytics",        path: "/dashboard",      accent: "#4f46e5" },
  { icon: ClipboardList,title: "Patient Profiling", desc: "Clinical constraints",    path: "/patient-input",  accent: "#0284c7" },
  { icon: Database,     title: "Strains Database",  desc: "Manage genetics",         path: "/strains",        accent: "#7c3aed" },
  { icon: MessageSquare,title: "Feedback Review",   desc: "Monitor efficacy",        path: "/feedback",       accent: "#d97706" },
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
    <div className="min-h-screen bg-slate-50 -mt-8 -mx-4 md:-mx-8">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0a2d1e 0%, #0f3d28 40%, #0d3322 100%)",
          minHeight: 420,
        }}
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

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-14 pb-16">

          {/* Greeting badge */}
          <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-emerald-300 text-[12px] font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Welcome back, {currentUser?.full_name ?? "Guest"}
          </div>

          {/* Main headline */}
          <h1
            className="text-white font-extrabold leading-tight mb-3"
            style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", letterSpacing: "-0.02em" }}
          >
            {isDoctor ? "Clinical Decision\nSupport System" : "Online ordering"}
          </h1>
          <p className="text-emerald-200/70 text-[15px] mb-8 max-w-md leading-relaxed">
            {isDoctor
              ? "Evidence-based cannabis matching for your patients."
              : "Find, compare and order medical cannabis — all in one place."}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative mb-5 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, strains, pharmacies…"
              className="w-full h-13 rounded-xl pl-11 pr-4 py-3.5 text-[14px] bg-white/95 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400/60 shadow-lg"
              style={{ height: 52 }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold transition-colors"
            >
              Search
            </button>
          </form>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => navigate(`/strains?q=${chip.query}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 hover:text-white text-[12px] font-medium transition-all"
              >
                <chip.icon className="h-3 w-3" />
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATALOG CATEGORIES (like CANNABIZ) ───────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 -mt-6 mb-10 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => navigate(`/strains?cat=${cat.label.toLowerCase()}`)}
              className="group bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md p-4 text-left transition-all"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 transition-transform group-hover:scale-110"
                style={{ background: cat.color + "18" }}
              >
                {cat.icon}
              </div>
              <p className="text-[14px] font-semibold text-slate-800 group-hover:text-emerald-700">{cat.label}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{cat.sub}</p>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all mt-2" />
            </button>
          ))}
        </div>
      </section>

      {/* ── QUICK ACTIONS (personalised by role) ─────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 mb-10">
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
                <a.icon className="h-4.5 w-4.5" style={{ color: a.accent, width: 18, height: 18 }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                {a.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHTS ───────────────────────────────────────────── */}
      <section
        className="py-12 px-6"
        style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-[22px] font-bold text-slate-900 mb-1">
              Everything you need — in one place
            </h2>
            <p className="text-[14px] text-slate-500">
              Advanced tools for patients and clinicians alike.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-emerald-700" />
                </div>
                <p className="text-[13px] font-semibold text-slate-800 mb-1">{f.title}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA STRIP ─────────────────────────────────────────────── */}
      <section
        className="py-10 px-6 text-center"
        style={{ background: "#0a2d1e" }}
      >
        <p className="text-white font-bold text-[20px] mb-1">
          {isDoctor ? "Ready to support your next patient?" : "Don't miss any important update"}
        </p>
        <p className="text-emerald-300/70 text-[13px] mb-5">
          {isDoctor
            ? "Use the clinical engine to generate personalized recommendations."
            : "Subscribe to updates and get news on new products and deals."}
        </p>
        <button
          onClick={() => navigate(isDoctor ? "/patient-input" : "/recommendations")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-[14px] transition-colors"
        >
          {isDoctor ? "New patient" : "Get started"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

    </div>
  );
};

export default Index;
