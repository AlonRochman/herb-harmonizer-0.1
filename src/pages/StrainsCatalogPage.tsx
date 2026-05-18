import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Sparkles } from "lucide-react";

const categoryColor: Record<string, string> = {
  indica:  "bg-purple-50 text-purple-700 border-purple-200",
  sativa:  "bg-amber-50  text-amber-700  border-amber-200",
  hybrid:  "bg-teal-50   text-teal-700   border-teal-200",
};

const StrainsCatalogPage = () => {
  const navigate = useNavigate();
  const [strains, setStrains]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchStrains = async () => {
      try {
        const { data, error } = await supabase
          .from("strains").select("*").order("name", { ascending: true });
        if (error) throw error;
        setStrains(data || []);
      } catch (err) {
        console.error("Error fetching strains:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStrains();
  }, []);

  const filtered = strains.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm">Loading strains database…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Strains catalog</h1>
          <p className="text-sm text-slate-400 mt-0.5">{strains.length} varieties in the database</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or category…"
            className="pl-9 text-[13px] bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm font-medium">No strains match "{searchTerm}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((strain) => {
            const cat = strain.category?.toLowerCase() ?? "";
            const catClass = categoryColor[cat] ?? "bg-slate-50 text-slate-600 border-slate-200";
            return (
              <div key={strain.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all group">
                {/* Card top */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 text-[15px] leading-tight group-hover:text-emerald-700 transition-colors">
                    {strain.name}
                  </h3>
                  {strain.category && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap capitalize ${catClass}`}>
                      {strain.category}
                    </span>
                  )}
                </div>

                {/* THC / CBD */}
                <div className="px-4 flex gap-2 mb-3">
                  <span className="text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                    THC {strain.thc_level ?? 0}%
                  </span>
                  <span className="text-[12px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5">
                    CBD {strain.cbd_level ?? 0}%
                  </span>
                </div>

                {/* Terpene profile */}
                {strain.terpenes_profile && (
                  <div className="px-4 mb-4">
                    <p className="text-[11px] uppercase text-slate-400 font-medium tracking-wide mb-1">Terpene profile</p>
                    <p className="text-[13px] text-slate-600 line-clamp-2">{strain.terpenes_profile}</p>
                  </div>
                )}

                {/* CTA */}
                <div className="px-4 pb-4">
                  <Button
                    size="sm"
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
                    onClick={() => navigate(`/recommendations`)}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Get recommendation
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StrainsCatalogPage;
