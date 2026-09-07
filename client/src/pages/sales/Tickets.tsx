import TicketsList from "@/components/projects/TicketsList";

export default function SalesTickets() {
  return <TicketsList apiBase="/api/sales" basePath="/sales/tickets" />;
}
