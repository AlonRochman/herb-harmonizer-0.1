import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Loader2, Stethoscope, User, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

// ─── Feature bullet ───────────────────────────────────────────────────────────
const Feature = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-2.5 text-[13px] text-slate-500">
    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
      <Icon className="h-3.5 w-3.5 text-emerald-600" />
    </div>
    {text}
  </div>
);

// ─── Role card ────────────────────────────────────────────────────────────────
const RoleCard = ({
  icon: Icon, title, desc, color, onClick, disabled,
}: {
  icon: React.ElementType; title: string; desc: string;
  color: "emerald" | "blue"; onClick: () => void; disabled: boolean;
}) => {
  const styles = {
    emerald: "hover:border-emerald-300 hover:bg-emerald-50 group-hover:text-emerald-700",
    blue:    "hover:border-blue-300 hover:bg-blue-50 group-hover:text-blue-700",
  };
  const iconStyles = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue:    "bg-blue-100 text-blue-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full flex flex-col items-center gap-3 p-5 rounded-xl border border-slate-200 transition-all disabled:opacity-50 ${styles[color]}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconStyles[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-slate-800">{title}</p>
        <p className="text-[12px] text-slate-400 mt-0.5">{desc}</p>
      </div>
    </button>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [showSignup, setShowSignup] = useState(false);

  // Quick demo login
  const quickLogin = (role: "doctor" | "patient") => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentUser({
        id: "demo-id",
        full_name: fullName || (role === "doctor" ? "Dr. Demo" : "Demo Patient"),
        role,
      });
      navigate("/");
    }, 600);
  };

  // Silent signup → then login
  const handleSignup = async (role: "doctor" | "patient") => {
    setIsLoading(true);
    try {
      await supabase.from("users").insert({
        full_name: fullName || "New User",
        email:     email    || "demo@demo.com",
      });
    } catch {
      // silent
    }
    quickLogin(role);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-700 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">MediCanna</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Clinical Decision Support System</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

          {!showSignup ? (
            <>
              <p className="text-[13px] font-medium text-slate-600 mb-4 text-center">
                Enter as a demo user
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <RoleCard
                  icon={User}
                  title="Patient"
                  desc="View recommendations & log usage"
                  color="emerald"
                  onClick={() => quickLogin("patient")}
                  disabled={isLoading}
                />
                <RoleCard
                  icon={Stethoscope}
                  title="Doctor"
                  desc="Clinical dashboard & approvals"
                  color="blue"
                  onClick={() => quickLogin("doctor")}
                  disabled={isLoading}
                />
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-[13px] text-slate-400 mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Initializing session…
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <button
                  className="w-full text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowSignup(true)}
                >
                  Create a named account →
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] font-medium text-slate-600 mb-4">Create account</p>

              <div className="space-y-3 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Full name</Label>
                  <Input
                    placeholder="e.g. Yoni Cohen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Email</Label>
                  <Input
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-[13px]"
                  onClick={() => handleSignup("patient")}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "As patient"}
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[13px]"
                  onClick={() => handleSignup("doctor")}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "As doctor"}
                </Button>
              </div>

              <button
                className="w-full text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setShowSignup(false)}
              >
                ← Back
              </button>
            </>
          )}
        </div>

        {/* Feature list */}
        <div className="mt-6 space-y-2.5 px-1">
          <Feature icon={Sparkles}    text="AI-powered strain matching" />
          <Feature icon={ShieldCheck} text="Evidence-based clinical rules" />
          <Feature icon={TrendingUp}  text="Treatment efficacy tracking" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;