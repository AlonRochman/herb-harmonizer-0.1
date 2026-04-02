import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, ClipboardList, BarChart3, MessageSquare, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: ClipboardList, title: "Patient Profiling", desc: "Input medical conditions, sensitivities & constraints", path: "/patient-input" },
    { icon: Leaf, title: "Smart Recommendations", desc: "AI-matched strains based on your clinical profile", path: "/patient-input" },
    { icon: BarChart3, title: "Treatment Dashboard", desc: "Track usage history, recommendations & trends", path: "/dashboard" },
    { icon: MessageSquare, title: "Feedback System", desc: "Rate effectiveness and report side effects", path: "/feedback" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-header text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary-foreground/15 text-sm font-medium">
            <Leaf className="h-4 w-4" /> MediCanna Health
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight">
            Medical Cannabis<br />Decision Support
          </h1>
          <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">
            Evidence-based strain recommendations tailored to your medical profile and clinical constraints.
          </p>
          <Button
            size="lg"
            className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-display font-semibold"
            onClick={() => navigate("/patient-input")}
          >
            Start Assessment <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 -mt-8 pb-16">
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card
              key={f.title}
              className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              onClick={() => navigate(f.path)}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="h-6 w-6 text-accent-foreground group-hover:text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12">
          © 2026 MediCanna Health Systems. Medical cannabis should be used under the supervision of a healthcare professional.
        </p>
      </main>
    </div>
  );
};

export default Index;
