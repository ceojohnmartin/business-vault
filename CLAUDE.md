# RALLY — Architecture Decisions and Constraints

**This file is the durable source of truth for architecture decisions that have been
explicitly locked. Read it before recommending or implementing any architecture change.**

Items marked **LOCKED** are constraints. Do not reinterpret them, work around them, or
treat them as suggestions. If a requested implementation conflicts with one, stop and say
so before writing code.

This file records **decisions, not brainstorming.** Nothing speculative belongs here.

---

## 1. Product structure

There are two products.

**RALLY** — the rep-facing door-to-door sales application. This is what is being built now.

**RALLY OS** — the company operating system and canonical system of record. Built later.

Future clients may include RALLY Sales, RALLY Technician, RALLY Office/Admin,
RALLY Manager, and a Customer Portal. **All of them ultimately use the same RALLY-owned
backend and domain model.**

RALLY OS does not need to be fully built now. RALLY development continues first, while
preserving the architecture RALLY OS will need later.

---

## 2. Canonical data and identity

**LOCKED — RALLY-owned IDs are canonical. External system identifiers are references only.**

- FieldRoutes customer IDs are external references.
- FieldRoutes `paymentProfileID`s are external references.
- Payment-provider customer and payment-method IDs are external references.

**Never redefine a core RALLY entity around an external provider ID.**

---

## 3. RALLY ↔ RALLY OS boundary

**LOCKED — RALLY is a client. The RALLY-owned backend (future RALLY OS) is the authority
for company-domain and financial logic.**

RALLY clients may:

- submit intents,
- display read models,
- work offline where appropriate.

RALLY clients must **not** independently author financial truth. **Financial logic does not
belong in the PWA.**

Displayed financial values — balance, last payment, next bill, payment status, past-due
status — come from backend-authored financial state and read models.

---

## 4. FieldRoutes boundary

**LOCKED — FieldRoutes is a benchmark and a legacy-migration reference. It is NOT part of
RALLY or RALLY OS's future architecture.**

RALLY OS should ultimately replace the need for FieldRoutes entirely.

### FieldRoutes may be studied for

- product inspiration
- pest-control workflow ideas
- UI/UX patterns
- reporting concepts
- routing and scheduling concepts
- billing workflow concepts
- technician workflows
- customer and service structure
- migration and reference purposes

### FieldRoutes is NOT

- a permanent billing system
- a permanent CRM
- a required integration dependency
- the canonical customer system
- the canonical payment system
- a source of truth for RALLY OS
- something we must preserve compatibility with forever

**LOCKED — Do not design RALLY or RALLY OS around FieldRoutes.**

### Research rule

Study FieldRoutes only to answer:

- *What workflow or feature should RALLY / RALLY OS have?*
- *How do we improve on what established pest-control software does?*
- *What will we need to migrate away from later?*

**Do NOT ask:** how RALLY fits into FieldRoutes, how to make FieldRoutes consume our
payment tokens, how to reuse their system as a bridge, or how to structure RALLY around
them. **That loop is closed.**

### If an integration is ever built anyway

Should a migration or transition ever require touching FieldRoutes, it belongs
**server-side as an adapter** — never in a client, never in the domain model. Its IDs stay
`externalRefs`, never entity identity, and financial truth is never duplicated across the
boundary.

**LOCKED — Exactly ONE system may own recurring billing for a given billing account or
subscription at a time.** This applies to any external biller, FieldRoutes included: never
allow two systems to independently charge the same billing obligation.

---

## 5. Payment and billing architecture

**LOCKED — RALLY OS owns the complete billing lifecycle from day one.** Not eventually,
not after a transition — from the first production billing customer.

**The payment question for new RALLY OS customers is: "What DIRECT payment provider should
RALLY OS use from day one?"** It is not "how do we fit into someone else's payment stack."

FieldRoutes must never own billing schedules, invoices, autopay logic, balances, retries,
credits, refunds, collections, or the financial ledger. FieldRoutes payment and gateway
research is relevant **only** if and when existing customers or payment methods need
migrating out of it — and that must not block or shape the architecture for new customers.

**RALLY / RALLY OS owns:** customers, agreements, service plans, billing schedules,
invoices, line items, discounts, credits, refunds, charge instructions, payment status,
balances, retries and dunning, past-due state, collections, cancellations and outstanding
balances, financial history, revenue reporting.

**Payment infrastructure owns:** secure credential capture, raw card and bank credentials,
vault and tokenization, authorization and capture, movement of funds, payment-network
interaction.

### Preferred shape

```
RALLY client
  → provider-hosted secure payment capture
  → payment provider vault
  → safe payment reference
  → RALLY-owned backend
  → billing schedule / invoice / charge instruction
  → processor
  → result / webhook
  → immutable RALLY financial event
```

### LOCKED — the raw-credential invariant (Interpretation B)

**RALLY must NEVER intentionally capture, transmit or persist raw payment credentials
through any payment-specific or structured application path.**

Raw payment credentials are:

- full PAN / card number
- CVV / CVC
- payment-card expiry, where it is part of credential storage
- ACH routing number
- ACH account number

They must not exist in:

- structured customer payment records
- IndexedDB payment / customer credential structures
- sync payloads
- Supabase customer payment objects
- outbox payloads
- dead-letter payloads
- backups
- logs
- debug output
- payment-specific server records

**This is a statement about RALLY's payment paths, not a promise about arbitrary human
text.** RALLY cannot guarantee that a person will never type a digit sequence into a free
text box, and pretending otherwise would be an impossible absolute. What it guarantees is
that no payment-entry surface, structured payment field, payment-shaped storage, or
payment sync path in RALLY is capable of holding a credential.

**Free-text fields are not payment-entry surfaces.** Notes, addresses and names are
customer-record text, and no RALLY code reads them as payment data. The corresponding
control is an operating rule, not a scanner:

> **Operating rule for reps — never type a card number, CVV, expiry, bank routing number
> or bank account number into any RALLY notes box or any other free-text field. RALLY has
> no payment-credential field on purpose. Payment credentials are collected by the office,
> and will later be collected inside RALLY through a provider-hosted secure component.**

**Do not build a DLP / card-number scanner across every free-text field.** Structured
payment protections must not be weakened to compensate.

### LOCKED — future door-side payment capture

Door-side payment capture WILL return, and it is core product vision. The rep or the
customer will enter card or ACH details **inside RALLY**, so the experience stays native
to RALLY, through a provider-hosted secure component (Stripe, Adyen, or whichever DIRECT
provider is later approved):

```
RALLY payment screen
  → provider-hosted secure field
  → provider vault / tokenization
  → RALLY receives only a safe token/reference + approved metadata
```

**RALLY itself never owns the raw credential** — not before that integration, and not
after it. v39 deliberately has NO raw credential capture at all, because the hosted
integration does not exist yet. **Do not implement Stripe or Adyen now**; no provider may
be selected or implemented without explicit approval (§10).

**LOCKED — Do not design long-term billing around FieldRoutes.**

**LOCKED PRINCIPLE — FieldRoutes = inspiration and legacy-migration reference.
RALLY + RALLY OS = our product. Do not confuse those roles.**

**LOCKED — Do not add extra payment vendors unless they solve a material problem a simpler
architecture cannot.** Preferred long-term vendor shape:

```
RALLY OS → one primary payment provider → card / ACH networks
```

---

## 6. Billing design rules

**All LOCKED.**

1. **Money is stored as integer minor units plus currency.**
2. **The financial ledger is append-only.**
3. **Financial truth is server-authored.**
4. **Devices submit intents; the server records facts.**
5. **Every money-moving operation uses idempotency.**
6. **Payment methods are separate entities, namespaced by provider.**
7. **Billing schedules are persisted records**, not formulas recomputed from current UI state.
8. **Billing uses one authoritative timezone and date policy.**

Additional locked rules:

- **Never use a mutable `customer.balance` as the source of financial truth.** Balance is
  derived from immutable financial entries.
- **Corrections happen through reversing or adjusting entries, never by rewriting financial
  history.**
- **Billing actions go through server-side domain functions.** Do not perform money-moving
  operations through direct client PostgREST table writes.
- **Do not create a speculative multi-processor abstraction layer** before there are
  actually multiple processors.

---

## 7. Security rules

**LOCKED — Never expose secrets in backups, logs, source control, reports, test output, or
responses.**

Backup behavior must continue to exclude:

- `frKey`
- `frToken`
- `regridKey`
- `googleKey`
- `googleSessions`
- raw card credentials
- raw ACH credentials
- authentication tokens and secrets

**Legacy backups must not be able to restore excluded secrets or payment credentials.**

**RALLY captures no CVV/CVC and must not begin persisting it.**

The raw-credential invariant is stated in full in §5 (Interpretation B): RALLY never
intentionally captures, transmits or persists raw payment credentials through any
payment-specific or structured path. Free-text fields are not payment-entry surfaces, and
the control there is the rep operating rule in §5 rather than a content scanner.

Provider-hosted capture is the permanent answer: raw financial credentials go to the
provider's secure component and vault, and RALLY receives only a safe token/reference plus
approved metadata.

**Protected-characteristic vendor fields such as ethnicity are never stored or exposed by
RALLY.** Future vendor proxies use explicit field allowlists rather than forwarding full
vendor responses.

---

## 8. Tenancy, team, and membership model

**Current `team_id` is safe and remains the permanent innermost scope.** Existing data
tables may continue using `(team_id, id)`.

**The primary key structure is NOT the blocker for RALLY OS.**

### Future hierarchy

```
organization → branch / office → team → scoped memberships
```

### The actual future limitation

- `profiles.team_id` is currently **scalar**.
- `profiles.role` is currently **global**.

### Future target concept

```
organizations
branches
teams
memberships(user_id, scope_type, scope_id, role)
    scope_type ∈ { org, branch, team }
```

Users may eventually hold different roles at different scopes. The current
`rep` / `leader` / `manager` / `owner` values survive as membership-role values.

`my_team_id()` may eventually become a set-based `my_team_ids()` model.
**Do not implement that yet.**

The following may remain as they are:

- `team_id` data columns
- sync `on_conflict=(team_id,id)`
- team pull filtering
- team realtime topics

---

## 9. Future triggers

### Second-company trigger

**If a SECOND independent company or tenant is onboarded before the organization model
exists: STOP.**

Do not simply represent the second company as another team. That event is what requires
introducing the organization tenancy layer.

### Billing trigger

When RALLY billing implementation begins, revisit:

- scoped memberships,
- the domain-function boundary,
- server-authored financial data,
- the `my_team_ids()` transition.

**Do not perform those migrations merely because they are theoretically useful.**

---

## 10. Current status

- **RALLY v38 is live.**
- Phases 0–3 are complete and untouched.
- Phase 4 is architecture / provider selection and account-specific evidence gathering.
- Phase 5 is not started.
- Phase 6 is not started.
- No RALLY OS UI has been built.
- No financial tables have been built.
- No production payment provider has been selected.
- No production payment integration has been implemented.
- No FieldRoutes production integration has been implemented, and none is planned.
- No schema or RLS tenancy redesign has been approved.

**Next payment work:** a focused comparison of DIRECT payment providers for RALLY OS.
Not another FieldRoutes sweep — that research loop is closed. Criteria: secure hosted card
capture, ACH, tokenization/vault, saved payment methods, server-initiated card-on-file
charges, refunds, webhooks, idempotency, card/account updater, migration and export rights,
pricing, recurring pest-control suitability, vanilla-JS/PWA compatibility, minimal vendor
layers, ability to scale with RALLY OS. **No provider may be selected or implemented
without explicit approval.**

---

## 11. Rules for future Claude sessions

**Read this file before recommending or implementing architecture changes.**

- Treat items marked **LOCKED** as constraints unless explicitly overridden by the owner.
- **Do not silently reinterpret an existing decision.**
- If a requested implementation conflicts with a locked decision, **stop and point out the
  conflict before writing code.**
- Always distinguish: **confirmed fact / inference / vendor claim / pending vendor
  confirmation.**
- **Do not present public API capability as contractual permission.**
- **Do not broaden scope without approval.**

Major architecture recommendations must preserve:

- RALLY-owned canonical identity,
- RALLY OS as system of record,
- provider independence where practical,
- server-authoritative financial truth,
- offline safety,
- RLS isolation,
- migration safety.
