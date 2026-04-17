import { useNavigate, useLocation } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Database, 
  LogOut,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, setCurrentUser } = useAppState();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  const isHomePage = location.pathname === "/";

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        <div className="flex items-center gap-4">
          {!isHomePage && (
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-500 pr-2">
              <ChevronLeft className="h-5 w-5 mr-1" /> Back
            </Button>
          )}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate("/")}>
            <div className="bg-green-600 p-1.5 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800 hidden lg:block">Herb Harmonizer</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <Button variant={isActive("/") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/")}>Home</Button>
          <Button variant={isActive("/strains") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/strains")} className="gap-2">
            <Database className="h-4 w-4" /> Strains
          </Button>
          <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-xs font-bold text-slate-800">{currentUser?.full_name}</span>
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
              {currentUser?.role === 'doctor' ? '👨‍⚕️ Clinician' : '👤 Patient'}
            </span>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full hover:bg-red-50 hover:text-red-600" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;