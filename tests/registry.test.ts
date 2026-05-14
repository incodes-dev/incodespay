import { describe, expect, it } from "vitest";

import { getGatewayAdapter } from "../src/server/registry";
import { PaymentGatewayError } from "../src/server/errors";

describe("gateway registry", () => {
  it("returns adapter for stripe", () => {
    const adapter = getGatewayAdapter(
      "stripe"
    );

    expect(typeof adapter).toBe(
      "function"
    );
  });

  it("throws when gateway is unsupported", () => {
    expect(() =>
      getGatewayAdapter(
        "unknown" as never
      )
    ).toThrow(PaymentGatewayError);
  });
});
