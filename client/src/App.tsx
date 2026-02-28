import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/auth";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminLeads from "@/pages/admin/Leads";
import AdminClients from "@/pages/admin/Clients";
import AdminCommissions from "@/pages/admin/Commissions";
import AdminReports from "@/pages/admin/Reports";
import ContentManager from "@/pages/admin/ContentManager";
import Consultations from "@/pages/admin/Consultations";
import SalesDashboard from "@/pages/sales/Dashboard";
import SalesLeads from "@/pages/sales/Leads";
import SalesClients from "@/pages/sales/Clients";
import SalesCommissions from "@/pages/sales/Commissions";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user } = useAuthStore();
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/sales" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { user } = useAuthStore();

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login">
        {user ? <Redirect to={user.role === "admin" ? "/admin" : "/sales"} /> : <Login />}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} adminOnly />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsers} adminOnly />
      </Route>
      <Route path="/admin/leads">
        <ProtectedRoute component={AdminLeads} adminOnly />
      </Route>
      <Route path="/admin/clients">
        <ProtectedRoute component={AdminClients} adminOnly />
      </Route>
      <Route path="/admin/commissions">
        <ProtectedRoute component={AdminCommissions} adminOnly />
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute component={AdminReports} adminOnly />
      </Route>
      <Route path="/admin/content">
        <ProtectedRoute component={ContentManager} adminOnly />
      </Route>
      <Route path="/admin/consultations">
        <ProtectedRoute component={Consultations} adminOnly />
      </Route>

      {/* Sales Routes */}
      <Route path="/sales">
        <ProtectedRoute component={SalesDashboard} />
      </Route>
      <Route path="/sales/leads">
        <ProtectedRoute component={SalesLeads} />
      </Route>
      <Route path="/sales/clients">
        <ProtectedRoute component={SalesClients} />
      </Route>
      <Route path="/sales/commissions">
        <ProtectedRoute component={SalesCommissions} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
