# Compact community entry acknowledgement — unpublished verification

**LOCAL SOURCE ONLY. LEGAL DOCUMENTS AND LEGAL REVIEW REMAIN UNFINISHED.**

## Implemented presentation

- Login/signup and account eligibility use the existing Witness app icon
  `/icon-192.png` beside the Witness name. Main app header/sidebar branding was
  not replaced; no new icon was invented.
- Signup, account eligibility and Before you enter share one ordinary unchecked
  checkbox with this wording:
  “I confirm I am at least 13 years old, understand Witness’s age requirements,
  agree to the Terms of Use, and acknowledge the Privacy Notice.”
- Terms/Privacy remain accessible links, with a visible unfinished-draft notice.
  Removed the community age-number field and duplicate long Before you enter
  terms card. Signup and signed-in acknowledgement use Continue.
  Existing email/password sign-in remains available without a pre-auth checkbox;
  signup and both social entries require it because providers may create accounts.
- Normal native checkbox behavior, associated touch label, visible keyboard focus
  and a minimum-height label area are retained. Adult-care 18+ confirmation,
  clinical agreement checkbox/typed signature and teen-care deferral remain separate.

## Declaration, version and account safety

- Current acknowledgement version: `2026-10-15-community-13plus-draft`.
  Signed-in acknowledgement saves a separate account-bound metadata object:
  version, account ID, minimum-age-confirmed boolean and confirmation timestamp.
  It does not store a number, birthday, “13–17” assertion or adulthood.
- Existing age declarations and other metadata are not replaced by this write.
  The eligibility reader uses a minimum-only “13+” read model when no valid
  existing age band is available. Existing valid adult/minor bands remain intact.
  The community checkbox cannot satisfy the separate adult-care 18+ check.
- Explicit known under-13 values available in account metadata refuse access and
  acknowledgement, including under13 bands, numerical ages below 13 and valid
  under-13 birth dates. No authoritative profile-table age lookup was added.
- Unchecked or non-boolean submissions fail. Confirmations use the displayed
  account ID, rechecked session/user and captured token. Late responses/account
  switches cannot acknowledge a different account. Checkbox state is bound to
  the displayed account snapshot; Before you enter remounts for changed accounts.
- Pre-auth drafts clear before and after provider attempts, including failure
  or cancellation, and are never reused as returned-account acknowledgement.
  Signup can record registration acceptance flags/version, but those flags alone
  do not establish account-bound eligibility. The actual signed-in account confirms
  separately; no historical consent rows or age records are silently upgraded.
- Before you enter checks the new versioned declaration rather than treating old
  community-agreement history as acceptance of this changed draft wording.
  Existing scoped covenant/clinical agreements and their historical records remain
  unchanged. Cancellation, crisis, support and public policy routes remain accessible.

## Actual checks

- **77 tests passed / 576 assertions across 7 files.** Includes new checked/
  unchecked, minimum-vs-adult, invalid/versioned declaration, metadata preservation,
  known-under13, stale account, late-write, failed-provider and compact-render checks;
  existing eligibility, adult-care, cancellation/checkout and native packaging tests.
- TypeScript: passed. Local web build: passed. These are not native/device or
  live-provider/backend verification.
- Mobile 402×874 browser snapshots: login and signup show the existing app icon,
  unchecked compact checkbox, working policy-link targets and draft notice without
  horizontal overflow. Signup's direct `?mode=signup` view is initialized from the
  router search string so its initial render shows signup rather than login.
- Signed-in eligibility/Before you enter were checked with source/component and
  synthetic account regressions, not real signed-in browser or device sessions.
- Diff whitespace checks passed. Existing server-function deprecation warnings
  and browser password-autocomplete advice remain; no unrelated cleanup was performed.
- No real account actions, paid builds, uploads, publishing, billing, notifications,
  credential changes or production/provider/database settings changes were performed.

## Unresolved boundaries

Self-declaration and editable user metadata are not verified age or legal-compliance
certification. Direct managed Auth/database access and other clients can bypass
browser gates; trustworthy service-side age/consent enforcement still needs an
authorized provider/backend design. Actual authenticated metadata-save/preservation
has not been tested against the owned live backend in this turn.

Managed broker external-origin/native handoff limitations are unchanged. No social
sign-in completion is claimed. Legal owner review, policy finalization and approval
of this draft wording/version remain release blockers, along with previously
recorded signing/device/store blockers.
