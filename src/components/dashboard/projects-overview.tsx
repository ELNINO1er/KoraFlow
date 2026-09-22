import { CalendarClock } from "lucide-react";
import { DEMO_PROJECTS } from "@/lib/constants/demo-dashboard";

export function ProjectsOverview() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {DEMO_PROJECTS.map((project) => (
        <div
          key={project.id}
          className="rounded-lg border border-border bg-background p-4"
        >
          <p className="font-medium text-foreground">{project.name}</p>
          <p className="text-xs text-muted-foreground">{project.client}</p>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium text-foreground">
                {project.progress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Livraison prévue : {project.due}
          </p>
        </div>
      ))}
    </div>
  );
}
