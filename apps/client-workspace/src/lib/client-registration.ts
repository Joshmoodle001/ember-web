/** Enable public registration only after confirmation delivery has been verified. */
export function isClientRegistrationEnabled(value: string | undefined) {
  return value === "true";
}
