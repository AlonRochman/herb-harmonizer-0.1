import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Loader2, Stethoscope, User } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  
  // States פשוטים רק בשביל שיהיה מה למלא
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  // פונקציית כניסה מהירה - לא באמת בודקת, פשוט מעבירה
  const quickLogin = (role: 'doctor' | 'patient') => {
    setIsLoading(true);
    
    // מדמים השהיה קלה בשביל ה"קטע" המקצועי
    setTimeout(() => {
      setCurrentUser({ 
        id: "demo-id", 
        full_name: fullName || (role === 'doctor' ? "Dr. Demo Admin" : "Demo Patient"), 
        role: role 
      });
      navigate("/");
    }, 800);
  };

  // הרשמה שקטה - שומרת ב-DB אבל לא חוסמת אם נכשל
  const handleSilentSignUp = async (role: 'doctor' | 'patient') => {
    setIsLoading(true);
    try {
      await supabase.from('users').insert({ 
        full_name: fullName || "Demo User", 
        email: email || "demo@demo.com",
        role: role 
      });
    } catch (e) {
      console.log("Silent signup failed, continuing to app anyway...");
    }
    quickLogin(role);
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] bg-slate-50 p-4 animate-in fade-in duration-700">
      <Card className="w-full max-w-md shadow-2xl border-slate-200 overflow-hidden">
        <div className="h-2 bg-green-600 w-full" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">Herb Harmonizer</CardTitle>
          <CardDescription>Prototype Clinical Access</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">New Account</TabsTrigger>
            </TabsList>

            {/* טאב כניסה מהירה - הכי חשוב למצגת */}
            <TabsContent value="login" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col gap-2 border-2 hover:border-blue-500 hover:bg-blue-50"
                  onClick={() => quickLogin('doctor')}
                  disabled={isLoading}
                >
                  <Stethoscope className="h-8 w-8 text-blue-600" />
                  <span>Doctor View</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col gap-2 border-2 hover:border-green-500 hover:bg-green-50"
                  onClick={() => quickLogin('patient')}
                  disabled={isLoading}
                >
                  <User className="h-8 w-8 text-green-600" />
                  <span>Patient View</span>
                </Button>
              </div>
              <p className="text-center text-xs text-slate-400">Click a role to enter the prototype instantly</p>
            </TabsContent>

            {/* טאב הרשמה - אם רוצים להראות שהמערכת "שומרת" */}
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="name@example.com" onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button className="bg-blue-600" onClick={() => handleSilentSignUp('doctor')} disabled={isLoading}>
                  Join as Doctor
                </Button>
                <Button className="bg-green-600" onClick={() => handleSilentSignUp('patient')} disabled={isLoading}>
                  Join as Patient
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {isLoading && (
            <div className="flex flex-col items-center justify-center mt-6 animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              <span className="text-xs mt-2 font-medium text-slate-500">Initializing Session...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;