import { useAppState } from "@/context/AppContext";

export function useIsDoctor(): boolean {
  const { currentUser } = useAppState();
  return currentUser?.role === "doctor";
}
