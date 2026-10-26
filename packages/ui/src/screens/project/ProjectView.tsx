import { pathOfRoute } from "@easyimmerse/state";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "../../components/common/Button.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";

/**
 * The project screen's frame: its name, the way back, and the project's settings.
 * Work is saved as it happens, so there is nothing to save by hand.
 * The sections below the name, such as the media list and the flashcards panel, come in as children.
 */
export function ProjectView({
  projectId,
  name,
  children,
}: {
  projectId: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <ScreenLayout
      backHref={pathOfRoute({ screen: "home" })}
      backLabel="Projects"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-xl font-semibold">{name}</h1>
        <ButtonLink
          variant="subtle"
          href={pathOfRoute({ screen: "projectSettings", projectId })}
        >
          <Settings className="size-4" aria-hidden />
          Project settings
        </ButtonLink>
      </div>
      {children}
    </ScreenLayout>
  );
}
