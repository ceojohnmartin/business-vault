/* RALLY — the service agreement engine.
   Generates a complete, state-neutral residential pest control service
   agreement from the chosen plan + pricing, modeled on the converged
   industry skeleton (Hawx / Aptive / Fox / EnviroGuard) but with the
   terms regulators keep attacking fixed on purpose:
     · the term, renewal and exit fee are disclosed in a bold box on page 1
     · the early-exit fee is the INITIAL DISCOUNT RECAPTURED (capped) —
       not a flat penalty — and is auto-waived in the cooling-off window
     · the FTC 16 CFR 429 cooling-off statement sits above the signature,
       with TWO completed Notice of Cancellation forms attached
     · month-to-month after the initial term, never a silent full-year re-up
   Company identity comes from Settings so one build works in any market.
   NOTE FOR THE OFFICE: have a licensed attorney in your operating state
   review this template before real customers sign it. */
(function () {
  const { esc, fmtMoney } = MUI;
  const A = MDATA.AGREEMENT;

  const co = () => {
    const s = STORE.settings;
    return {
      name: s.companyName || "____________________ (Company)",
      phone: s.companyPhone || "____________",
      email: s.companyEmail || "____________",
      address: s.companyAddress || "________________________________",
      license: s.companyLicense || "",
    };
  };

  // Third business day after signing (16 CFR 429 — weekends skipped;
  // if a federal holiday lands in the window the customer only gains time).
  function noticeDate(ts) {
    const d = new Date(ts);
    let added = 0;
    while (added < 3) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) added++;
    }
    return d;
  }

  const fmtD = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  function planFor(c) {
    return (c.plan && MDATA.PLANS.find((p) => p.id === c.plan.id)) || MDATA.PLANS[1];
  }

  function pricing(c) {
    const p = planFor(c);
    const specI = (c.specialty || []).reduce((t, sv) => t + (Number(sv.initial) || 0), 0);
    const specM = (c.specialty || []).reduce((t, sv) => t + (Number(sv.monthly) || 0), 0);
    const initial = ((c.plan && c.plan.initial != null) ? c.plan.initial : p.initial) + specI;
    const monthly = ((c.plan && c.plan.monthly != null) ? c.plan.monthly : p.monthly) + specM;
    // a rep may quote above list; the printed arithmetic must always add
    // up (list − discount = amount due), so list floats up to the quote
    const list = Math.max((p.listInitial || p.initial) + specI, initial);
    const discount = Math.max(0, list - initial);
    const etf = Math.min(discount, A.etfCap);
    // the term is the customer's, 24 by default; a signed agreement's term
    // is frozen at signing and never drifts with today's defaults
    const term = (c.agreement && c.agreement.termMonths) || c.termMonths || MDATA.DEFAULT_TERM;
    const bill = MDATA.BILLING.find((b) => b.id === c.billing) || MDATA.BILLING[0];
    const perCharge = monthly * bill.mult;
    return { p, initial, monthly, list, discount, etf, term, bill, perCharge, specI, specM };
  }

  function addrLine(c) {
    return STORE.custAddress(c) || "________________________________";
  }

  // ---------- the agreement body ----------
  function bodyHTML(c, sigDataUrl) {
    const C = co();
    const { p, initial, monthly, list, discount, etf, term, bill, perCharge } = pricing(c);
    const name = STORE.custName(c);
    const signedTs = (c.agreement && c.agreement.signedAt) ? new Date(c.agreement.signedAt).getTime() : Date.now();
    const today = new Date(signedTs);
    const cancelBy = noticeDate(signedTs);
    const phone = (c.phones && c.phones[0] && c.phones[0].n) || c.phone || "";
    const seasonNote = p.id === "premium"
      ? `<p class="note">Premium mosquito program: mosquito treatments are performed monthly during ${esc(A.mosquitoSeason)}; general pest treatments continue every other month year-round. In season, the home is visited every month.</p>`
      : "";

    const noc = (n) => `
      <div class="noc">
        <div class="noc-head">NOTICE OF CANCELLATION — Copy ${n}</div>
        <div class="noc-date">Date of transaction: <b>${fmtD(today)}</b></div>
        <p>You may CANCEL this transaction, without any Penalty or Obligation, within THREE BUSINESS DAYS from the above date.</p>
        <p>If you cancel, any property traded in, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within TEN BUSINESS DAYS following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be cancelled.</p>
        <p>If you cancel, you must make available to the seller at your residence, in substantially as good condition as when received, any goods delivered to you under this contract or sale, or you may, if you wish, comply with the instructions of the seller regarding the return shipment of the goods at the seller's expense and risk. If you do make the goods available to the seller and the seller does not pick them up within 20 days of the date of your notice of cancellation, you may retain or dispose of the goods without any further obligation. If you fail to make the goods available to the seller, or if you agree to return the goods to the seller and fail to do so, then you remain liable for performance of all obligations under the contract.</p>
        <p>To cancel this transaction, mail or deliver a signed and dated copy of this cancellation notice or any other written notice, or send a telegram, to <b>${esc(C.name)}</b>, at <b>${esc(C.address)}</b>${C.email !== "____________" ? ` (or by email to <b>${esc(C.email)}</b>)` : ""} NOT LATER THAN MIDNIGHT OF <b>${fmtD(cancelBy)}</b>.</p>
        <p>I hereby cancel this transaction.</p>
        <div class="noc-sign">
          <span>Date: ______________</span>
          <span>Buyer's signature: ____________________________</span>
        </div>
      </div>`;

    return `
      <div class="doc-head">
        <div class="doc-brand">${esc(C.name)}</div>
        <div class="doc-title">Residential Pest Control Service Agreement</div>
        <div class="doc-meta">
          ${esc(C.address)} · ${esc(C.phone)}${C.email !== "____________" ? " · " + esc(C.email) : ""}
          ${C.license ? `<br>License / registration no. ${esc(C.license)} — licensed and regulated by the structural pest control regulatory agency of the state where services are performed` : ""}
        </div>
      </div>

      <table class="doc-parties">
        <tr><td><b>Customer</b></td><td>${esc(name)}</td></tr>
        <tr><td><b>Service address</b></td><td>${esc(addrLine(c))}</td></tr>
        ${phone ? `<tr><td><b>Phone</b></td><td>${esc(phone)}</td></tr>` : ""}
        ${c.email ? `<tr><td><b>Email</b></td><td>${esc(c.email)}</td></tr>` : ""}
        <tr><td><b>Date</b></td><td>${fmtD(today)}</td></tr>
      </table>

      <div class="doc-box">
        <div class="doc-box-title">${esc(p.name)} Plan — ${esc(p.visits)}</div>
        <div class="doc-box-sub">${esc(p.blurb)}</div>
        <table class="doc-price">
          <tr><td>Initial service (standard price)</td><td class="r">${fmtMoney(list)}</td></tr>
          ${(c.specialty || []).map((sv) =>
            `<tr><td>Add-on — ${esc(sv.name)}</td><td class="r">${fmtMoney(sv.initial)} initial · ${fmtMoney(sv.monthly)}/mo</td></tr>`).join("")}
          <tr class="disc"><td>Initial service discount</td><td class="r">−${fmtMoney(discount)}</td></tr>
          <tr class="tot"><td>Initial service — due at first treatment</td><td class="r">${fmtMoney(initial)}</td></tr>
          <tr class="tot"><td>Recurring charge (billed ${bill.id === "monthly" ? "monthly" : fmtMoney(perCharge) + " every " + bill.every})</td><td class="r">${fmtMoney(monthly)}/mo</td></tr>
        </table>
        <div class="doc-box-key">
          <b>Initial term: ${term} months.</b> After that this Agreement continues
          <b>month-to-month</b> — either party may end it with ${A.renewNoticeDays} days' written notice.
          <b>If you cancel during the initial term</b>, you repay the initial-service discount you
          received, up to a maximum of ${fmtMoney(A.etfCap)} (${fmtMoney(etf)} at the pricing above).
          This fee is <b>never</b> charged if you cancel within 3 business days of signing.
        </div>
      </div>

      <ol class="doc-sections">
        <li><b>Term; automatic renewal.</b> The initial term of this Agreement is ${term} months from the date above. Upon expiration of the initial term, this Agreement automatically renews on a <b>month-to-month</b> basis. Either party may cancel the renewal at any time with at least ${A.renewNoticeDays} days' written notice (mail, email, or any written form). This Agreement never renews for another fixed term without your new, affirmative consent.</li>

        <li><b>Services; frequency; re-service guarantee.</b> Company will perform the treatments described for the ${esc(p.name)} plan: ${esc(p.services)} Covered pests: ${esc(p.covered)}. If covered pests persist or return <b>between</b> scheduled treatments, Company will return and re-treat at <b>no additional charge</b>, as many times as reasonably necessary — just call, text or email. Interior service is provided on request at any scheduled visit.</li>

        <li><b>Billing${payState(c) === "authorized" ? "; recurring payment authorization" : ""}.</b> The recurring charge above is billed ${bill.id === "monthly" ? "monthly" : "as " + fmtMoney(perCharge) + " every " + bill.every} and covers the full plan of service across the year, including re-services. ${billingClause(c)} A returned or failed payment may be re-presented and may incur a returned-payment fee of $25 where permitted by law. Company will give at least 10 days' notice before any charge that differs in amount or timing from this schedule. Customer may always pay by an alternative method on request.</li>

        <li><b>Early termination — discount recapture only.</b> If Customer cancels this Agreement during the initial term other than as permitted below, Customer repays the initial-service discount actually received, capped at ${fmtMoney(A.etfCap)} (${fmtMoney(etf)} under the pricing above). Payment of that amount is Company's <b>sole and exclusive remedy</b> for early termination — no other fee, penalty, or acceleration of remaining payments applies. The fee is <b>waived automatically</b> if: (a) Customer cancels within 3 business days of signing (see "Your right to cancel" below); (b) Company materially breaches this Agreement and does not cure within 10 days of written notice; (c) Customer moves outside Company's service area (proof of new address suffices); or (d) Customer cancels within ${A.priceExitDays} days after notice of a price increase under Section 5.</li>

        <li><b>Price changes.</b> Pricing is fixed for the initial term. During any renewal period, Company may adjust the recurring charge with at least ${A.priceNoticeDays} days' written notice. Customer may cancel without any fee within ${A.priceExitDays} days of the notice, and the old price applies until the cancellation takes effect.</li>

        <li><b>Limitations on services.</b> This Agreement covers only the pests listed for the selected plan. It does <b>not</b> include suppression, control, or prevention of ${esc(A.exclusions)}, unless separately contracted in writing.${(c.specialty || []).length ? ` The specialty add-on service${c.specialty.length === 1 ? "" : "s"} itemized in the pricing table above (${c.specialty.map((sv) => esc(sv.name)).join(", ")}) ${c.specialty.length === 1 ? "is" : "are"} separately contracted here and included in this Agreement at the add-on pricing shown.` : ""} Termite and other wood-destroying-organism work, where offered, is provided only under a separate agreement on the form and terms required by the applicable state regulator.</li>

        <li><b>Access; customer obligations.</b> Customer grants Company and its licensed applicators reasonable access to the exterior (and, on request, interior) of the property during normal service hours, and agrees to secure pets during service and to keep children and pets off treated areas until dry. Customer will inform Company of any known sensitivities or allergies before the first treatment.</li>

        <li><b>Late payments.</b> Amounts more than 30 days past due may accrue a late charge of the lesser of 1.5% per month or the maximum permitted by law, plus reasonable costs of collection where permitted. Company may pause scheduled services while an account is more than 60 days past due; pausing does not extend the term.</li>

        <li><b>Limitation of liability.</b> COMPANY'S LIABILITY UNDER THIS AGREEMENT IS LIMITED TO RE-PERFORMANCE OF THE AFFECTED SERVICE OR A REFUND OF THE AMOUNT PAID FOR IT, AT CUSTOMER'S ELECTION. COMPANY IS NOT LIABLE FOR INCIDENTAL OR CONSEQUENTIAL DAMAGES, OR FOR DAMAGE CAUSED BY PESTS, EXCEPT WHERE LIABILITY CANNOT BE LIMITED BY LAW. NOTHING IN THIS SECTION LIMITS CLAIMS FOR PERSONAL INJURY, GROSS NEGLIGENCE, OR WILLFUL MISCONDUCT, OR ANY RIGHT THAT APPLICABLE LAW MAKES NON-WAIVABLE.</li>

        <li><b>Assignment.</b> Company may assign this Agreement to a successor that assumes its obligations; Customer will be notified in writing of any assignment, as required by applicable law. Customer may not assign this Agreement except to a new owner or occupant of the service address with Company's consent, not unreasonably withheld.</li>

        <li><b>Notices.</b> Written notice to Company may be given by mail to the address above${C.email !== "____________" ? `, by email to ${esc(C.email)},` : ""} or by any written method Company makes available. Notice to Customer will be sent to the mailing or email address on file. Cancellation requests are effective when sent.</li>

        <li><b>Entire agreement; severability; governing law.</b> This document is the entire agreement between the parties and replaces any oral statements not written here. If any provision is unenforceable, the rest remains in effect. This Agreement is governed by the laws of the state where the service address is located, and any dispute will be brought in the courts (or small-claims court) of that state.</li>
      </ol>
      ${seasonNote}

      <div class="doc-disclosure">
        <b>Pesticide application disclosure.</b> All products applied are registered with the U.S.
        Environmental Protection Agency and are applied by trained, licensed applicators in accordance
        with the product label. Company is licensed and regulated by the structural pest control
        regulatory agency of the state where services are performed. A record of the materials applied
        at each service — product name, EPA registration number, and application details — is kept at
        Company's business address and is available to Customer on request. Keep children and pets off
        treated areas until dry. In case of suspected pesticide exposure, contact the national Poison
        Control Center at 1-800-222-1222.
      </div>

      <div class="doc-cancel">
        <b>YOUR RIGHT TO CANCEL:</b> YOU, THE BUYER, MAY CANCEL THIS TRANSACTION AT ANY TIME PRIOR TO
        MIDNIGHT OF THE THIRD BUSINESS DAY AFTER THE DATE OF THIS TRANSACTION
        (BY <b>${fmtD(cancelBy).toUpperCase()}</b>). SEE THE ATTACHED NOTICE OF CANCELLATION FORMS FOR
        AN EXPLANATION OF THIS RIGHT. IF YOU CANCEL IN THIS WINDOW, YOU OWE NOTHING — NO CANCELLATION
        FEE, AND ANY PAYMENT MADE IS REFUNDED IN FULL WITHIN 10 BUSINESS DAYS.
      </div>

      <div class="doc-ack">
        Customer acknowledges: (1) receiving a completed copy of this Agreement, including two
        completed Notice of Cancellation forms, at the time of signing; (2) that the representative
        <b>verbally explained the 3-business-day right to cancel</b>; and (3) consenting to do
        business electronically and to receive this Agreement and related notices by
        ${c.email ? "email at the address above" : "electronic delivery"}.
      </div>

      <div class="doc-sig">
        <div class="sig-col">
          ${sigDataUrl ? `<img class="sig-img" src="${sigDataUrl}" alt="Customer signature">` : `<div class="sig-blank"></div>`}
          <div class="sig-cap">Customer signature — <b>${esc(name)}</b> · ${fmtD(today)}</div>
        </div>
        <div class="sig-col">
          <div class="sig-blank rep"><span>${esc(STORE.custSoldByName(c))}</span></div>
          <div class="sig-cap">Company representative</div>
        </div>
      </div>
      <div class="doc-term-restate"><b>This Agreement is for an initial period of ${term} months.</b></div>

      ${noc(1)}
      ${noc(2)}
    `;
  }

  // ---------- full printable document ----------
  const DOC_CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font:13px/1.55 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#101828;
      background:#fff;padding:28px;max-width:760px;margin:0 auto}
    .doc-head{text-align:center;margin-bottom:18px;border-bottom:2px solid #101828;padding-bottom:12px}
    .doc-brand{font-size:20px;font-weight:800;letter-spacing:.04em}
    .doc-title{font-size:14px;font-weight:700;margin-top:2px;text-transform:uppercase;letter-spacing:.08em}
    .doc-meta{font-size:11px;color:#475467;margin-top:4px}
    .doc-parties{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12.5px}
    .doc-parties td{padding:3px 8px 3px 0;vertical-align:top}
    .doc-parties td:first-child{width:120px;color:#475467}
    .doc-box{border:2px solid #101828;border-radius:8px;padding:14px 16px;margin-bottom:16px}
    .doc-box-title{font-size:15px;font-weight:800}
    .doc-box-sub{font-size:12px;color:#475467;margin-bottom:8px}
    .doc-price{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:10px}
    .doc-price td{padding:3.5px 0;border-bottom:1px solid #E4E7EC}
    .doc-price .r{text-align:right;font-variant-numeric:tabular-nums}
    .doc-price .disc td{color:#B42318}
    .doc-price .tot td{font-weight:700;border-bottom:none}
    .doc-box-key{font-size:12.5px;background:#F9FAFB;border:1px solid #D0D5DD;border-radius:6px;padding:10px 12px}
    .doc-sections{padding-left:20px;font-size:12.5px}
    .doc-sections li{margin-bottom:9px}
    .note{font-size:12px;color:#475467;margin:8px 0}
    .doc-disclosure,.doc-ack{font-size:11.5px;border:1px solid #D0D5DD;border-radius:6px;
      padding:10px 12px;margin:12px 0;color:#344054}
    .doc-cancel{font-size:12.5px;font-weight:700;border:2px solid #101828;border-radius:6px;
      padding:12px 14px;margin:14px 0;background:#FFFBEB}
    .doc-sig{display:flex;gap:26px;margin:20px 0 6px}
    .sig-col{flex:1}
    .sig-img{max-height:70px;max-width:100%;display:block;margin-bottom:2px}
    .sig-blank{height:56px;border-bottom:1.5px solid #101828;display:flex;align-items:flex-end}
    .sig-blank.rep span{font-family:'Segoe Script','Bradley Hand',cursive;font-size:17px;padding-bottom:4px}
    .sig-cap{font-size:11px;color:#475467;border-top:1.5px solid #101828;padding-top:4px}
    .sig-img+.sig-cap,.sig-blank+.sig-cap{border-top:none}
    .doc-term-restate{text-align:center;font-size:13px;margin:10px 0 22px}
    .noc{border:1.5px dashed #667085;border-radius:8px;padding:14px 16px;margin-top:14px;
      font-size:11.5px;page-break-inside:avoid}
    .noc-head{font-weight:800;font-size:12.5px;letter-spacing:.05em;margin-bottom:4px}
    .noc-date{margin-bottom:6px}
    .noc p{margin-bottom:6px}
    .noc-sign{display:flex;justify-content:space-between;gap:14px;margin-top:12px;flex-wrap:wrap}
    @media print{body{padding:0}.noc{page-break-inside:avoid}}
  `;

  /* --------- what the customer may honestly be said to have authorized ---
     Three states, and the document must never claim a higher one:

       "authorized"  a payment method is genuinely on file AND a mandate to
                     charge it exists. ONLY a billing backend can establish
                     this against a real payment-provider result — nothing
                     in the client can produce it, which is why v39 never
                     prints this branch.
       "requested"   the customer told the rep how they mean to pay, and may
                     have asked for autopay. That is an intention, not an
                     authorization to debit an account.
       "none"        nothing was chosen.

     A selected method, a legacy last4 and an autopay request are all
     evidence of intent and none of them is a mandate. Deriving authorization
     from any of them would have the customer sign a document authorizing
     charges against an account they never handed over. */
  function payState(c) {
    const p = (c && c.payment) || {};
    // server-authored only; the client cannot write this value (see
    // db/migrations/0004_payment_allowlist.sql, which refuses it)
    if (p.status === "authorized" || p.status === "active") return "authorized";
    if (p.method || p.autopayRequested === true) return "requested";
    return "none";
  }

  function billingClause(c) {
    const p = (c && c.payment) || {};
    const st = payState(c);
    if (st === "authorized") {
      return "By signing, Customer authorizes Company to charge the payment method on file "
        + "for the initial service and each recurring charge when due. This authorization "
        + "remains in effect until Customer revokes it in writing and Company has had a "
        + "reasonable opportunity (not exceeding 15 days) to act.";
    }
    if (st === "requested") {
      const how = p.method === "ach" ? "a bank account (ACH)" : "a credit or debit card";
      return "<b>No payment method has been collected with this Agreement and Customer "
        + "authorizes no charge by signing it.</b> Customer indicates an intention to pay by "
        + how + (p.autopayRequested === true
            ? " and has asked to be enrolled in automatic payments" : "")
        + ". Company will contact Customer separately to set up payment before the initial "
        + "service, and any authorization to charge a specific account will be given at that "
        + "time, separately from this Agreement. Until then Company will invoice each charge.";
    }
    return "<b>No payment method has been collected with this Agreement and Customer "
      + "authorizes no charge by signing it.</b> Company will contact Customer to arrange "
      + "payment before the initial service, and will invoice each charge until Customer "
      + "separately authorizes a payment method.";
  }

  function docHTML(c, sigDataUrl) {
    return `<!doctype html><html><head><meta charset="utf-8">
      <title>Service Agreement — ${esc(STORE.custName(c))}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${DOC_CSS}</style></head>
      <body>${bodyHTML(c, sigDataUrl)}</body></html>`;
  }

  // ---------- output: print / share ----------
  function print(html) {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    f.srcdoc = html;
    f.onload = () => {
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) {}
      setTimeout(() => f.remove(), 60000);
    };
  }

  const share = (html, filename) => MUI.shareOrDownload(html, filename, "text/html");

  window.MCONTRACT = { bodyHTML, docHTML, print, share, noticeDate, pricing };
})();
