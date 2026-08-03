import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent, act } from "@testing-library/react";

// ─── Notification bell ────────────────────────────────────────────────────────
// Covers the three defects that made this feature look like it worked:
//   1. reads dropped `error`, so a failure looked like an empty inbox
//   2. it fetched once per mount, so a cross-session approval needed a reload
//   3. read state lived in component state, so reload resurrected everything
// The real read()/readOr() helpers run here — only the Supabase client is faked.

const APPROVED_REC = { id: "r1", strains: { name: "Alaska" } };

type Result = { data: unknown; error: { message: string } | null };

const responses: Record<string, Result> = {};
const calls: Record<string, number> = {};

const makeQuery = (table: string) => {
  const result = () => {
    calls[table] = (calls[table] ?? 0) + 1;
    return Promise.resolve(responses[table] ?? { data: [], error: null });
  };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "in"]) q[m] = () => q;
  q.maybeSingle = () => result();
  q.then = (res: unknown, rej: unknown) =>
    (result() as Promise<unknown>).then(res as never, rej as never);
  return q;
};

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => makeQuery(table),
    auth: { signOut: () => Promise.resolve({ error: null }) },
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
}));

let currentUser: { id: string; full_name: string; role: string } | null = null;
vi.mock("@/context/AppContext", () => ({
  useAppState: () => ({ currentUser, setCurrentUser: vi.fn() }),
}));
vi.mock("@/hooks/useIsDoctor", () => ({ useIsDoctor: () => false }));

import Navbar from "@/components/Navbar";

const bell = () => screen.getByLabelText("Notifications");

beforeEach(() => {
  cleanup();
  localStorage.clear();
  for (const k of Object.keys(responses)) delete responses[k];
  for (const k of Object.keys(calls)) delete calls[k];
  currentUser = { id: "u1", full_name: "Test Patient", role: "patient" };
  responses.patients = { data: { id: "p1" }, error: null };
  responses.recommendations = { data: [APPROVED_REC], error: null };
  responses.usage_records = { data: [], error: null };
});

describe("notification bell", () => {
  it("shows an unread badge for an approved recommendation", async () => {
    render(<Navbar />);
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("refetches when the dropdown is opened", async () => {
    render(<Navbar />);
    await waitFor(() => expect(calls.recommendations).toBe(1));

    fireEvent.click(bell());

    // The whole point of the fix: an approval made elsewhere appears without a reload.
    await waitFor(() => expect(calls.recommendations).toBe(2));
    expect(await screen.findByText("Recommendation approved ✓")).toBeInTheDocument();
  });

  it("surfaces a failed read instead of an empty inbox", async () => {
    responses.recommendations = { data: null, error: { message: "permission denied" } };
    render(<Navbar />);

    fireEvent.click(bell());

    expect(await screen.findByText("Couldn't load notifications")).toBeInTheDocument();
    expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument();
  });

  it("persists read state across a remount, keyed by patient", async () => {
    render(<Navbar />);
    fireEvent.click(bell());
    fireEvent.click(await screen.findByText("Mark all read"));

    const stored = JSON.parse(localStorage.getItem("mc_notif_read") ?? "{}");
    expect(stored.p1).toContain("rec_r1");

    // Remount: the notification is still listed, but no longer unread.
    cleanup();
    render(<Navbar />);
    await waitFor(() => expect(calls.recommendations).toBeGreaterThan(1));
    expect(screen.queryByText("1")).not.toBeInTheDocument();

    // A different patient must not inherit it.
    cleanup();
    responses.patients = { data: { id: "p2" }, error: null };
    render(<Navbar />);
    expect(await screen.findByText("1")).toBeInTheDocument();
  });
});
