import { FREE_EMAIL_DOMAINS } from "./free-domains.js";
import { ROLE_ACCOUNT_LOCAL_PARTS } from "./role-accounts.js";

/**
 * `business` means the domain is valid and NOT on the free-provider list. It is
 * a classification, not a deliverability or ownership check: no DNS, SMTP, or
 * mailbox probe runs.
 */
export type EmailVerdict = "business" | "free" | "invalid";

export type EmailInvalidReason =
  | "empty"
  | "missing_at_sign"
  | "invalid_local_part"
  | "invalid_domain"
  | "too_long";

export interface EmailCheck {
  /** The address as received, trimmed. */
  input: string;
  /** Lowercased address; `null` when the syntax is invalid. */
  email: string | null;
  local_part: string | null;
  /** Lowercased ASCII (punycode) domain; `null` when the syntax is invalid. */
  domain: string | null;
  is_valid_syntax: boolean;
  /** Domain is on the free email provider list; `null` when the syntax is invalid. */
  is_free_provider: boolean | null;
  /** Local part is a shared/role mailbox (`sales@`, `support@`); `null` when invalid. */
  is_role_account: boolean | null;
  verdict: EmailVerdict;
  invalid_reason: EmailInvalidReason | null;
}

export interface DomainCheck {
  /** The domain as received, trimmed. */
  input: string;
  /** Lowercased ASCII (punycode) domain; `null` when it is not a valid domain. */
  domain: string | null;
  is_valid_domain: boolean;
  /** Domain is on the free email provider list; `null` when it is not a valid domain. */
  is_free_provider: boolean | null;
  verdict: EmailVerdict;
}

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;

// RFC 5322 dot-atom: the unquoted local parts real forms accept. Quoted local
// parts ("john doe"@x.com) are legal but vanishingly rare and treated as invalid.
const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TOP_LEVEL_LABEL = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

let freeDomainSet: ReadonlySet<string> | undefined;
let roleLocalPartSet: ReadonlySet<string> | undefined;

/** Exact-match lookup: subdomains of a listed domain are not treated as free. */
export function isFreeEmailDomain(domain: string): boolean {
  freeDomainSet ??= new Set(FREE_EMAIL_DOMAINS);
  return freeDomainSet.has(domain.trim().toLowerCase().replace(/\.$/, ""));
}

export function isRoleAccountLocalPart(localPart: string): boolean {
  roleLocalPartSet ??= new Set(ROLE_ACCOUNT_LOCAL_PARTS);
  return roleLocalPartSet.has(localPart.toLowerCase().split("+", 1)[0]);
}

/**
 * Lowercase a domain, drop a trailing root dot, and convert internationalized
 * names to punycode. Returns `null` when the result is not a syntactically
 * valid hostname with at least two labels.
 */
export function normalizeDomain(raw: string): string | null {
  let domain = raw.trim().toLowerCase().replace(/\.$/, "");
  if (!domain) return null;
  if ([...domain].some((char) => char.charCodeAt(0) > 0x7f)) {
    try {
      domain = new URL(`http://${domain}`).hostname;
    } catch {
      return null;
    }
  }
  if (domain.length > MAX_DOMAIN_LENGTH) return null;
  const labels = domain.split(".");
  if (labels.length < 2) return null;
  if (!labels.every((label) => DOMAIN_LABEL.test(label))) return null;
  return TOP_LEVEL_LABEL.test(labels[labels.length - 1]) ? domain : null;
}

function invalidEmail(input: string, reason: EmailInvalidReason): EmailCheck {
  return {
    input,
    email: null,
    local_part: null,
    domain: null,
    is_valid_syntax: false,
    is_free_provider: null,
    is_role_account: null,
    verdict: "invalid",
    invalid_reason: reason,
  };
}

/** Classify one email address as business, free-provider, or invalid. */
export function checkEmail(raw: string): EmailCheck {
  const input = raw.trim();
  if (!input) return invalidEmail(input, "empty");
  if (input.length > MAX_EMAIL_LENGTH) return invalidEmail(input, "too_long");

  const at = input.lastIndexOf("@");
  if (at === -1) return invalidEmail(input, "missing_at_sign");

  const localPart = input.slice(0, at);
  if (
    !localPart ||
    localPart.length > MAX_LOCAL_PART_LENGTH ||
    localPart.includes("@") ||
    !LOCAL_PART.test(localPart)
  ) {
    return invalidEmail(input, "invalid_local_part");
  }

  const domain = normalizeDomain(input.slice(at + 1));
  if (!domain) return invalidEmail(input, "invalid_domain");

  const normalizedLocal = localPart.toLowerCase();
  const isFree = isFreeEmailDomain(domain);
  return {
    input,
    email: `${normalizedLocal}@${domain}`,
    local_part: normalizedLocal,
    domain,
    is_valid_syntax: true,
    is_free_provider: isFree,
    is_role_account: isRoleAccountLocalPart(normalizedLocal),
    verdict: isFree ? "free" : "business",
    invalid_reason: null,
  };
}

/**
 * Classify a bare domain. Tolerates what people paste for one: a leading `@`,
 * a full address (the part after the last `@` is used), or a website URL
 * (scheme, `www.`, port, and path are dropped).
 */
export function checkDomain(raw: string): DomainCheck {
  const input = raw.trim();
  let candidate = input.slice(input.lastIndexOf("@") + 1);
  candidate = candidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/[/?#:].*$/, "");
  candidate = candidate.replace(/^www\./i, "");
  const domain = normalizeDomain(candidate);
  if (!domain) {
    return {
      input,
      domain: null,
      is_valid_domain: false,
      is_free_provider: null,
      verdict: "invalid",
    };
  }
  const isFree = isFreeEmailDomain(domain);
  return {
    input,
    domain,
    is_valid_domain: true,
    is_free_provider: isFree,
    verdict: isFree ? "free" : "business",
  };
}

export interface EmailCheckSummary {
  total: number;
  business: number;
  free: number;
  invalid: number;
  role_accounts: number;
}

/** Verdict counts for a batch of checks. */
export function summarizeEmailChecks(
  checks: readonly Pick<EmailCheck, "verdict" | "is_role_account">[],
): EmailCheckSummary {
  const summary: EmailCheckSummary = {
    total: checks.length,
    business: 0,
    free: 0,
    invalid: 0,
    role_accounts: 0,
  };
  for (const check of checks) {
    summary[check.verdict] += 1;
    if (check.is_role_account) summary.role_accounts += 1;
  }
  return summary;
}
