# Unify Witness payments

## Goal
Put every platform charge through the same Witness payments account while keeping recipient money clearly separated in the ledger.

- Churches and every other organization profile use the existing organization packages.
- Professional pages cost $9 monthly.
- Paid professional jobs keep a 10% Witness service fee.
- Nonprofit gifts and Fund gifts keep the existing 2% Witness fee.
- Gifts made directly to Witness go entirely to Witness and remain clearly labeled non-tax-deductible.
- Card and bank-account giving are available wherever the payment provider supports them.
- Nonprofit and worker shares are held as balances owed to them until automatic connected-account payouts are available; the app must never claim money was transferred when it was only recorded.

## Build
1. Create one shared payment catalog and fee source for organization plans, professional plans, donation fees, and job fees so amounts and wording cannot drift.
2. Register all recurring platform products with the built-in payment system and make every church, nonprofit, organization, and professional profile use those products.
3. Add bank-account payment to direct Witness gifts, including one-time and monthly gifts, and make `/giving/witness` the standard shareable Witness donation link.
4. Correct donation and Fund accounting so the charged amount, payment processing, 2% Witness revenue, optional Witness tip, and recipient balance remain separate on every payment and renewal.
5. Correct paid-job accounting so the worker balance and Witness's 10% fee are explicit; completion releases the balance for payout but does not falsely mark an external transfer complete.
6. Update organization and professional payment pages to show subscription status, platform fees, recipient balance, and the honest payout state.
7. Harden webhook handling and renewal records so every subscription and fee is reconciled once.
8. Verify checkout paths, webhook-backed balances, card/bank choices, mobile screens, and the production build.

## Go-live boundary
The code and ledger can be completed now. Real charges remain blocked until the Witness payments account finishes identity, business, and bank verification. Automatic nonprofit and worker transfers remain pending connected-account support; until then balances will be shown as owed and awaiting payout, never as paid.
