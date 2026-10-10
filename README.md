# @unifapi/email-filter

**Detect free email domains and split business emails from personal ones.** A
zero-dependency TypeScript package with the 4,768-domain free email provider
list that HubSpot forms block with "Block free email providers" — Gmail, Yahoo,
Outlook, Hotmail, iCloud, AOL, GMX, Mail.ru, QQ, and thousands of regional and
legacy providers — plus role-mailbox detection (`info@`, `sales@`, `noreply@`)
and a pragmatic syntax check.

[![npm](https://img.shields.io/npm/v/@unifapi/email-filter)](https://www.npmjs.com/package/@unifapi/email-filter)
[![license](https://img.shields.io/npm/l/@unifapi/email-filter)](./LICENSE)
[![free hosted API](https://img.shields.io/badge/hosted%20API-free%2C%200%20credits-16a34a)](https://unifapi.com/apis/email)

Built and maintained by [UnifAPI](https://unifapi.com) — the public-data API
and MCP server for AI agents. The same list and rules power UnifAPI's
[free email filter API](https://unifapi.com/apis/email) and the in-browser
[free email domain checker](https://unifapi.com/tools/free-email-domain-checker).

- Runs anywhere JavaScript runs: Node 18+, Bun, Deno, edge runtimes, browsers.
- No network calls, no DNS lookups — instant and private.
- Exact domain matching, so company subdomains are never flagged by accident.
- The raw list ships as JSON and plain text for any other language.

## Install

```bash
npm install @unifapi/email-filter
# pnpm add @unifapi/email-filter · yarn add @unifapi/email-filter · bun add @unifapi/email-filter
```

## Quick start

```ts
import { checkEmail, isFreeEmailDomain } from "@unifapi/email-filter";

checkEmail("Jane.Doe@Gmail.com");
// {
//   input: "Jane.Doe@Gmail.com",
//   email: "jane.doe@gmail.com",
//   local_part: "jane.doe",
//   domain: "gmail.com",
//   is_valid_syntax: true,
//   is_free_provider: true,
//   is_role_account: false,
//   verdict: "free",
//   invalid_reason: null
// }

checkEmail("sales@northwind.io").verdict; // "business" (and is_role_account: true)
checkEmail("jane@gmail").invalid_reason; // "invalid_domain"

isFreeEmailDomain("outlook.com"); // true
isFreeEmailDomain("mail.outlook.com"); // false — exact match only
```

### Block free email providers on a signup or lead form

```ts
import { checkEmail } from "@unifapi/email-filter";

export function validateWorkEmail(address: string): string | null {
  const check = checkEmail(address);
  if (check.verdict === "invalid") return "Enter a valid email address.";
  if (check.verdict === "free") return "Please use your work email.";
  return null; // business address
}
```

### Clean a lead list or CRM export

```ts
import { checkEmail, parseEmailList, summarizeEmailChecks } from "@unifapi/email-filter";

const { entries } = parseEmailList(csvText); // pulls addresses out of any pasted text
const checks = entries.map(checkEmail);

const business = checks.filter((c) => c.verdict === "business").map((c) => c.email);
console.log(summarizeEmailChecks(checks));
// → { total, business, free, invalid, role_accounts }
```

## API

| Function                            | Returns                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkEmail(address)`               | `EmailCheck` — `verdict` (`business` · `free` · `invalid`), normalized `email`, `domain`, `is_free_provider`, `is_role_account`, `invalid_reason` |
| `checkDomain(domain)`               | `DomainCheck` — accepts `acme.io`, `@acme.io`, a full address, or a website URL                                                                   |
| `isFreeEmailDomain(domain)`         | `boolean` — exact, case-insensitive match against the list                                                                                        |
| `isRoleAccountLocalPart(localPart)` | `boolean` — `info`, `sales`, `support`, `noreply`, … (`+tags` ignored)                                                                            |
| `normalizeDomain(domain)`           | Lowercased, punycode (IDN) domain, or `null` if it is not a valid hostname                                                                        |
| `parseEmailList(text, limit?)`      | `{ entries, duplicates, truncated }` — addresses and domains from pasted text, CSV columns, or `Name <a@b.com>` headers                           |
| `summarizeEmailChecks(checks)`      | `{ total, business, free, invalid, role_accounts }`                                                                                               |
| `FREE_EMAIL_DOMAINS`                | The sorted list (`readonly string[]`)                                                                                                             |
| `FREE_EMAIL_DOMAINS_SNAPSHOT_DATE`  | Date of the list snapshot (`YYYY-MM-DD`)                                                                                                          |
| `ROLE_ACCOUNT_LOCAL_PARTS`          | The role-mailbox local parts                                                                                                                      |

`verdict: "business"` means **valid syntax and not on the free-provider list**.
It is a classification, not a deliverability check: no MX, SMTP, or mailbox
lookup is made.

## The free email domain list

The list is the CSV HubSpot publishes for its forms setting
[**Block free email providers**](https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature),
normalized (lowercased, de-duplicated, sorted). A `free` verdict here predicts
what that setting does with the same address.

| Group                   | Examples                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Global webmail          | `gmail.com`, `googlemail.com`, `yahoo.com`, `outlook.com`, `hotmail.com`, `icloud.com`, `aol.com`                     |
| Country variants        | 51 `yahoo.*`, 33 `outlook.*`, 24 `live.*`, 22 `hotmail.*` domains                                                     |
| Regional providers      | `web.de`, `gmx.de`, `t-online.de`, `orange.fr`, `libero.it`, `mail.ru`, `yandex.ru`, `qq.com`, `163.com`, `naver.com` |
| ISP mailboxes           | `comcast.net`, `att.net`, `verizon.net`, `btinternet.com`, `shaw.ca`, `bigpond.com`                                   |
| Privacy-focused         | `protonmail.com`, `duck.com`, `fastmail.com`, `hushmail.com`, `posteo.de`                                             |
| Legacy vanity domains   | 1,264 `mail2*.com` domains, `from*.com` and `city-of-*` portals                                                       |
| Some disposable inboxes | `mailinator.com`, `yopmail.com`, `maildrop.cc`                                                                        |

Known gaps: newer providers such as `proton.me`, `pm.me`, `tuta.com`, and
`hey.com` are not on the list, and it is not a complete disposable-email list
(`guerrillamail.com` is missing). Combine it with your own blocklist where
those matter.

Use the raw list from any language:

- [`data/free-email-domains.json`](./data/free-email-domains.json) — JSON array
- [`data/free-email-domains.txt`](./data/free-email-domains.txt) — one domain per line

```ts
import domains from "@unifapi/email-filter/free-email-domains.json" with { type: "json" };
```

Or page through it over HTTP with the hosted
[`GET /email/free-domains`](https://unifapi.com/apis/email/free-domains/get) endpoint.

## Free hosted API

Prefer an HTTP call — from a backend in another language, a no-code workflow,
or an AI agent? UnifAPI hosts the same checks as a
[free email filter API](https://unifapi.com/apis/email). Every call costs
**0 credits**; you only need a free [UnifAPI workspace key](https://api.unifapi.com/sign-in).

| Endpoint                                                                           | What it does                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------- |
| [`GET /email/check?email=`](https://unifapi.com/apis/email/check/get)              | Classify one address                        |
| [`POST /email/check/batch`](https://unifapi.com/apis/email/check/batch/post)       | Classify up to 1,000 addresses, with counts |
| [`GET /email/domains/{domain}`](https://unifapi.com/apis/email/domains/domain/get) | Classify a domain                           |
| [`GET /email/free-domains`](https://unifapi.com/apis/email/free-domains/get)       | Page through the list (`limit` up to 1,000) |

```bash
curl -s -X POST https://api.unifapi.com/email/check/batch \
  -H "Authorization: Bearer $UNIFAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"emails": ["jane@gmail.com", "sales@northwind.io"]}'
```

Full reference: [docs.unifapi.com](https://docs.unifapi.com).

### For AI agents (MCP)

Connect Claude, ChatGPT, Cursor, Codex, or any MCP client to
`https://mcp.unifapi.com` ([setup guide](https://unifapi.com/mcp)) and ask:

> Check which of these leads use free email providers and return only the business addresses.

The agent finds the email operations with `list_operations` and runs them with
`call_api` — alongside the rest of UnifAPI's public-data catalog: SERP and
keyword data, AI-answer visibility, X/Twitter, YouTube, TikTok, Instagram,
LinkedIn, Reddit, and more. Browse it at [unifapi.com/apis](https://unifapi.com/apis).

### No code at all

Paste up to 10,000 emails into the
[free email domain checker](https://unifapi.com/tools/free-email-domain-checker):
it runs this package in your browser, splits business from free-provider
addresses, and exports a CSV.

## FAQ

**What is a free email domain?**
A domain anyone can sign up on for a personal mailbox, such as `gmail.com` or
`yahoo.com`, as opposed to a company's own domain. B2B teams block or route
free-domain signups to keep demo requests and gated content tied to companies.

**Is this the same list HubSpot uses?**
Yes — it is compiled from the CSV HubSpot links from its "Block free email
providers" help article, with the snapshot date in
`FREE_EMAIL_DOMAINS_SNAPSHOT_DATE`. This package is not affiliated with HubSpot.

**Does it verify that an address exists?**
No. It classifies addresses without network calls. Pair it with an MX/SMTP
verifier if you need deliverability.

**Are subdomains matched?**
No, matching is exact. `berlin.de` is on the list; `senate.berlin.de` is not
treated as free. That keeps company and government subdomains out of the free
bucket.

**Why flag role mailboxes?**
`info@`, `sales@`, `support@`, and `noreply@` are shared inboxes, not people.
They stay `business`, but most teams score and route them differently.

**Can I use it in the browser?**
Yes. It has no dependencies and no Node-only APIs. The list adds about 25 KB
gzipped, so load it lazily (`await import("@unifapi/email-filter")`) on pages
that only need it after user input.

## Learn more

- [Block free email domains on B2B forms](https://unifapi.com/blog/block-free-email-domains) — what the list covers, where it misfires, and how to roll it out
- [Free email filter API](https://unifapi.com/apis/email) — the hosted endpoints, free
- [Free email domain checker](https://unifapi.com/tools/free-email-domain-checker) — the browser tool
- [UnifAPI MCP server](https://unifapi.com/mcp) — give your agent this and 200+ public-data operations
- [UnifAPI SDKs](https://github.com/unifapi-agent) — typed clients for TypeScript, Python, Go, Java, C#, PHP, Ruby, and Swift

## Contributing

The source of truth lives in the UnifAPI monorepo and is mirrored here on each
release. Issues and pull requests are welcome; to propose list changes, open an
issue with the domain and a link showing it offers free personal mailboxes.

## License

[MIT](./LICENSE) © [UnifAPI](https://unifapi.com). The domain list is compiled
from HubSpot's published free email domain CSV; UnifAPI is not affiliated with
HubSpot.
