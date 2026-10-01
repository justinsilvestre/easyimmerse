import type { AppAction } from "@easyimmerse/state";
import type { Decorator } from "@storybook/react-vite";
import { type ReactNode, useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/**
 * Dispatches the actions once the story has mounted, to put the store in the state the story shows.
 * Place it inside `withAppStore`: list it before `withAppStore`, or on the story when `withAppStore` is on the meta.
 */
export function withDispatchedActions(...storyActions: AppAction[]): Decorator {
  return (Story) => (
    <DispatchOnMount storyActions={storyActions}>
      <Story />
    </DispatchOnMount>
  );
}

function DispatchOnMount({
  storyActions,
  children,
}: {
  storyActions: AppAction[];
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  // Toggle actions are not idempotent, so a second run under strict mode must not repeat them.
  const hasDispatched = useRef(false);
  useEffect(() => {
    if (hasDispatched.current) return;
    hasDispatched.current = true;
    for (const action of storyActions) dispatch(action);
  }, [dispatch, storyActions]);
  return children;
}
