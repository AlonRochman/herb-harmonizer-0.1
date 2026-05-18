import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppState } from "./context/AppContext";

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

const AppRoutes = () => {
  const { currentUser } = useAppState();

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

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
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
