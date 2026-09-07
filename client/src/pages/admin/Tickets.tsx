import TicketsList from "@/components/projects/TicketsList";

export default function AdminTickets() {
  return <TicketsList apiBase="/api/admin" basePath="/admin/tickets" />;
}
