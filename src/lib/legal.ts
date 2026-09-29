// Contact and entity details used across the legal pages.
export const LEGAL_CONTACT = {
  entity: "Common Light LLC",
  addressLine1: "1312 17th St Unit #353",
  addressLine2: "Denver, CO 80202",
  country: "USA",
  email: "legal@witnessmovement.com",
  privacyEmail: "privacy@witnessmovement.com",
  state: "Colorado",
} as const;

export const LEGAL_ADDRESS = `${LEGAL_CONTACT.addressLine1}, ${LEGAL_CONTACT.addressLine2}, ${LEGAL_CONTACT.country}`;
