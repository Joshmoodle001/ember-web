// Public contact details; registration number supplied by the owner on 9 Nov 2026.
export const COMPANY = Object.freeze({
  brand: "EmberWeb",
  legalName: null,
  registrationNumber: "K2026448510",
  location: "South Africa",
  website: "https://emberweb.co.za",
  phone: "+27 72 339 8781",
  whatsapp: "https://wa.me/27723398781",
});

export const whatsappLink = message => COMPANY.whatsapp + "?text=" + encodeURIComponent(message);
