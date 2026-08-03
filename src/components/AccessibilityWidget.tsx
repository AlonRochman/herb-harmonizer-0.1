import { useEffect, useRef, useState } from "react";
import { Accessibility, X, RotateCcw } from "lucide-react";

// ─── Accessibility widget ─────────────────────────────────────────────────────
// Three adjustments that matter for a medical audience: larger text, higher
// contrast, and no motion. Choices persist in localStorage and are applied as
// classes on <html>, so every page (and future page) inherits them.

interface A11yState {
  textSize: 0 | 1 | 2;     // normal / large / extra large
  contrast: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: A11yState = { textSize: 0, contrast: false, reduceMotion: false };
const STORAGE_KEY = "mc_a11y";

const readPrefs = (): A11yState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

const apply = (s: A11yState) => {
  const el = document.documentElement;
  el.classList.toggle("a11y-text-lg", s.textSize === 1);
  el.classList.toggle("a11y-text-xl", s.textSize === 2);
  el.classList.toggle("a11y-contrast", s.contrast);
  el.classList.toggle("a11y-no-motion", s.reduceMotion);
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <span className="text-[13px] font-medium text-slate-700">{label}</span>
    {children}
  </div>
);

const Toggle = ({
  on, onChange, label,
}: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    role="switch" aria-checked={on} aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative w-10 h-6 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
      on ? "bg-emerald-600" : "bg-slate-300"
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
        on ? "translate-x-[18px]" : "translate-x-0.5"
      }`}
    />
  </button>
);

const AccessibilityWidget = () => {
  const [open, setOpen]   = useState(false);
  const [prefs, setPrefs] = useState<A11yState>(readPrefs);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { apply(prefs); }, []); // apply persisted prefs on load

  const update = (next: Partial<A11yState>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    apply(merged);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
  };

  // Close on Escape / outside click
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="fixed bottom-4 left-4 z-[60]">
      {open && (
        <div
          role="dialog" aria-label="Accessibility settings"
          className="mb-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[14px] font-semibold text-slate-900">Accessibility</h2>
            <button
              onClick={() => setOpen(false)} aria-label="Close accessibility settings"
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Row label="Text size">
            <div className="flex gap-1" role="radiogroup" aria-label="Text size">
              {([0, 1, 2] as const).map((n) => (
                <button
                  key={n}
                  role="radio" aria-checked={prefs.textSize === n}
                  onClick={() => update({ textSize: n })}
                  className={`w-8 h-8 rounded-lg border text-slate-700 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                    prefs.textSize === n
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  style={{ fontSize: 11 + n * 3 }}
                >
                  A
                </button>
              ))}
            </div>
          </Row>

          <Row label="High contrast">
            <Toggle on={prefs.contrast} onChange={(v) => update({ contrast: v })} label="High contrast" />
          </Row>

          <Row label="Reduce motion">
            <Toggle on={prefs.reduceMotion} onChange={(v) => update({ reduceMotion: v })} label="Reduce motion" />
          </Row>

          <button
            onClick={() => update(DEFAULTS)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 text-[12px] text-slate-500 hover:bg-slate-50"
          >
            <RotateCcw className="h-3 w-3" /> Reset to defaults
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Accessibility settings"
        title="Accessibility settings"
        className="w-11 h-11 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <Accessibility className="h-5 w-5" />
      </button>
    </div>
  );
};

export default AccessibilityWidget;
