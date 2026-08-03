import { Navigate } from "react-router-dom";
import { useIsDoctor } from "@/hooks/useIsDoctor";

// ─── Route role guard ─────────────────────────────────────────────────────────
// Minimal on purpose: one allowed role per route, one redirect, no permission
// model. Unauthenticated users never reach here — AppRoutes sends them to
// /login before these routes mount.
//
// Only wrap routes that have NO branch for the other role. Pages that render
// differently per role are legitimately shared and must stay unwrapped:
//   /            Index renders DOCTOR_ACTIONS for clinicians
//   /dashboard   patient sees "My treatment record"; feedback submit redirects
//                a patient here
//   /feedback    clinicians get the patient-review tab (in DOCTOR_ACTIONS)
//   /patient-input  doctors create patients, patients edit their own profile

const RequireRole = ({
  role, children,
}: {
  role: "doctor" | "patient";
  children: React.ReactNode;
}) => {
  const isDoctor = useIsDoctor();
  const actual: "doctor" | "patient" = isDoctor ? "doctor" : "patient";

  if (actual !== role) {
    // Send each role somewhere it belongs rather than to a dead end.
    return <Navigate to={isDoctor ? "/dashboard" : "/"} replace />;
  }
  return <>{children}</>;
};

export default RequireRole;
