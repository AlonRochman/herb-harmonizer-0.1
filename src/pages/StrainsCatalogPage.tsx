import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Thermometer, Droplets, Leaf, Loader2 } from "lucide-react";

const StrainsCatalogPage = () => {
  const [strains, setStrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchStrains = async () => {
      try {
        const { data, error } = await supabase
          .from("strains")
          .select("*")
          .order("name", { ascending: true });

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

  const filteredStrains = strains.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-2" />
        <p>Loading strains database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Strains Catalog</h1>
          <p className="text-slate-500">Browse all medical cannabis varieties in our system</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search strains..."
            className="pl-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStrains.map((strain) => (
          <Card key={strain.id} className="overflow-hidden border-slate-200">
            <CardHeader className="bg-slate-50/50 pb-3 border-b">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="bg-white">
                  {strain.category || "General"}
                </Badge>
              </div>
              <CardTitle className="text-xl mt-2 text-slate-800">{strain.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">THC</p>
                    <p className="font-bold text-slate-700">{strain.thc_level || 0}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">CBD</p>
                    <p className="font-bold text-slate-700">{strain.cbd_level || 0}%</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-[10px] uppercase text-slate-400 font-bold mb-1 flex items-center gap-1">
                  <Leaf className="h-3 w-3" /> Terpene Profile
                </p>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {strain.terpenes_profile || "No specific terpene data available."}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StrainsCatalogPage;