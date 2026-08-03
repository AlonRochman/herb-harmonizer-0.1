import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { supabase } from "@/lib/supabaseClient";
import { read, readOr } from "@/lib/supabaseRead";
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

// Mirrors DOCTOR_ACTIONS on the home page. Dosage and the Info Centre are
// written in the second person for the patient ("your body weight", "your
// personalised dose", "essential knowledge for new patients") and neither
// touches a patient record, so they are not clinician tools.
const NAV_DOCTOR = [
  { label: "Home",        path: "/",              icon: LayoutDashboard },
  { label: "Dashboard",   path: "/dashboard",     icon: BarChart3     },
  { label: "Profiling",   path: "/patient-input", icon: ClipboardList },
  { label: "Strains",     path: "/strains",       icon: Database      },
  { label: "Feedback",    path: "/feedback",      icon: MessageSquare },
];

// ─── Notification types ───────────────────────────────────────────────────────
interface Notif {
  id: string;
  type: "approval" | "feedback_due" | "new_strain" | "reminder";
  title: string;
  body: string;
  action?: { label: string; path: string };
}

// The four notification kinds used to carry emerald/amber/teal/blue tiles.
// Amber and teal are resin and clinic at a glance, and none of these rows is a
// cannabinoid reading — the kind is already carried by its icon and its words.
const NOTIF_ICONS = {
  approval:     CheckCircle2,
  feedback_due: Star,
  new_strain:   Leaf,
  reminder:     AlertCircle,
};

// ─── Read-state persistence ───────────────────────────────────────────────────
// Notification rows are derived from DB state, not stored, so "read" has
// nowhere to live server-side. Rather than add a column for a prototype
// affordance, the dismissed IDs live in localStorage keyed by patient — same
// approach as the accessibility prefs (mc_a11y). Survives reload; per-device
// by design, which is acceptable for a single-user demo.

// Shapes the bell actually depends on. The Supabase client is untyped, so
// these are the contract, not generated types.
interface RecRow   { id: string; strains: { name: string } | null; }
interface UsageRow {
  id: string;
  usage_date: string;
  strains: { name: string } | null;
  feedback: { id: string }[] | { id: string } | null;
}

const READ_KEY = "mc_notif_read";
const READ_CAP = 100; // derived IDs are stable, but don't grow the blob forever

type ReadMap = Record<string, string[]>;

const loadReadMap = (): ReadMap => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as ReadMap) : {};
  } catch {
    return {};
  }
};

const loadReadIds = (patientId: string | null): string[] =>
  patientId ? loadReadMap()[patientId] ?? [] : [];

const saveReadIds = (patientId: string | null, ids: string[]) => {
  if (!patientId) return;
  try {
    const map = loadReadMap();
    map[patientId] = ids.slice(-READ_CAP);
    localStorage.setItem(READ_KEY, JSON.stringify(map));
  } catch {
    /* storage disabled or full — read state degrades to session-only */
  }
};

// ─── Notification Bell (inlined) ─────────────────────────────────────────────
const NotificationBell = ({ patientId }: { patientId: string | null }) => {
  const navigate                = useNavigate();
  const [open,    setOpen]      = useState(false);
  const [notifs,  setNotifs]    = useState<Notif[]>([]);
  const [failed,  setFailed]    = useState(false);
  const [readIds, setReadIds]   = useState<string[]>(() => loadReadIds(patientId));
  const ref                     = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Switching identity (demo buttons, sign out/in) must not inherit read state
  useEffect(() => { setReadIds(loadReadIds(patientId)); }, [patientId]);

  // Derive notifications from DB state. Read errors are surfaced rather than
  // swallowed — a failed query must not be indistinguishable from an empty
  // inbox, which is precisely how this feature stayed broken-but-plausible.
  const load = useCallback(async () => {
    if (!patientId) return;
    const generated: Notif[] = [];
    let sawFailure = false;

    // Approved recommendations
    const recs = await readOr<RecRow[]>(
      "bell: approved recommendations", [],
      supabase
        .from("recommendations")
        .select("id, status, strains(name), recommendation_date")
        .eq("patient_id", patientId)
        .eq("status", "approved")
        .limit(2),
    );
    sawFailure = sawFailure || recs.failed;

    recs.data.forEach((rec) => {
      generated.push({
        id:     `rec_${rec.id}`,
        type:   "approval",
        title:  "Recommendation approved ✓",
        body:   `Dr. approved ${rec.strains?.name ?? "your recommendation"}. Ready to use!`,
        action: { label: "View recommendations", path: "/recommendations" },
      });
    });

    // Usage without feedback
    const usage = await readOr<UsageRow[]>(
      "bell: usage records", [],
      supabase
        .from("usage_records")
        .select("id, usage_date, strains(name), feedback(id)")
        .eq("patient_id", patientId)
        .order("usage_date", { ascending: false })
        .limit(5),
    );
    sawFailure = sawFailure || usage.failed;

    usage.data.forEach((u) => {
      const hasFb   = Array.isArray(u.feedback) ? u.feedback.length > 0 : !!u.feedback;
      const daysAgo = Math.floor((Date.now() - new Date(u.usage_date).getTime()) / 86400000);
      if (!hasFb && daysAgo >= 1 && daysAgo <= 14) {
        generated.push({
          id:     `fb_${u.id}`,
          type:   "feedback_due",
          title:  "Feedback pending",
          body:   `Rate your session with ${u.strains?.name ?? "the strain"} to improve recommendations.`,
          action: { label: "Submit feedback", path: "/feedback" },
        });
      }
    });

    // 30-day reminder
    const last = usage.data[0];
    if (last) {
      const daysAgo = Math.floor((Date.now() - new Date(last.usage_date).getTime()) / 86400000);
      if (daysAgo >= 30) {
        generated.push({
          id:    "reminder_30",
          type:  "reminder",
          title: "30 days since last session",
          body:  "Log a new usage session to keep your treatment history current.",
          action: { label: "Log usage", path: "/recommendations" },
        });
      }
    }

    setFailed(sawFailure);
    setNotifs(generated.slice(0, 5));
  }, [patientId]);

  // Mount load drives the unread badge; reopening refetches, so an approval
  // made in another session appears without a page reload. Deliberately not a
  // realtime subscription — one more moving part to fail during a demo.
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const isRead   = (id: string) => readIds.includes(id);
  const unread   = notifs.filter((n) => !isRead(n.id)).length;

  const persist  = (ids: string[]) => { setReadIds(ids); saveReadIds(patientId, ids); };
  const markRead = (id: string) => { if (!isRead(id)) persist([...readIds, id]); };
  const markAll  = () => persist(Array.from(new Set([...readIds, ...notifs.map((n) => n.id)])));
  const handleAct  = (n: Notif) => { markRead(n.id); if (n.action) navigate(n.action.path); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 transition-colors hover:bg-paper"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-ink/50" />
        {/* An unread count is not a clinical risk, so it is ink, not flag. */}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center bg-ink font-data text-[9px] font-semibold text-paper">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 overflow-hidden border border-rule bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ width: 300 }}>
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">Notifications</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAll} className="font-data text-[10px] uppercase tracking-[0.1em] text-ink/40 transition-colors hover:text-ink">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close notifications">
                <X className="h-4 w-4 text-ink/35 transition-colors hover:text-ink" />
              </button>
            </div>
          </div>

          {failed ? (
            <div className="flex flex-col items-center gap-2 py-10 text-flag">
              <AlertCircle className="h-5 w-5" />
              <p className="text-[12px]">Couldn't load notifications</p>
              <button onClick={load} className="font-data text-[10px] uppercase tracking-[0.12em] hover:underline">
                Try again
              </button>
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-ink/40">
              <Bell className="h-5 w-5 opacity-40" />
              <p className="text-[12px]">No notifications yet</p>
            </div>
          ) : (
            <div className="max-h-72 divide-y divide-rule overflow-y-auto">
              {notifs.map((n) => {
                const Icon = NOTIF_ICONS[n.type];
                return (
                  <div key={n.id}
                    className={`flex gap-3 px-4 py-3 ${isRead(n.id) ? "opacity-55" : "bg-paper"}`}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink/45" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold leading-tight text-ink">{n.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink/55">{n.body}</p>
                      {n.action && (
                        <button onClick={() => handleAct(n)}
                          className="mt-1 font-data text-[10px] uppercase tracking-[0.1em] text-ink/60 transition-colors hover:text-ink">
                          {n.action.label} →
                        </button>
                      )}
                    </div>
                    {!isRead(n.id) && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-ink" />}
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
    if (isDoctor || !currentUser?.id) return;
    // If this read fails the bell has no patient to query for, so the failure
    // must be visible in the console rather than looking like "no patient".
    read<{ id: string }>(
      "navbar: resolve patient for current user",
      supabase.from("patients").select("id").eq("user_id", currentUser.id).maybeSingle(),
    ).then(({ data }) => setPatientId(data?.id ?? null));
  }, [currentUser, isDoctor]);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <>
      {/* The masthead rule the report pages open with, carried across the top
          of the whole application so the nav belongs to the same document. */}
      <nav className="sticky top-0 z-50 border-b-2 border-ink bg-white">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">

          {/* Logo */}
          <button
            onClick={() => navigate(isDoctor ? "/dashboard" : "/")}
            className="flex shrink-0 items-center gap-2"
          >
            <span className="flex h-6 w-6 items-center justify-center bg-ink">
              <Leaf className="h-3.5 w-3.5 text-paper" />
            </span>
            <span className="hidden font-display text-[15px] font-semibold tracking-tight text-ink sm:block">
              MediCanna
            </span>
            <span className="hidden border border-rule px-1.5 py-0.5 font-data text-[9px] uppercase tracking-[0.12em] text-ink/50 sm:block">
              CDSS
            </span>
          </button>

          {/* Desktop nav — same tab idiom as the catalogue's category tabs */}
          <div className="hidden flex-1 items-center justify-center gap-0.5 overflow-x-auto md:flex">
            {navItems.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`whitespace-nowrap px-2.5 py-1.5 font-data text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  isActive(path)
                    ? "bg-ink text-paper"
                    : "text-ink/50 hover:bg-paper hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="flex shrink-0 items-center gap-1.5">
            {!isDoctor && <NotificationBell patientId={patientId} />}

            {/* Role is a route, not a clinical reading — no colour of its own. */}
            <div className="hidden items-center gap-2 border border-rule px-2.5 py-1 sm:flex">
              <User className="h-3 w-3 shrink-0 text-ink/40" />
              <span className="max-w-[100px] truncate text-[12px] font-medium text-ink/80">
                {currentUser?.full_name}
              </span>
              <span className="font-data text-[9px] uppercase tracking-[0.12em] text-ink/45">
                {isDoctor ? "Doctor" : "Patient"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-ink/40 transition-colors hover:bg-paper hover:text-ink"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <button
              className="p-2 text-ink/50 transition-colors hover:bg-paper md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute left-0 right-0 top-14 space-y-1 border-b border-rule bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-3 border-b border-rule px-1 pb-3">
              <User className="h-4 w-4 shrink-0 text-ink/40" />
              <div>
                <p className="text-[13px] font-medium text-ink">{currentUser?.full_name}</p>
                <p className="font-data text-[10px] uppercase tracking-[0.12em] text-ink/40">
                  {isDoctor ? "Clinician" : "Patient"}
                </p>
              </div>
            </div>
            {navItems.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                onClick={() => { navigate(path); setMobileOpen(false); }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left font-data text-[11px] uppercase tracking-[0.1em] transition-colors ${
                  isActive(path) ? "bg-ink text-paper" : "text-ink/60 hover:bg-paper hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 border border-rule px-3 py-2.5 font-data text-[11px] uppercase tracking-[0.1em] text-ink/60 transition-colors hover:bg-paper hover:text-ink"
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
