import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { supabase } from "@/lib/supabaseClient";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Leaf, LayoutDashboard, Database, LogOut, User,
  ClipboardList, Sparkles, MessageSquare, Menu, X,
  BarChart3, BookOpen, Scale, ShieldCheck,
} from "lucide-react";

const NAV_PATIENT = [
  { label: "Home",            path: "/",                icon: LayoutDashboard },
  { label: "My Profile",      path: "/patient-input",   icon: ClipboardList   },
  { label: "Recommendations", path: "/recommendations", icon: Sparkles        },
  { label: "Dosage",          path: "/dosage",          icon: Scale           },
  { label: "Feedback",        path: "/feedback",        icon: MessageSquare   },
  { label: "Strains",         path: "/strains",         icon: Database        },
  { label: "License",         path: "/license",         icon: ShieldCheck     },
  { label: "Info Centre",     path: "/info",            icon: BookOpen        },
];

const NAV_DOCTOR = [
  { label: "Dashboard",   path: "/dashboard",     icon: BarChart3    },
  { label: "Profiling",   path: "/patient-input", icon: ClipboardList},
  { label: "Strains",     path: "/strains",       icon: Database     },
  { label: "Dosage",      path: "/dosage",        icon: Scale        },
  { label: "Feedback",    path: "/feedback",      icon: MessageSquare},
  { label: "Info Centre", path: "/info",          icon: BookOpen     },
];

const Navbar = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { currentUser, setCurrentUser } = useAppState();
  const isDoctor   = useIsDoctor();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [patientId,  setPatientId]  = useState<string | null>(null);

  const navItems = isDoctor ? NAV_DOCTOR : NAV_PATIENT;
  const isActive = (path: string) => location.pathname === path;

  // Resolve patient_id for notification bell
  useEffect(() => {
    if (!isDoctor && currentUser?.id) {
      supabase.from("patients").select("id")
        .eq("user_id", currentUser.id).maybeSingle()
        .then(({ data }) => setPatientId(data?.id ?? null));
    }
  }, [currentUser, isDoctor]);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => navigate(isDoctor ? "/dashboard" : "/")}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="bg-emerald-700 p-1.5 rounded-lg">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-[15px] tracking-tight hidden sm:block">
              MediCanna
            </span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 hidden sm:block">
              CDSS
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center overflow-x-auto">
            {navItems.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                  isActive(path)
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right — notifications + user + logout */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Notification bell (patients only) */}
            {!isDoctor && <NotificationBell patientId={patientId} />}

            {/* User badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-1.5 pr-3 py-1">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="h-3 w-3 text-emerald-700" />
              </div>
              <span className="text-[12px] font-medium text-slate-700 max-w-[100px] truncate">
                {currentUser?.full_name}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isDoctor ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {isDoctor ? "Doctor" : "Patient"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <button
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 bg-white border-b border-slate-200 shadow-lg p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-3 py-2 mb-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="h-4 w-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-slate-800">{currentUser?.full_name}</p>
                <p className="text-[11px] text-slate-400">{isDoctor ? "Clinician" : "Patient"}</p>
              </div>
            </div>

            {navItems.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                onClick={() => { navigate(path); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors text-left ${
                  isActive(path) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-red-500 hover:bg-red-50 mt-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
