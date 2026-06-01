import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { supabase } from "@/lib/supabaseClient";
import {
  Leaf, LayoutDashboard, Database, LogOut, User,
  ClipboardList, Sparkles, MessageSquare, Menu, X,
  BarChart3, BookOpen, Scale, ShieldCheck, Bell,
  CheckCircle2, Star, AlertCircle,
} from "lucide-react";

// ─── Nav items ────────────────────────────────────────────────────────────────
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
  { label: "Dashboard",   path: "/dashboard",     icon: BarChart3     },
  { label: "Profiling",   path: "/patient-input", icon: ClipboardList },
  { label: "Strains",     path: "/strains",       icon: Database      },
  { label: "Dosage",      path: "/dosage",        icon: Scale         },
  { label: "Feedback",    path: "/feedback",      icon: MessageSquare },
  { label: "Info Centre", path: "/info",          icon: BookOpen      },
];

// ─── Notification types ───────────────────────────────────────────────────────
interface Notif {
  id: string;
  type: "approval" | "feedback_due" | "new_strain" | "reminder";
  title: string;
  body: string;
  action?: { label: string; path: string };
  read: boolean;
}

const NOTIF_ICONS = {
  approval:     { icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-600" },
  feedback_due: { icon: Star,         bg: "bg-amber-50",   color: "text-amber-600"   },
  new_strain:   { icon: Leaf,         bg: "bg-teal-50",    color: "text-teal-600"    },
  reminder:     { icon: AlertCircle,  bg: "bg-blue-50",    color: "text-blue-600"    },
};

// ─── Notification Bell (inlined) ─────────────────────────────────────────────
const NotificationBell = ({ patientId }: { patientId: string | null }) => {
  const navigate              = useNavigate();
  const [open,   setOpen]     = useState(false);
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const ref                   = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Generate notifications from DB
  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      const generated: Notif[] = [];

      // Approved recommendations
      const { data: recs } = await supabase
        .from("recommendations")
        .select("id, status, strains(name), recommendation_date")
        .eq("patient_id", patientId)
        .eq("status", "approved")
        .limit(2);

      (recs ?? []).forEach((rec: any) => {
        generated.push({
          id:     `rec_${rec.id}`,
          type:   "approval",
          title:  "Recommendation approved ✓",
          body:   `Dr. approved ${rec.strains?.name ?? "your recommendation"}. Ready to use!`,
          action: { label: "View recommendations", path: "/recommendations" },
          read:   false,
        });
      });

      // Usage without feedback
      const { data: usage } = await supabase
        .from("usage_records")
        .select("id, usage_date, strains(name), feedback(id)")
        .eq("patient_id", patientId)
        .order("usage_date", { ascending: false })
        .limit(5);

      (usage ?? []).forEach((u: any) => {
        const hasFb    = Array.isArray(u.feedback) ? u.feedback.length > 0 : !!u.feedback;
        const daysAgo  = Math.floor((Date.now() - new Date(u.usage_date).getTime()) / 86400000);
        if (!hasFb && daysAgo >= 1 && daysAgo <= 14) {
          generated.push({
            id:     `fb_${u.id}`,
            type:   "feedback_due",
            title:  "Feedback pending",
            body:   `Rate your session with ${u.strains?.name ?? "the strain"} to improve recommendations.`,
            action: { label: "Submit feedback", path: "/feedback" },
            read:   false,
          });
        }
      });

      // 30-day reminder
      const last = (usage ?? [])[0];
      if (last) {
        const daysAgo = Math.floor((Date.now() - new Date(last.usage_date).getTime()) / 86400000);
        if (daysAgo >= 30) {
          generated.push({
            id:   "reminder_30",
            type: "reminder",
            title: "30 days since last session",
            body:  "Log a new usage session to keep your treatment history current.",
            action: { label: "Log usage", path: "/recommendations" },
            read:  false,
          });
        }
      }

      setNotifs(generated.slice(0, 5));
    };
    load();
  }, [patientId]);

  const unread     = notifs.filter((n) => !n.read).length;
  const markRead   = (id: string) => setNotifs((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
  const markAll    = () => setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  const handleAct  = (n: Notif) => { markRead(n.id); if (n.action) navigate(n.action.path); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-500" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-76 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ width: 300 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-[13px] font-semibold text-slate-800">Notifications</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] text-slate-400 hover:text-slate-600">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {notifs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-slate-400 gap-2">
              <Bell className="h-6 w-6 opacity-25" />
              <p className="text-[12px]">No notifications yet</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {notifs.map((n) => {
                const cfg  = NOTIF_ICONS[n.type];
                const Icon = cfg.icon;
                return (
                  <div key={n.id}
                    className={`flex gap-3 px-4 py-3 ${n.read ? "opacity-60" : "bg-slate-50/50"}`}>
                    <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 leading-tight">{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                      {n.action && (
                        <button onClick={() => handleAct(n)}
                          className="text-[11px] text-emerald-600 font-semibold mt-1 hover:underline">
                          {n.action.label} →
                        </button>
                      )}
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Navbar ──────────────────────────────────────────────────────────────
const Navbar = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { currentUser, setCurrentUser } = useAppState();
  const isDoctor   = useIsDoctor();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [patientId,  setPatientId]  = useState<string | null>(null);

  const navItems = isDoctor ? NAV_DOCTOR : NAV_PATIENT;
  const isActive = (path: string) => location.pathname === path;

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

          {/* Right */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isDoctor && <NotificationBell patientId={patientId} />}

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
