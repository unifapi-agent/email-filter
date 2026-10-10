import { describe, expect, it } from "vitest";

import {
  checkDomain,
  checkEmail,
  isFreeEmailDomain,
  isRoleAccountLocalPart,
  normalizeDomain,
  summarizeEmailChecks,
} from "./check.js";
import { FREE_EMAIL_DOMAINS } from "./free-domains.js";
import { parseEmailList } from "./parse.js";

describe("free email domain list", () => {
  it("is sorted, lowercase, and unique", () => {
    expect(FREE_EMAIL_DOMAINS.length).toBe(4768);
    expect([...FREE_EMAIL_DOMAINS]).toEqual([...new Set(FREE_EMAIL_DOMAINS)].sort());
    for (const domain of FREE_EMAIL_DOMAINS) {
      expect(normalizeDomain(domain), domain).toBe(domain);
    }
  });

  it("covers the major consumer providers", () => {
    for (const domain of ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "qq.com"]) {
      expect(isFreeEmailDomain(domain), domain).toBe(true);
    }
  });

  it("matches exact domains only", () => {
    expect(isFreeEmailDomain("GMAIL.com.")).toBe(true);
    expect(isFreeEmailDomain("mail.gmail.com")).toBe(false);
    expect(isFreeEmailDomain("senate.berlin.de")).toBe(false);
    expect(isFreeEmailDomain("berlin.de")).toBe(true);
  });
});

describe("checkEmail", () => {
  it("classifies a free-provider address", () => {
    expect(checkEmail("  Jane.Doe+news@Gmail.com ")).toEqual({
      input: "Jane.Doe+news@Gmail.com",
      email: "jane.doe+news@gmail.com",
      local_part: "jane.doe+news",
      domain: "gmail.com",
      is_valid_syntax: true,
      is_free_provider: true,
      is_role_account: false,
      verdict: "free",
      invalid_reason: null,
    });
  });

  it("classifies a business address and flags role mailboxes", () => {
    expect(checkEmail("sales@acme.io")).toMatchObject({
      verdict: "business",
      is_free_provider: false,
      is_role_account: true,
    });
    expect(checkEmail("support+eu@acme.io").is_role_account).toBe(true);
    expect(checkEmail("jane@acme.io").is_role_account).toBe(false);
  });

  it("converts internationalized domains to punycode", () => {
    expect(checkEmail("hans@münchen.de")).toMatchObject({
      domain: "xn--mnchen-3ya.de",
      verdict: "business",
    });
  });

  it.each([
    ["", "empty"],
    ["jane.acme.io", "missing_at_sign"],
    ["@acme.io", "invalid_local_part"],
    [".jane@acme.io", "invalid_local_part"],
    ["jane..doe@acme.io", "invalid_local_part"],
    ["jane@doe@acme.io", "invalid_local_part"],
    ["jane@acme", "invalid_domain"],
    ["jane@-acme.io", "invalid_domain"],
    ["jane@acme.io:80", "invalid_domain"],
    ["jane@acme.1", "invalid_domain"],
    [`${"a".repeat(65)}@acme.io`, "invalid_local_part"],
    [`jane@${"a".repeat(250)}.io`, "too_long"],
  ] as const)("rejects %j as %s", (input, reason) => {
    expect(checkEmail(input)).toMatchObject({
      is_valid_syntax: false,
      verdict: "invalid",
      invalid_reason: reason,
      email: null,
      domain: null,
      is_free_provider: null,
      is_role_account: null,
    });
  });
});

describe("checkDomain", () => {
  it.each([
    ["outlook.com", "outlook.com", "free"],
    ["@Yahoo.com", "yahoo.com", "free"],
    ["jane@hotmail.co.uk", "hotmail.co.uk", "free"],
    ["https://www.acme.io/about?x=1", "acme.io", "business"],
    ["acme.io:8443", "acme.io", "business"],
  ] as const)("normalizes %j to %s (%s)", (input, domain, verdict) => {
    expect(checkDomain(input)).toMatchObject({ domain, verdict, is_valid_domain: true });
  });

  it("rejects strings that are not domains", () => {
    expect(checkDomain("localhost")).toMatchObject({
      domain: null,
      is_valid_domain: false,
      is_free_provider: null,
      verdict: "invalid",
    });
  });
});

describe("isRoleAccountLocalPart", () => {
  it("ignores case and plus tags", () => {
    expect(isRoleAccountLocalPart("Info")).toBe(true);
    expect(isRoleAccountLocalPart("noreply+bounce")).toBe(true);
    expect(isRoleAccountLocalPart("information.desk")).toBe(false);
  });
});

describe("summarizeEmailChecks", () => {
  it("counts verdicts and role mailboxes", () => {
    const checks = ["jane@gmail.com", "info@acme.io", "bob@acme.io", "nope"].map(checkEmail);
    expect(summarizeEmailChecks(checks)).toEqual({
      total: 4,
      business: 2,
      free: 1,
      invalid: 1,
      role_accounts: 1,
    });
  });
});

describe("parseEmailList", () => {
  it("extracts addresses and domains from mixed pasted text", () => {
    const text = [
      "Jane Doe <jane@acme.io>, bob@gmail.com; mailto:Info@Acme.io",
      "name,email,company",
      "Sam,sam@yahoo.com,acme.io",
      "JANE@acme.io",
      '"lee@outlook.com".',
    ].join("\n");
    expect(parseEmailList(text)).toEqual({
      entries: [
        "jane@acme.io",
        "bob@gmail.com",
        "Info@Acme.io",
        "sam@yahoo.com",
        "acme.io",
        "lee@outlook.com",
      ],
      duplicates: 1,
      truncated: false,
    });
  });

  it("caps the number of unique entries", () => {
    expect(parseEmailList("a@x.io b@x.io c@x.io a@x.io", 2)).toEqual({
      entries: ["a@x.io", "b@x.io"],
      duplicates: 1,
      truncated: true,
    });
  });
});
