import clsx from "clsx";
import { useId, useState } from "react";
import { FieldLabel } from "./FieldLabel.tsx";
import { type LanguageOption, languageOptions } from "./languageOptions.ts";
import { TextInput } from "./TextInput.tsx";

const otherOptionValue = "other";

/** Lets a person pick a common language from a list, or type any BCP 47 tag after choosing "Other…". */
export function LanguageSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (languageCode: string) => void;
}) {
  const id = useId();
  const [isOtherChosen, setIsOtherChosen] = useState(() => isUnlisted(value));
  const chooseOption = (option: string) => {
    setIsOtherChosen(option === otherOptionValue);
    onChange(option === otherOptionValue ? "" : option);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select
          id={id}
          value={isOtherChosen ? otherOptionValue : value}
          onChange={(event) => chooseOption(event.target.value)}
          className={clsx(
            "w-full appearance-none rounded-md border border-line-strong bg-surface py-1.5 pr-9 pl-3 text-sm focus:border-accent focus:outline-hidden focus:ring-2 focus:ring-accent/20",
            value === "" && !isOtherChosen ? "text-fg-faint" : "text-fg",
          )}
        >
          <option value="" disabled>
            Choose a language
          </option>
          {languageOptions.map((language) => (
            <option key={language.code} value={language.code}>
              {formatLanguageName(language)}
            </option>
          ))}
          <option value={otherOptionValue}>Other…</option>
        </select>
        <ChevronDownIcon />
      </div>
      {isOtherChosen && (
        <div className="mt-1">
          <TextInput
            label={`${label} code`}
            value={value}
            onChange={onChange}
            placeholder="gsw"
            hint="A BCP 47 tag, such as gsw for Swiss German or pt-BR for Brazilian Portuguese."
          />
        </div>
      )}
    </div>
  );
}

function isUnlisted(languageCode: string): boolean {
  return (
    languageCode !== "" &&
    !languageOptions.some((language) => language.code === languageCode)
  );
}

function formatLanguageName({ englishName, nativeName }: LanguageOption) {
  return englishName === nativeName
    ? englishName
    : `${nativeName} (${englishName})`;
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
