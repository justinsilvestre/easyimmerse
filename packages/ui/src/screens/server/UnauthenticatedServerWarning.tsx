/** Warns that the server runs on the local network with the launch token only, so that anyone there can use it. */
export function UnauthenticatedServerWarning() {
  return (
    <p
      role="note"
      className="rounded-md border border-warning-line bg-warning-soft px-3 py-2 text-sm text-warning-fg"
    >
      Anyone on your local network can access your projects, flashcards and
      dictionaries through this server. To keep them private, set up
      authentication below.
    </p>
  );
}
