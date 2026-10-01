const messagesByErrorType: Record<string, string> = {
  networkError: "The server could not provide the converted stream.",
  mediaError: "This player could not decode the converted stream.",
};

/** Returns a message for the user about a fatal hls.js error, chosen by the error's type, such as "networkError". */
export function describeStreamError(type: string): string {
  return (
    messagesByErrorType[type] ?? "The converted stream stopped unexpectedly."
  );
}
