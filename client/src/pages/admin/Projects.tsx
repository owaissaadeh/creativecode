import ProjectsList from "@/components/projects/ProjectsList";

export default function AdminProjects() {
  return <ProjectsList apiBase="/api/admin" basePath="/admin/projects" />;
}
