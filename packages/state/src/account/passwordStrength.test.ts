import { describe, expect, it } from "vitest";
import { assessPasswordStrength } from "./passwordStrength.ts";

describe("assessPasswordStrength", () => {
  describe("for a password under eight characters", () => {
    it("rates it too short", () => {
      expect(assessPasswordStrength("k9#Lm2").level).toBe("tooShort");
    });

    it("fills no segment of the meter", () => {
      expect(assessPasswordStrength("k9#Lm2").score).toBe(0);
    });

    it("asks for at least eight characters", () => {
      expect(assessPasswordStrength("k9#Lm2").advice).toEqual([
        "Use at least eight characters.",
      ]);
    });
  });

  describe("for a commonly used password", () => {
    it("rates it weak whatever its case", () => {
      expect(assessPasswordStrength("PassWord123").level).toBe("weak");
    });

    it("says that it is commonly used", () => {
      expect(assessPasswordStrength("iloveyou").advice).toEqual([
        "This is a commonly used password; choose something less predictable.",
      ]);
    });
  });

  describe("for a password made of a repeated character", () => {
    it("rates it weak however long it is", () => {
      expect(assessPasswordStrength("z".repeat(24)).level).toBe("weak");
    });

    it("advises against repeats and sequences first", () => {
      expect(assessPasswordStrength("z".repeat(24)).advice[0]).toBe(
        "Avoid repeating the same character or a simple sequence such as 1234 or abcd.",
      );
    });
  });

  it("rates a password ending in an alphabetical sequence weak", () => {
    expect(assessPasswordStrength("tulipabcdefg").level).toBe("weak");
  });

  it("rates a password ending in a keyboard sequence weak", () => {
    expect(assessPasswordStrength("tulipqwertyu").level).toBe("weak");
  });

  describe("for a short single word", () => {
    it("rates it weak", () => {
      expect(assessPasswordStrength("marigold").level).toBe("weak");
    });

    it("advises a longer phrase and more kinds of characters", () => {
      expect(assessPasswordStrength("marigold").advice).toEqual([
        "Add a longer phrase; length matters more than symbols.",
        "Mix in numbers or punctuation.",
      ]);
    });
  });

  it("rates a short password of varied characters fair", () => {
    expect(assessPasswordStrength("Tr0ub4dor&3").level).toBe("fair");
  });

  it("fills two segments of the meter for a fair password", () => {
    expect(assessPasswordStrength("Tr0ub4dor&3").score).toBe(2);
  });

  it("advises a fair password of varied characters only to grow longer", () => {
    expect(assessPasswordStrength("Tr0ub4dor&3").advice).toEqual([
      "Add a longer phrase; length matters more than symbols.",
    ]);
  });

  describe("for a passphrase of four common words", () => {
    const passphrase = "correct horse battery staple";

    it("rates it strong", () => {
      expect(assessPasswordStrength(passphrase).level).toBe("strong");
    });

    it("fills every segment of the meter", () => {
      expect(assessPasswordStrength(passphrase).score).toBe(3);
    });

    it("gives no advice", () => {
      expect(assessPasswordStrength(passphrase).advice).toEqual([]);
    });
  });
});
