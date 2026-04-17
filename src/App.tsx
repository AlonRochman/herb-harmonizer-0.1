import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppState } from "./context/AppContext";

// Pages
import Index from "./pages/Index";
import PatientInputPage from "./pages/PatientInputPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import DashboardPage from "./pages/DashboardPage";
import FeedbackPage from "./pages/FeedbackPage";
import StrainsCatalogPage from "./pages/StrainsCatalogPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";

const queryClient = new QueryClient();

// קומפוננטת הניתוב - בודקת אם יש משתמש מחובר
const AppRoutes = () => {
  const { currentUser } = useAppState();

  // אם אין משתמש מחובר - מציגים רק את דף הלוגין
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // אם המשתמש מחובר - מציגים את כל המערכת
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/patient-input" element={<PatientInputPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/strains" element={<StrainsCatalogPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;