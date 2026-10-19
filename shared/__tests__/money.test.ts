import { describe, expect, it } from "vitest";
import { formatAmountLabel, groupThousands } from "../money";

describe("groupThousands", () => {
  it("groups by thousands", () => {
    expect(groupThousands("100")).toBe("100");
    expect(groupThousands("1000")).toBe("1,000");
    expect(groupThousands("1000000")).toBe("1,000,000");
    expect(groupThousands("1250000.5")).toBe("1,250,000.5");
  });
});

describe("formatAmountLabel", () => {
  it("formats however the amount was typed", () => {
    expect(formatAmountLabel("1000000₮")).toBe("1,000,000₮");
    expect(formatAmountLabel("1,000,000₮")).toBe("1,000,000₮");
    expect(formatAmountLabel("1 000 000₮")).toBe("1,000,000₮");
    expect(formatAmountLabel("₮ 350000")).toBe("₮ 350,000");
    expect(formatAmountLabel("$2840")).toBe("$2,840");
    expect(formatAmountLabel("100₮")).toBe("100₮");
  });

  it("keeps a space before a trailing currency word", () => {
    expect(formatAmountLabel("1000000 MNT")).toBe("1,000,000 MNT");
  });

  it("leaves a label without a number alone", () => {
    expect(formatAmountLabel("")).toBe("");
    expect(formatAmountLabel("Free")).toBe("Free");
  });
});
