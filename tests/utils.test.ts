import { describe, expect, it } from "vitest";

import {
  resolveErrorMessage,
  toMinorAmount
} from "../src/server/utils";

describe("server utils", () => {
  it("converts amount to minor units", () => {
    expect(toMinorAmount(12.34)).toBe(1234);
    expect(toMinorAmount("10")).toBe(1000);
  });

  it("throws for invalid amount", () => {
    expect(() => toMinorAmount("abc")).toThrow(
      "Invalid amount"
    );
  });

  it("resolves nested error description", () => {
    expect(
      resolveErrorMessage({
        error: {
          description:
            "Gateway error"
        }
      })
    ).toBe("Gateway error");
  });
});
