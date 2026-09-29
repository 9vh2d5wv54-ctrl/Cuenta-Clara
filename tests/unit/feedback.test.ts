import { afterEach, describe, expect, it } from "vitest";
import { cleanFeedback, feedbackRecipient, MAX_FEEDBACK } from "@/lib/feedback";

describe("feedback", () => {
  afterEach(() => {
    delete process.env.FEEDBACK_TO;
    delete process.env.CLARA_TESTER_EMAILS;
  });

  it("keeps a good message and trims it", () => {
    expect(cleanFeedback({ kind: "bug", message: "  The + button did nothing ", page: "/app/add", lang: "en" })).toEqual({
      kind: "bug",
      message: "The + button did nothing",
      page: "/app/add",
      lang: "en",
    });
  });

  it("rejects unknown kinds, empty and too-long messages", () => {
    expect(cleanFeedback({ kind: "spam", message: "hi", page: "/app" })).toBeNull();
    expect(cleanFeedback({ kind: "idea", message: "   ", page: "/app" })).toBeNull();
    expect(cleanFeedback({ kind: "idea", message: "x".repeat(MAX_FEEDBACK + 1), page: "/app" })).toBeNull();
    expect(cleanFeedback(null)).toBeNull();
  });

  it("never lets a strange page into the email subject", () => {
    expect(cleanFeedback({ kind: "love", message: "great", page: "https://evil.example\nBcc: x" })?.page).toBe("/");
    expect(cleanFeedback({ kind: "love", message: "great", page: "/app/metas" })?.page).toBe("/app/metas");
    expect(cleanFeedback({ kind: "love", message: "great" })?.lang).toBe("es");
  });

  it("sends to FEEDBACK_TO, or the first tester email", () => {
    expect(feedbackRecipient()).toBeNull();
    process.env.CLARA_TESTER_EMAILS = "a@x.com, b@x.com";
    expect(feedbackRecipient()).toBe("a@x.com");
    process.env.FEEDBACK_TO = "team@x.com";
    expect(feedbackRecipient()).toBe("team@x.com");
  });
});
