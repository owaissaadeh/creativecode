import { useParams } from "wouter";
import TicketDetailPanel from "@/components/projects/TicketDetailPanel";

export default function SalesTicketDetail() {
  const params = useParams();
  return <TicketDetailPanel apiBase="/api/sales" ticketId={params.id as string} canAssign={false} />;
}
