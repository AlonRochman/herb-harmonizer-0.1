import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Loader2, Sparkles, SlidersHorizontal,
  Star, ChevronDown, X, Leaf,
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

// ─── Style maps ───────────────────────────────────────────────────────────────
const CATEGORY_STYLE: Record<string, { pill: string; bar: string; dot: string; label: string }> = {
  indica:  { pill: "bg-purple-50 text-purple-700 border-purple-200",  bar: "bg-purple-500",  dot: "bg-purple-400",  label: "Indica"  },
  sativa:  { pill: "bg-amber-50  text-amber-700  border-amber-200",   bar: "bg-amber-500",   dot: "bg-amber-400",   label: "Sativa"  },
  hybrid:  { pill: "bg-teal-50   text-teal-700   border-teal-200",    bar: "bg-teal-500",    dot: "bg-teal-400",    label: "Hybrid"  },
};

const TERPENE_COLOR: Record<string, string> = {
  myrcene:       "bg-green-50  text-green-700  border-green-200",
  linalool:      "bg-purple-50 text-purple-700 border-purple-200",
  limonene:      "bg-yellow-50 text-yellow-700 border-yellow-200",
  caryophyllene: "bg-orange-50 text-orange-700 border-orange-200",
  pinene:        "bg-teal-50   text-teal-700   border-teal-200",
  terpinolene:   "bg-blue-50   text-blue-700   border-blue-200",
  humulene:      "bg-rose-50   text-rose-700   border-rose-200",
};
const terpeneClass = (t: string) =>
  TERPENE_COLOR[t.toLowerCase()] ?? "bg-slate-50 text-slate-600 border-slate-200";

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const CATEGORY_TABS = ["All", "Indica", "Sativa", "Hybrid"];

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
    <div className="h-2 bg-slate-200 w-full" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between">
        <div className="h-4 bg-slate-200 rounded w-2/5" />
        <div className="h-5 bg-slate-100 rounded-full w-16" />
      </div>
      <div className="h-3 bg-slate-100 rounded w-1/3" />
      <div className="flex gap-2">
        <div className="h-5 bg-slate-100 rounded-full w-16" />
        <div className="h-5 bg-slate-100 rounded-full w-16" />
      </div>
      <div className="flex gap-1 flex-wrap">
        <div className="h-4 bg-slate-100 rounded-full w-12" />
        <div className="h-4 bg-slate-100 rounded-full w-16" />
        <div className="h-4 bg-slate-100 rounded-full w-10" />
      </div>
      <div className="h-8 bg-slate-100 rounded-lg w-full" />
    </div>
  </div>
);

// ─── THC / CBD bar ────────────────────────────────────────────────────────────
const LevelBar = ({
  label, value, max = 30, colorClass, textClass,
}: {
  label: string; value: number; max?: number;
  colorClass: string; textClass: string;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`text-[11px] font-bold ${textClass}`}>{value}%</span>
    </div>
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  </div>
);

// ─── Strain card ──────────────────────────────────────────────────────────────
const StrainCard = ({ strain, onGetRec }: { strain: Strain; onGetRec: () => void }) => {
  const cat       = strain.category?.toLowerCase() ?? "";
  const catStyle  = CATEGORY_STYLE[cat];
  const terpenes  = parseTerpenes(strain);
  const medUses   = parseMedicalUses(strain.medical_uses);

  // Simulated rating (would come from feedback aggregate in real app)
  const fakeRating = useMemo(() => (3.5 + Math.random() * 1.4).toFixed(1), [strain.id]);
  const fakeCount  = useMemo(() => Math.floor(10 + Math.random() * 60), [strain.id]);

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all duration-200 flex flex-col">

      {/* Category colour bar */}
      <div className={`h-1.5 w-full ${catStyle?.bar ?? "bg-slate-200"}`} />

      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight truncate">
              {strain.name}
            </h3>
            {/* Producer badge */}
            {strain.producer && (
              <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                {strain.producer}
              </span>
            )}
          </div>
          {catStyle && (
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${catStyle.pill}`}>
              {catStyle.label}
            </span>
          )}
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1,2,3,4,5].map((i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${parseFloat(fakeRating) >= i ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-slate-600">{fakeRating}</span>
          <span className="text-[11px] text-slate-400">({fakeCount})</span>
        </div>

        {/* THC / CBD bars */}
        <div className="space-y-2 bg-slate-50 rounded-xl px-3 py-2.5">
          <LevelBar
            label="THC" value={strain.thc_level ?? 0}
            colorClass="bg-amber-400" textClass="text-amber-700"
          />
          <LevelBar
            label="CBD" value={strain.cbd_level ?? 0}
            colorClass="bg-teal-400" textClass="text-teal-700"
          />
        </div>

        {/* Medical uses tags */}
        {medUses.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Medical uses
            </p>
            <div className="flex flex-wrap gap-1">
              {medUses.slice(0, 4).map((use) => (
                <span
                  key={use}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {use}
                </span>
              ))}
              {medUses.length > 4 && (
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5">
                  +{medUses.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Terpene tags */}
        {terpenes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Terpenes
            </p>
            <div className="flex flex-wrap gap-1">
              {terpenes.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${terpeneClass(t)}`}
                >
                  {t}
                </span>
              ))}
              {terpenes.length > 3 && (
                <span className="text-[10px] text-slate-400 px-1">+{terpenes.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* CTA — pushed to bottom */}
        <div className="mt-auto pt-1">
          <Button
            size="sm"
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-9 rounded-xl font-semibold transition-all group-hover:bg-emerald-600"
            onClick={onGetRec}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Get recommendation
          </Button>
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

  useEffect(() => {
    supabase
      .from("strains")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setStrains(data ?? []);
        setLoading(false);
      });
  }, []);

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
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600" />
            Strains catalog
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {strains.length} varieties · {filtered.length} shown
          </p>
        </div>

        {/* Search + sort row */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Name, producer, condition…"
              className="pl-9 text-[13px] bg-white h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort((v) => !v)}
              className="flex items-center gap-1.5 h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-md hover:border-slate-300 text-slate-600 whitespace-nowrap"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
            </button>
            {showSort && (
              <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-44">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortKey(opt.value); setShowSort(false); }}
                    className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors ${sortKey === opt.value ? "text-emerald-700 font-medium" : "text-slate-700"}`}
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
            className={`flex items-center gap-1.5 h-9 px-3 text-[13px] border rounded-md transition-colors whitespace-nowrap ${
              showFilters || hasActiveFilters
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                ✓
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── FILTER PANEL ─────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* THC range */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
                  THC level
                </label>
                <span className="text-[12px] text-amber-700 font-medium">
                  {thcRange[0]}% – {thcRange[1]}%
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="range" min={0} max={30} step={1}
                  value={thcRange[0]}
                  onChange={(e) => setThcRange([+e.target.value, thcRange[1]])}
                  className="flex-1 accent-amber-500"
                />
                <input
                  type="range" min={0} max={30} step={1}
                  value={thcRange[1]}
                  onChange={(e) => setThcRange([thcRange[0], +e.target.value])}
                  className="flex-1 accent-amber-500"
                />
              </div>
            </div>

            {/* CBD range */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
                  CBD level
                </label>
                <span className="text-[12px] text-teal-700 font-medium">
                  {cbdRange[0]}% – {cbdRange[1]}%
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="range" min={0} max={20} step={1}
                  value={cbdRange[0]}
                  onChange={(e) => setCbdRange([+e.target.value, cbdRange[1]])}
                  className="flex-1 accent-teal-500"
                />
                <input
                  type="range" min={0} max={20} step={1}
                  value={cbdRange[1]}
                  onChange={(e) => setCbdRange([cbdRange[0], +e.target.value])}
                  className="flex-1 accent-teal-500"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[12px] text-slate-500 hover:text-slate-700 underline underline-offset-2"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* ── CATEGORY TABS ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_TABS.map((tab) => {
          const count = counts[tab as keyof typeof counts] ?? 0;
          const isActive = tab === activeTab;
          const style = CATEGORY_STYLE[tab.toLowerCase()];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                isActive
                  ? style
                    ? `${style.pill} border-current`
                    : "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {style && isActive && (
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              )}
              {tab}
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-white/30" : "bg-slate-100 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── GRID ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Search className="h-10 w-10 mb-3 opacity-25" />
          <p className="text-[15px] font-medium text-slate-600 mb-1">No strains found</p>
          <p className="text-[13px]">
            {searchTerm ? `No results for "${searchTerm}"` : "Try adjusting the filters"}
          </p>
          {(searchTerm || hasActiveFilters) && (
            <button
              onClick={() => { setSearchTerm(""); resetFilters(); setActiveTab("All"); }}
              className="mt-4 text-[13px] text-emerald-700 underline underline-offset-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <p className="text-center text-[12px] text-slate-400 pb-4">
          Showing {filtered.length} of {strains.length} strains
        </p>
      )}
    </div>
  );
};

export default StrainsCatalogPage;
