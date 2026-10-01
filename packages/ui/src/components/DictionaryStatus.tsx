import { formatLanguageName } from "../formatLanguageName.ts";
import { Button } from "./Button.tsx";

/** Tells whether dictionaries are installed for the project's target language, and offers to set them up when they are not. */
export function DictionaryStatus({
  status,
  targetLanguage,
  onSetUpDictionaries,
}: {
  status: "ready" | "missing" | "unknown";
  targetLanguage: string;
  onSetUpDictionaries: () => void;
}) {
  const languageName = formatLanguageName(targetLanguage);
  if (status === "ready")
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600">
        <CheckIcon />
        <span>Dictionaries ready for {languageName}</span>
      </p>
    );
  if (status === "missing")
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="flex-1 basis-64 text-sm text-amber-900">
          No dictionaries for {languageName} yet. Set them up to look up words
          as you read and listen.
        </p>
        <Button onClick={onSetUpDictionaries} className="bg-white">
          Set up dictionaries
        </Button>
      </div>
    );
  return null;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 text-green-600"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
