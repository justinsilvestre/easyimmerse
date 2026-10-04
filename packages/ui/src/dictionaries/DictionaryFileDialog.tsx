import type { DictionaryLanguages } from "@easyimmerse/state";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { languageOptions } from "../projects/languages.ts";
import { dictionaryFormatLabels } from "./dictionaryFormatLabels.ts";

/** Asks which languages a dictionary file covers before the file itself is chosen. */
export function DictionaryFileDialog({
  initialLanguages,
  onChooseFile,
  onClose,
}: {
  initialLanguages: DictionaryLanguages;
  onChooseFile: (languages: DictionaryLanguages) => void;
  onClose: () => void;
}) {
  const [languages, setLanguages] = useState(initialLanguages);
  const formats = Object.values(dictionaryFormatLabels).join(", ");
  return (
    <Dialog
      title="Add a dictionary from a file"
      description={`Supported formats: ${formats}. The languages chosen here are the ones the dictionary is filed under.`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onChooseFile(languages)}>
            <FolderOpen className="size-4" aria-hidden />
            Choose file
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Language of the words"
          hint="The language you look words up in."
          options={languageOptions}
          value={languages.sourceLanguage}
          onChange={(event) =>
            setLanguages({ ...languages, sourceLanguage: event.target.value })
          }
        />
        <SelectField
          label="Language of the definitions"
          hint="The same language for a monolingual dictionary."
          options={languageOptions}
          value={languages.targetLanguage}
          onChange={(event) =>
            setLanguages({ ...languages, targetLanguage: event.target.value })
          }
        />
      </div>
    </Dialog>
  );
}
