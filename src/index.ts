export {
  checkDomain,
  checkEmail,
  isFreeEmailDomain,
  isRoleAccountLocalPart,
  normalizeDomain,
  summarizeEmailChecks,
  type DomainCheck,
  type EmailCheck,
  type EmailCheckSummary,
  type EmailInvalidReason,
  type EmailVerdict,
} from "./check.js";
export { FREE_EMAIL_DOMAINS, FREE_EMAIL_DOMAINS_SNAPSHOT_DATE } from "./free-domains.js";
export { parseEmailList, type ParsedEmailList } from "./parse.js";
export { ROLE_ACCOUNT_LOCAL_PARTS } from "./role-accounts.js";
