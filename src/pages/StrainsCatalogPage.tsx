import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { readOr } from "@/lib/supabaseRead";
import LoadError from "@/components/LoadError";
import { Input } from "@/components/ui/input";
import {
  Search, SlidersHorizontal, ChevronDown, X, Leaf, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Strain {
  id: string;
  name: string;
  thc_level: number;
  cbd_level: number;
  terpenes_profile: string | null;
  terpenes: string | null;
  producer: string | null;
  category: string | null;
  medical_uses: unknown;
  image_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseMedicalUses = (val: unknown): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return p.map(String);
    } catch {}
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const parseTerpenes = (strain: Strain): string[] => {
  try {
    if (strain.terpenes) {
      const p = typeof strain.terpenes === "string" ? JSON.parse(strain.terpenes) : strain.terpenes;
      if (Array.isArray(p)) return p;
    }
  } catch {}
  if (strain.terpenes_profile) {
    return strain.terpenes_profile.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

// Chemotype, the same reading the recommendations page puts on its axis. It is
// derived from the two cannabinoid values rather than invented, which is what
// earns it a place on the card.
const chemotypeLabel = (thc: number, cbd: number) => {
  const total = (thc ?? 0) + (cbd ?? 0);
  const pos = total <= 0 ? 0.5 : (thc ?? 0) / total;
  return pos >= 0.7 ? "Type I" : pos >= 0.3 ? "Type II" : "Type III";
};

// ─── Category ─────────────────────────────────────────────────────────────────
// Indica/sativa/hybrid used to carry purple/amber/teal. Amber and teal sit close
// enough to resin and clinic to read as THC and CBD, and category is a botanical
// label, not a measurement — so it gets typography and no colour of its own.
const CATEGORY_LABEL: Record<string, string> = {
  indica: "Indica",
  sativa: "Sativa",
  hybrid: "Hybrid",
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const CATEGORY_TABS = ["All", "Indica", "Sativa", "Hybrid"];

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="animate-pulse border border-rule bg-white">
    <div className="p-4 space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-2/5 bg-rule" />
        <div className="h-4 w-14 bg-rule/60" />
      </div>
      <div className="h-3 w-1/3 bg-rule/60" />
      <div className="space-y-2 pt-1">
        <div className="h-[3px] w-full bg-rule/60" />
        <div className="h-[3px] w-full bg-rule/60" />
      </div>
      <div className="flex gap-1">
        <div className="h-4 w-16 bg-rule/60" />
        <div className="h-4 w-12 bg-rule/60" />
      </div>
      <div className="h-9 w-full bg-rule/60" />
    </div>
  </div>
);

// ─── Cannabinoid readout ──────────────────────────────────────────────────────
// One row per cannabinoid, mono so the digits align down the grid, with the bar
// in the cannabinoid's own colour: resin is THC, clinic is CBD, always.
const LevelBar = ({
  label, value, max, barClass, textClass,
}: {
  label: string; value: number; max: number;
  barClass: string; textClass: string;
}) => (
  <div className="flex items-center gap-2.5 font-data text-[11px]">
    <span className={`w-[70px] shrink-0 ${textClass}`}>
      {label} <span className="font-semibold">{(value ?? 0).toFixed(1)}%</span>
    </span>
    <span className="relative h-[3px] flex-1 bg-rule">
      <span
        className={`absolute inset-y-0 left-0 ${barClass}`}
        style={{ width: `${Math.min(((value ?? 0) / max) * 100, 100)}%` }}
      />
    </span>
  </div>
);

// ─── Chip ─────────────────────────────────────────────────────────────────────
// Indications and terpenes were seven decorative hues between them. Neither is a
// cannabinoid or a risk, so both are set in ink and separated by rule.
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="border border-rule px-2 py-0.5 text-[10px] text-ink/65">
    {children}
  </span>
);

// ─── Strain card ──────────────────────────────────────────────────────────────
// The five-star rating that sat here was Math.random() — a fabricated number and
// a fabricated review count, rerolled on every filter change. On a page that now
// sets real measurements in mono, it would have read as a clinical figure. Same
// reasoning that removed the % match ring from the recommendations page: if it
// is not a measurement, it does not get to look like one.
const StrainCard = ({ strain, onGetRec }: { strain: Strain; onGetRec: () => void }) => {
  const cat      = strain.category?.toLowerCase() ?? "";
  const catLabel = CATEGORY_LABEL[cat];
  const terpenes = parseTerpenes(strain);
  const medUses  = parseMedicalUses(strain.medical_uses);

  return (
    <div className="group flex flex-col border border-rule bg-white transition-colors hover:border-ink/35">
      <div className="flex flex-1 flex-col gap-3 p-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 border-b border-rule pb-2.5">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[15px] font-semibold leading-tight text-ink">
              {strain.name}
            </h3>
            {strain.producer && (
              <span className="mt-0.5 block truncate text-[11px] text-ink/40">
                {strain.producer}
              </span>
            )}
          </div>
          <div className="shrink-0 text-right font-data text-[10px] uppercase tracking-[0.1em]">
            {catLabel && <span className="block text-ink/55">{catLabel}</span>}
            <span className="mt-0.5 block text-ink/35">
              {chemotypeLabel(strain.thc_level, strain.cbd_level)}
            </span>
          </div>
        </div>

        {/* Cannabinoid readout */}
        <div className="space-y-1.5">
          <LevelBar
            label="THC" value={strain.thc_level} max={30}
            barClass="bg-resin" textClass="text-resin"
          />
          <LevelBar
            label="CBD" value={strain.cbd_level} max={20}
            barClass="bg-clinic" textClass="text-clinic"
          />
        </div>

        {/* Indications */}
        {medUses.length > 0 && (
          <div>
            <p className="mb-1.5 font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">
              Indications
            </p>
            <div className="flex flex-wrap gap-1">
              {medUses.slice(0, 4).map((use) => <Chip key={use}>{use}</Chip>)}
              {medUses.length > 4 && (
                <span className="px-1 py-0.5 font-data text-[10px] text-ink/35">
                  +{medUses.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Terpenes */}
        {terpenes.length > 0 && (
          <div>
            <p className="mb-1.5 font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">
              Terpenes
            </p>
            <div className="flex flex-wrap gap-1">
              {terpenes.slice(0, 3).map((t) => <Chip key={t}>{t}</Chip>)}
              {terpenes.length > 3 && (
                <span className="px-1 py-0.5 font-data text-[10px] text-ink/35">
                  +{terpenes.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA — pushed to bottom */}
        <div className="mt-auto pt-1">
          <button
            onClick={onGetRec}
            className="flex h-9 w-full items-center justify-center gap-1.5 border border-ink/25 font-data text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Get recommendation
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sort options ─────────────────────────────────────────────────────────────
type SortKey = "name" | "thc_high" | "thc_low" | "cbd_high" | "cbd_low";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name",     label: "Name (A–Z)"    },
  { value: "thc_high", label: "THC: High → Low" },
  { value: "thc_low",  label: "THC: Low → High" },
  { value: "cbd_high", label: "CBD: High → Low" },
  { value: "cbd_low",  label: "CBD: Low → High" },
];

// ─── Main page ────────────────────────────────────────────────────────────────
const StrainsCatalogPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [strains, setStrains]       = useState<Strain[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [activeTab, setActiveTab]   = useState("All");
  const [sortKey, setSortKey]       = useState<SortKey>("name");
  const [showSort, setShowSort]     = useState(false);
  const [thcRange, setThcRange]     = useState<[number, number]>([0, 30]);
  const [cbdRange, setCbdRange]     = useState<[number, number]>([0, 20]);
  const [showFilters, setShowFilters] = useState(false);
  const [failed, setFailed]           = useState(false);
  const [reloadKey, setReloadKey]     = useState(0);

  useEffect(() => {
    readOr<any[]>("strain catalogue", [],
      supabase.from("strains").select("*").order("name", { ascending: true }),
    ).then(({ data, failed: didFail }) => {
      setStrains(data);
      setFailed(didFail);
      setLoading(false);
    });
  }, [reloadKey]);

  // ── Filtered + sorted ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...strains];

    // Category tab
    if (activeTab !== "All") {
      list = list.filter((s) => s.category?.toLowerCase() === activeTab.toLowerCase());
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q) ||
          s.producer?.toLowerCase().includes(q) ||
          parseMedicalUses(s.medical_uses).some((u) => u.toLowerCase().includes(q))
      );
    }

    // THC / CBD range
    list = list.filter(
      (s) =>
        (s.thc_level ?? 0) >= thcRange[0] &&
        (s.thc_level ?? 0) <= thcRange[1] &&
        (s.cbd_level ?? 0) >= cbdRange[0] &&
        (s.cbd_level ?? 0) <= cbdRange[1]
    );

    // Sort
    list.sort((a, b) => {
      if (sortKey === "name")     return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortKey === "thc_high") return (b.thc_level ?? 0) - (a.thc_level ?? 0);
      if (sortKey === "thc_low")  return (a.thc_level ?? 0) - (b.thc_level ?? 0);
      if (sortKey === "cbd_high") return (b.cbd_level ?? 0) - (a.cbd_level ?? 0);
      if (sortKey === "cbd_low")  return (a.cbd_level ?? 0) - (b.cbd_level ?? 0);
      return 0;
    });

    return list;
  }, [strains, activeTab, searchTerm, sortKey, thcRange, cbdRange]);

  // Category counts
  const counts = useMemo(() => {
    const base = strains.filter((s) => {
      const q = searchTerm.toLowerCase();
      return !searchTerm || s.name?.toLowerCase().includes(q) || s.producer?.toLowerCase().includes(q);
    });
    return {
      All:    base.length,
      Indica: base.filter((s) => s.category?.toLowerCase() === "indica").length,
      Sativa: base.filter((s) => s.category?.toLowerCase() === "sativa").length,
      Hybrid: base.filter((s) => s.category?.toLowerCase() === "hybrid").length,
    };
  }, [strains, searchTerm]);

  const hasActiveFilters =
    thcRange[0] > 0 || thcRange[1] < 30 || cbdRange[0] > 0 || cbdRange[1] < 20;

  const resetFilters = () => {
    setThcRange([0, 30]);
    setCbdRange([0, 20]);
  };

  return (
    <div className="mx-auto max-w-5xl py-2 animate-in fade-in duration-500">

      {/* ── MASTHEAD ─────────────────────────────────────────────────────── */}
      <header className="mb-6 border-b-2 border-ink pb-5">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          Formulary
        </p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          <Leaf className="h-5 w-5 shrink-0 text-ink/40" />
          Strain catalogue
        </h1>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 font-data text-[11px]">
            <div className="flex gap-2">
              <dt className="text-ink/40">Varieties</dt>
              <dd className="text-ink/75">{strains.length}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink/40">Shown</dt>
              <dd className="text-ink/75">{filtered.length}</dd>
            </div>
          </dl>

          {/* Search + sort + filters */}
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
              <Input
                placeholder="Name, producer, indication…"
                className="h-9 rounded-none border-rule bg-white pl-9 text-[13px] text-ink placeholder:text-ink/25 focus-visible:ring-ink/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/35 transition-colors hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSort((v) => !v)}
                className="flex h-9 items-center gap-1.5 whitespace-nowrap border border-rule bg-white px-3 font-data text-[10px] uppercase tracking-[0.1em] text-ink/65 transition-colors hover:border-ink/35 hover:text-ink"
              >
                <ChevronDown className="h-3 w-3" />
                {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
              </button>
              {showSort && (
                <div className="absolute right-0 top-10 z-20 min-w-44 border border-rule bg-white py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortKey(opt.value); setShowSort(false); }}
                      className={`w-full px-3 py-2 text-left font-data text-[11px] transition-colors hover:bg-paper ${
                        sortKey === opt.value ? "text-ink" : "text-ink/55"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex h-9 items-center gap-1.5 whitespace-nowrap border px-3 font-data text-[10px] uppercase tracking-[0.1em] transition-colors ${
                showFilters || hasActiveFilters
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-white text-ink/65 hover:border-ink/35 hover:text-ink"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filters
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-5">

      {/* ── FILTER PANEL ─────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="border border-rule bg-white p-4 animate-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

            {/* THC range — resin, because it is THC */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">
                  THC level
                </label>
                <span className="font-data text-[11px] text-resin">
                  {thcRange[0]}% – {thcRange[1]}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={30} step={1}
                  aria-label="Minimum THC"
                  value={thcRange[0]}
                  onChange={(e) => setThcRange([+e.target.value, thcRange[1]])}
                  className="flex-1 accent-resin"
                />
                <input
                  type="range" min={0} max={30} step={1}
                  aria-label="Maximum THC"
                  value={thcRange[1]}
                  onChange={(e) => setThcRange([thcRange[0], +e.target.value])}
                  className="flex-1 accent-resin"
                />
              </div>
            </div>

            {/* CBD range — clinic, because it is CBD */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">
                  CBD level
                </label>
                <span className="font-data text-[11px] text-clinic">
                  {cbdRange[0]}% – {cbdRange[1]}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={20} step={1}
                  aria-label="Minimum CBD"
                  value={cbdRange[0]}
                  onChange={(e) => setCbdRange([+e.target.value, cbdRange[1]])}
                  className="flex-1 accent-clinic"
                />
                <input
                  type="range" min={0} max={20} step={1}
                  aria-label="Maximum CBD"
                  value={cbdRange[1]}
                  onChange={(e) => setCbdRange([cbdRange[0], +e.target.value])}
                  className="flex-1 accent-clinic"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 font-data text-[10px] uppercase tracking-[0.12em] text-ink/50 underline underline-offset-4 transition-colors hover:text-ink"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* ── CATEGORY TABS ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map((tab) => {
          const count = counts[tab as keyof typeof counts] ?? 0;
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-2 border px-3 py-1.5 font-data text-[10px] uppercase tracking-[0.1em] transition-colors ${
                isActive
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-white text-ink/55 hover:border-ink/35 hover:text-ink"
              }`}
            >
              {tab}
              <span className={isActive ? "text-paper/60" : "text-ink/35"}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── GRID ─────────────────────────────────────────────────────────── */}
      {failed && (
        <LoadError what="the strain catalogue"
          onRetry={() => { setLoading(true); setReloadKey((k) => k + 1); }} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-rule bg-white py-20 text-center">
          <Search className="mb-3 h-5 w-5 text-ink/25" />
          <p className="mb-1 text-[14px] font-medium text-ink/80">No strains match</p>
          <p className="text-[13px] text-ink/45">
            {searchTerm ? `Nothing matched "${searchTerm}"` : "Try widening the filters"}
          </p>
          {(searchTerm || hasActiveFilters) && (
            <button
              onClick={() => { setSearchTerm(""); resetFilters(); setActiveTab("All"); }}
              className="mt-4 border border-ink/25 px-3 py-1.5 font-data text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((strain) => (
            <StrainCard
              key={strain.id}
              strain={strain}
              onGetRec={() => navigate("/recommendations")}
            />
          ))}
        </div>
      )}

      {/* Results count footer */}
      {!loading && filtered.length > 0 && (
        <p className="pb-4 text-center font-data text-[10px] uppercase tracking-[0.12em] text-ink/35">
          {filtered.length} of {strains.length} strains
        </p>
      )}
      </div>
    </div>
  );
};

export default StrainsCatalogPage;
