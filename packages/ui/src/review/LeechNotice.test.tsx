import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeechNotice } from "./LeechNotice.tsx";

afterEach(cleanup);

describe("LeechNotice", () => {
  it("tells how often the card was forgotten", () => {
    render(<LeechNotice lapseCount={9} onSuspend={() => {}} />);
    expect(screen.getByText(/forgotten this card 9 times/)).toBeTruthy();
  });

  it("suspends the card on request", () => {
    const onSuspend = vi.fn();
    render(<LeechNotice lapseCount={8} onSuspend={onSuspend} />);
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    expect(onSuspend).toHaveBeenCalled();
  });
});
