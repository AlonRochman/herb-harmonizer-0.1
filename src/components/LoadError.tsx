import { AlertCircle, RotateCcw } from "lucide-react";

// ─── Load failure notice ──────────────────────────────────────────────────────
// Rendered wherever a Supabase read failed, so the UI never presents a broken
// query as an empty result. Reasoning lives in src/lib/supabaseRead.ts.
// Takes flag: this is the one place in the shell that reports something wrong,
// which is exactly what flag is reserved for.

const LoadError = ({ what, onRetry }: { what: string; onRetry?: () => void }) => (
  <div
    role="alert"
    className="flex items-start gap-2 border border-flag/40 border-l-2 border-l-flag bg-flag/5 p-3"
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
    <div className="flex-1">
      <p className="text-[13px] font-semibold text-flag">Couldn't load {what}.</p>
      <p className="mt-0.5 text-[12px] text-flag/80">
        The request failed — this is not an empty result. Details are in the browser console.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1.5 inline-flex items-center gap-1 font-data text-[10px] uppercase tracking-[0.12em] text-flag hover:underline"
        >
          <RotateCcw className="h-3 w-3" /> Try again
        </button>
      )}
    </div>
  </div>
);

export default LoadError;
