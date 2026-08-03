import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import {
  Search, Sparkles, ClipboardList, MessageSquare,
  Database, BarChart3, ArrowRight,
} from "lucide-react";

// ─── Role tools ───────────────────────────────────────────────────────────────
// DOCTOR_ACTIONS is the single source of truth for what a clinician can do;
// NAV_DOCTOR in Navbar.tsx mirrors it. Both lists lost their per-tile accent
// colour: four hues for four routes encoded nothing, and two of them (amber,
// violet) competed with resin and clinic elsewhere in the product.
const PATIENT_ACTIONS = [
  { icon: Sparkles,      title: "My recommendations", desc: "Rule-based strain matches", path: "/recommendations" },
  { icon: ClipboardList, title: "Update profile",     desc: "Keep symptoms current",     path: "/patient-input"   },
  { icon: MessageSquare, title: "Log feedback",       desc: "Report efficacy",           path: "/feedback"        },
  { icon: Database,      title: "Strain catalogue",   desc: "Browse the formulary",      path: "/strains"         },
];

const DOCTOR_ACTIONS = [
  { icon: BarChart3,     title: "Clinical dashboard", desc: "Review queue & efficacy",   path: "/dashboard"     },
  { icon: ClipboardList, title: "Patient profiling",  desc: "Profile & constraints",     path: "/patient-input" },
  { icon: Database,      title: "Strain catalogue",   desc: "Browse the formulary",      path: "/strains"       },
  { icon: MessageSquare, title: "Feedback review",    desc: "Monitor reported efficacy", path: "/feedback"      },
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
    <div className="mx-auto max-w-5xl py-2 animate-in fade-in duration-500">

      {/* ── MASTHEAD ─────────────────────────────────────────────────────── */}
      <header className="mb-6 border-b-2 border-ink pb-5">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          {isDoctor ? "Clinical decision support · rule-based" : "Medical cannabis · treatment support"}
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          {currentUser?.full_name ? `Welcome back, ${currentUser.full_name}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-[13px] text-ink/50">
          {isDoctor
            ? "Review recommendations the engine generated, and set the constraints it scores against."
            : "Your recommendations are generated from your profile and reviewed by a clinician."}
        </p>
      </header>

      <div className="space-y-6">

        {/* ── FORMULARY SEARCH ───────────────────────────────────────────── */}
        {/* The one thing worth doing from the home page. It runs the same ?q=
            the catalogue reads — the old category tiles passed ?cat=, which
            StrainsCatalogPage never looked at. */}
        <section className="border border-rule bg-white p-4">
          <p className="mb-2 font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">
            Search the formulary
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search the formulary"
                placeholder="Strain, producer or indication…"
                className="h-10 w-full border border-rule bg-white pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink/25 focus:border-ink/40 focus:ring-1 focus:ring-ink/20"
              />
            </div>
            <button
              type="submit"
              className="h-10 shrink-0 bg-ink px-5 font-data text-[10px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85"
            >
              Search
            </button>
          </form>
        </section>

        {/* ── ROLE TOOLS ─────────────────────────────────────────────────── */}
        <section className="border border-rule bg-white">
          <header className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <h2 className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">
              {isDoctor ? "Clinical tools" : "Your tools"}
            </h2>
            <span className="font-data text-[10px] uppercase tracking-[0.1em] text-ink/40">
              {currentUser?.role ?? "patient"}
            </span>
          </header>
          <div className="grid grid-cols-1 divide-y divide-rule sm:grid-cols-2 sm:divide-y-0">
            {actions.map((a, i) => (
              <button
                key={a.title}
                onClick={() => navigate(a.path)}
                className={`group flex items-center gap-3 p-4 text-left transition-colors hover:bg-paper ${
                  i % 2 === 0 ? "sm:border-r sm:border-rule" : ""
                } ${i < 2 ? "sm:border-b sm:border-rule" : ""}`}
              >
                <a.icon className="h-4 w-4 shrink-0 text-ink/40" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[14px] font-semibold leading-tight text-ink">
                    {a.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink/45">{a.desc}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
