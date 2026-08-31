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

**LOCKED — FieldRoutes is transitional external infrastructure. It is not the foundation of
the RALLY domain model, and long term it must be optional.**

- FieldRoutes integration belongs **server-side, as an adapter**.
- RALLY clients must not each independently implement FieldRoutes business rules.
- RALLY OS is canonical and pushes or receives projections through the adapter.
- FieldRoutes IDs remain `externalRefs`, never entity identity.
- **Do not duplicate financial truth between RALLY OS and FieldRoutes.**

**LOCKED — Exactly ONE system may own recurring billing for a given billing account or
subscription at a time.** Never allow RALLY OS and FieldRoutes autopay to independently
charge the same billing obligation.

---

## 5. Payment and billing architecture

RALLY OS owns the complete billing lifecycle from the beginning of the production RALLY
billing architecture.

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

**LOCKED — RALLY does not persist raw PAN, CVV/CVC, or raw bank credentials in the
permanent architecture.**

**LOCKED — Do not design long-term billing around FieldRoutes.**

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

Provider-hosted payment capture is preferred so raw financial credentials avoid normal
RALLY persistence.

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
- No FieldRoutes production integration has been implemented.
- No schema or RLS tenancy redesign has been approved.

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
