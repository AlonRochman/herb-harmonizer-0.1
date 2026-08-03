// ─── Supabase read helper ─────────────────────────────────────────────────────
// Supabase never throws: a failed query resolves as `{ data: null, error }`.
// Destructuring only `{ data }` therefore converts every failure — RLS denial,
// bad column name, dropped connection — into a silent empty result, and the UI
// renders "nothing here" instead of "something broke". That is exactly how the
// strain_conditions RLS incident hid itself. This helper exists so that class
// of bug cannot recur.
//
// `failed` lets callers tell "loaded, genuinely empty" apart from "load
// failed", so empty states can stay honest.

export interface ReadResult<T> {
  data: T | null;
  failed: boolean;
}

/** Structural subset of PostgrestError — avoids coupling to the SDK type. */
type QueryError = { message: string };

/**
 * Awaits a Supabase read and logs any error against `label` instead of
 * dropping it. `label` should name the read ("bell: approved recommendations")
 * so a console error points straight back at the call site.
 */
export async function read<T>(
  label: string,
  query: PromiseLike<{ data: T | null; error: QueryError | null }>,
): Promise<ReadResult<T>> {
  const { data, error } = await query;
  if (error) {
    console.error(`[supabase read] ${label} — ${error.message}`, error);
    return { data: null, failed: true };
  }
  return { data, failed: false };
}

/**
 * Same contract, but substitutes `fallback` (typically `[]`) so list call sites
 * keep a non-null shape. Still reports whether the read failed.
 */
export async function readOr<T>(
  label: string,
  fallback: T,
  query: PromiseLike<{ data: T | null; error: QueryError | null }>,
): Promise<{ data: T; failed: boolean }> {
  const { data, failed } = await read(label, query);
  return { data: data ?? fallback, failed };
}
