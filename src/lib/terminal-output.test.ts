import { describe, expect, it } from "vitest";
import { type TerminalSpinner, trackSpinner, writeAboveSpinner } from "./terminal-output";

const createSpinner = (isSpinning: boolean, events: string[]): TerminalSpinner => ({
  isSpinning,
  clear: () => events.push("clear"),
  render: () => events.push("render"),
});

describe("writeAboveSpinner", () => {
  it("clears a running spinner, writes, then redraws the spinner", () => {
    const events: string[] = [];
    trackSpinner(createSpinner(true, events));

    writeAboveSpinner(() => events.push("write"));

    expect(events).toEqual(["clear", "write", "render"]);
  });

  it("just writes once the spinner has stopped", () => {
    const events: string[] = [];
    trackSpinner(createSpinner(false, events));

    writeAboveSpinner(() => events.push("write"));

    expect(events).toEqual(["write"]);
  });
});
