import ProjectsList from "@/components/projects/ProjectsList";

export default function SalesProjects() {
  return <ProjectsList apiBase="/api/sales" basePath="/sales/projects" />;
}
