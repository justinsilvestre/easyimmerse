import { pathOfRoute } from "@easyimmerse/state";
import { Library, Settings2 } from "lucide-react";
import { ButtonLink } from "../../components/common/Button.tsx";

/** The home screen's way into the server's library and into managing it, for someone who may manage it. */
export function HomeLibrarySection() {
  return (
    <section
      aria-label="Library"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Library className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">Library</h2>
          <p className="text-sm text-fg-muted">
            Videos, audio, and texts prepared for learners on this server.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <ButtonLink href={pathOfRoute({ screen: "libraryManage" })}>
          <Settings2 className="size-4" aria-hidden />
          Manage library
        </ButtonLink>
        <ButtonLink href={pathOfRoute({ screen: "library" })}>
          Browse the library
        </ButtonLink>
      </div>
    </section>
  );
}
