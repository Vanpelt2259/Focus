import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/Auth";
import DashboardPage from "@/pages/Dashboard";
import TimerPage from "@/pages/Timer";
import SessionsPage from "@/pages/Sessions";
import CommunityPage from "@/pages/Community";
import CalendarPage from "@/pages/Calendar";
import ReportsPage from "@/pages/Reports";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import { Timer, Users, Calendar, BarChart3, MessageSquare, Home, LogOut, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function AppShell() {
  const [location, navigate] = useHashLocation();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Loading FocusBuddy...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user || (user as any).error) {
    return <AuthPage />;
  }

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.clear();
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar user={user as any} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/timer" component={TimerPage} />
          <Route path="/sessions" component={SessionsPage} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppShell />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
