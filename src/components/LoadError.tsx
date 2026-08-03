import { AlertCircle, RotateCcw } from "lucide-react";

// ─── Load failure notice ──────────────────────────────────────────────────────
// Rendered wherever a Supabase read failed, so the UI never presents a broken
// query as an empty result. Reasoning lives in src/lib/supabaseRead.ts.

const LoadError = ({ what, onRetry }: { what: string; onRetry?: () => void }) => (
  <div
    role="alert"
    className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
  >
    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-[13px] font-semibold text-red-700">Couldn't load {what}.</p>
      <p className="text-[12px] text-red-600/80 mt-0.5">
        The request failed — this is not an empty result. Details are in the browser console.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-700 hover:underline mt-1.5"
        >
          <RotateCcw className="h-3 w-3" /> Try again
        </button>
      )}
    </div>
  </div>
);

export default LoadError;
