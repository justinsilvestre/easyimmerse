import type { ComponentProps } from "react";

export function Button(props: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      {...props}
    />
  );
}
