/** Only discard a retry ID when no earlier attempt could have committed. */
export function shouldForgetProvisionAttempt(previousAmbiguous: boolean, status: number, noReservation: unknown): boolean {
  return !previousAmbiguous && ([400, 401, 403, 404, 429].includes(status) || (status === 409 && noReservation === true));
}
