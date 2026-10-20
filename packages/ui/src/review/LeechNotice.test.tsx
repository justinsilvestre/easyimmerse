import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeechNotice } from "./LeechNotice.tsx";

afterEach(cleanup);

describe("LeechNotice", () => {
  it("tells how often the card was forgotten", () => {
    render(<LeechNotice lapseCount={9} onEdit={null} onSuspend={() => {}} />);
    expect(screen.getByText(/forgotten this card 9 times/)).toBeTruthy();
  });

  it("suspends the card on request", () => {
    const onSuspend = vi.fn();
    render(<LeechNotice lapseCount={8} onEdit={null} onSuspend={onSuspend} />);
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    expect(onSuspend).toHaveBeenCalled();
  });

  it("offers no Edit for a card that cannot be edited from the review", () => {
    render(<LeechNotice lapseCount={8} onEdit={null} onSuspend={() => {}} />);
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});
