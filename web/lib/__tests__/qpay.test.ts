import { describe, expect, it } from "vitest";
import { signQpay, verifyQpaySignature } from "../qpay";

describe("QPay signatures", () => {
  it("verifies a signature it produced", () => {
    const signature = signQpay(["PAY-1", "INV-9"], "secret");
    expect(verifyQpaySignature(signature, ["PAY-1", "INV-9"], "secret")).toBe(true);
  });

  it("rejects a token replayed against another payment or invoice", () => {
    const signature = signQpay(["PAY-1", "INV-9"], "secret");
    expect(verifyQpaySignature(signature, ["PAY-2", "INV-9"], "secret")).toBe(false);
    expect(verifyQpaySignature(signature, ["PAY-1", "INV-8"], "secret")).toBe(false);
  });

  it("rejects a different secret and malformed input", () => {
    const signature = signQpay(["PAY-1"], "secret");
    expect(verifyQpaySignature(signature, ["PAY-1"], "other")).toBe(false);
    expect(verifyQpaySignature("", ["PAY-1"], "secret")).toBe(false);
    expect(verifyQpaySignature("zz", ["PAY-1"], "secret")).toBe(false);
  });
});
