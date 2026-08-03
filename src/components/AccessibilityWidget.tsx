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
    <span className="text-[13px] font-medium text-ink/75">{label}</span>
    {children}
  </div>
);

const Toggle = ({
  on, onChange, label,
}: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    role="switch" aria-checked={on} aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative h-6 w-10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
      on ? "bg-ink" : "bg-rule"
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 bg-white shadow transition-transform ${
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
          className="mb-2 w-64 border border-rule bg-white p-4 shadow-lg"
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">Accessibility</h2>
            <button
              onClick={() => setOpen(false)} aria-label="Close accessibility settings"
              className="p-1 text-ink/35 transition-colors hover:text-ink"
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
                  className={`h-8 w-8 border font-data font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                    prefs.textSize === n
                      ? "border-ink bg-paper text-ink"
                      : "border-rule bg-white text-ink/55 hover:border-ink/35"
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
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 border border-rule font-data text-[10px] uppercase tracking-[0.12em] text-ink/55 transition-colors hover:bg-paper hover:text-ink"
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
        className="flex h-11 w-11 items-center justify-center bg-ink text-paper shadow-lg transition-colors hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Accessibility className="h-5 w-5" />
      </button>
    </div>
  );
};

export default AccessibilityWidget;
