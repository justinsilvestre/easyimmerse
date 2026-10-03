const labels: Record<string, string> = {
  "aarch64-apple-darwin": "macOS (Apple silicon)",
  "x86_64-apple-darwin": "macOS (Intel)",
  "aarch64-unknown-linux-gnu": "Linux (ARM64)",
  "x86_64-unknown-linux-gnu": "Linux (x86-64)",
  "aarch64-pc-windows-msvc": "Windows (ARM64)",
  "x86_64-pc-windows-msvc": "Windows (x86-64)",
};

/** Names the platform of a Rust target triple for people, or returns the triple. */
export function labelPlatform(triple: string): string {
  return labels[triple] ?? triple;
}
