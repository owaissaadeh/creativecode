import { useParams } from "wouter";
import TicketDetailPanel from "@/components/projects/TicketDetailPanel";

export default function AdminTicketDetail() {
  const params = useParams();
  return <TicketDetailPanel apiBase="/api/admin" ticketId={params.id as string} canAssign />;
}
