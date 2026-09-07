import { useParams } from "wouter";
import ProjectDetailPanel from "@/components/projects/ProjectDetailPanel";

export default function AdminProjectDetail() {
  const params = useParams();
  return <ProjectDetailPanel apiBase="/api/admin" projectId={params.id as string} />;
}
