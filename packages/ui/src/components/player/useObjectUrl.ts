import { useEffect, useMemo } from "react";

/** A blob URL for the file, revoked when the file changes or the component using it unmounts. */
export function useObjectUrl(file: File | null): string | null {
  const url = useMemo(
    () => (file === null ? null : URL.createObjectURL(file)),
    [file],
  );
  useEffect(() => {
    if (url === null) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
