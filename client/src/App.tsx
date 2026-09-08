import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/auth";
import { usePortalAuthStore } from "@/lib/portalAuth";
import { useFaviconSync } from "@/lib/siteConfig";
import Layout from "@/components/Layout";
import PortalLayout from "@/components/PortalLayout";
import Landing from "@/pages/Landing";
import ProjectShowcase from "@/pages/ProjectShowcase";
import Login from "@/pages/Login";
import PortalLogin from "@/pages/portal/Login";
import PortalDashboard from "@/pages/portal/Dashboard";
import PortalProjectDetail from "@/pages/portal/ProjectDetail";
import PortalTickets from "@/pages/portal/Tickets";
import PortalTicketDetail from "@/pages/portal/TicketDetail";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminLeads from "@/pages/admin/Leads";
import AdminClients from "@/pages/admin/Clients";
import AdminCommissions from "@/pages/admin/Commissions";
import AdminReports from "@/pages/admin/Reports";
import ContentManager from "@/pages/admin/ContentManager";
import Consultations from "@/pages/admin/Consultations";
import AdminProjects from "@/pages/admin/Projects";
import AdminProjectDetail from "@/pages/admin/ProjectDetail";
import AdminTickets from "@/pages/admin/Tickets";
import AdminTicketDetail from "@/pages/admin/TicketDetail";
import SalesDashboard from "@/pages/sales/Dashboard";
import SalesLeads from "@/pages/sales/Leads";
import SalesClients from "@/pages/sales/Clients";
import SalesCommissions from "@/pages/sales/Commissions";
import SalesTasks from "@/pages/sales/Tasks";
import SalesProjects from "@/pages/sales/Projects";
import SalesProjectDetail from "@/pages/sales/ProjectDetail";
import SalesTickets from "@/pages/sales/Tickets";
import SalesTicketDetail from "@/pages/sales/TicketDetail";
import AdminTasks from "@/pages/admin/Tasks";
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

function ProtectedPortalRoute({ component: Component }: { component: React.ComponentType }) {
  const { clientUser } = usePortalAuthStore();
  if (!clientUser) return <Redirect to="/portal/login" />;
  return (
    <PortalLayout>
      <Component />
    </PortalLayout>
  );
}

function Router() {
  const { user } = useAuthStore();
  const { clientUser } = usePortalAuthStore();
  useFaviconSync();

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/projects/:id" component={ProjectShowcase} />
      <Route path="/login">
        {user ? <Redirect to={user.role === "admin" ? "/admin" : "/sales"} /> : <Login />}
      </Route>

      {/* Client Portal Routes */}
      <Route path="/portal/login">
        {clientUser ? <Redirect to="/portal" /> : <PortalLogin />}
      </Route>
      <Route path="/portal">
        <ProtectedPortalRoute component={PortalDashboard} />
      </Route>
      <Route path="/portal/projects/:id">
        <ProtectedPortalRoute component={PortalProjectDetail} />
      </Route>
      <Route path="/portal/tickets">
        <ProtectedPortalRoute component={PortalTickets} />
      </Route>
      <Route path="/portal/tickets/:id">
        <ProtectedPortalRoute component={PortalTicketDetail} />
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
      <Route path="/admin/tasks">
        <ProtectedRoute component={AdminTasks} adminOnly />
      </Route>
      <Route path="/admin/projects">
        <ProtectedRoute component={AdminProjects} adminOnly />
      </Route>
      <Route path="/admin/projects/:id">
        <ProtectedRoute component={AdminProjectDetail} adminOnly />
      </Route>
      <Route path="/admin/tickets">
        <ProtectedRoute component={AdminTickets} adminOnly />
      </Route>
      <Route path="/admin/tickets/:id">
        <ProtectedRoute component={AdminTicketDetail} adminOnly />
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
      <Route path="/sales/tasks">
        <ProtectedRoute component={SalesTasks} />
      </Route>
      <Route path="/sales/projects">
        <ProtectedRoute component={SalesProjects} />
      </Route>
      <Route path="/sales/projects/:id">
        <ProtectedRoute component={SalesProjectDetail} />
      </Route>
      <Route path="/sales/tickets">
        <ProtectedRoute component={SalesTickets} />
      </Route>
      <Route path="/sales/tickets/:id">
        <ProtectedRoute component={SalesTicketDetail} />
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
