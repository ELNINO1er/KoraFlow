import { describe, expect, it } from "vitest";
import { adminPageHref, pagination, parseAdminQuery } from "./query";
import { newAdminSchema, sensitiveConfirmationSchema } from "./validation";

describe("admin filters", () => {
  it("rejects arrays, invalid dates and unsafe page numbers", () => {
    const parsed = parseAdminQuery({ q: ["a", "b"], page: "Infinity", from: "2026-02-30", to: "2026-10-17" });
    expect(parsed.q).toBe("");
    expect(parsed.page).toBe(1);
    expect(parsed.from).toBe("");
    expect(parsed.to).toBe("2026-10-17");
    expect(parseAdminQuery({ page: "-1" }).page).toBe(1);
    expect(parseAdminQuery({ page: "999999999999999999999999" }).page).toBe(1);
  });
  it("bounds pagination and retains all filters when navigating", () => {
    expect(pagination(26, 500)).toMatchObject({ page: 2, pages: 2, skip: 25, take: 25 });
    expect(pagination(0, 1)).toMatchObject({ page: 1, pages: 1, skip: 0 });
    const url = new URL(adminPageHref("/admin/audit", { actor: "a+b@test.local", organization: "ABC & co", action: "platform.admin_granted", from: "2026-10-01" }, 2), "https://example.test");
    expect(url.searchParams.get("actor")).toBe("a+b@test.local");
    expect(url.searchParams.get("organization")).toBe("ABC & co");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("from")).toBe("2026-10-01");
  });
  it("requires a password and a meaningful reason for sensitive actions", () => {
    expect(sensitiveConfirmationSchema.safeParse({ password: "", reason: "test" }).success).toBe(false);
    expect(sensitiveConfirmationSchema.safeParse({ password: "operator-password", reason: "     " }).success).toBe(false);
    expect(sensitiveConfirmationSchema.safeParse({ password: "operator-password", reason: "Nouvelle équipe support" }).success).toBe(true);
  });
  it("rejects weak new-admin passwords and invalid addresses", () => {
    expect(newAdminSchema.safeParse({ name: "Test", email: "bad", initialPassword: "short" }).success).toBe(false);
    expect(newAdminSchema.parse({ name: " Admin ", email: "ADMIN@example.test", initialPassword: "a-long-password-2026" }).email).toBe("admin@example.test");
  });
});
