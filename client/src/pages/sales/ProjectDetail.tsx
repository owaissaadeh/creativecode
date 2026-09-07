import { useParams } from "wouter";
import ProjectDetailPanel from "@/components/projects/ProjectDetailPanel";

export default function SalesProjectDetail() {
  const params = useParams();
  return <ProjectDetailPanel apiBase="/api/sales" projectId={params.id as string} />;
}
