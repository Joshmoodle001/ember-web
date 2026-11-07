export type RecordedPayment = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  duplicate_of: string | null;
  created_at: string;
  invoices: { invoice_number: string; client_id: string; clients: { full_name: string; company: string | null } | null } | null;
};

export function filterRecordedPayments(payments: RecordedPayment[], clientId: string, query: string) {
  const search = query.trim().toLocaleLowerCase("en-ZA");
  return payments.filter((payment) => {
    if (clientId && payment.invoices?.client_id !== clientId) return false;
    if (!search) return true;
    return [payment.invoices?.invoice_number, payment.invoices?.clients?.full_name, payment.invoices?.clients?.company]
      .some((value) => value?.toLocaleLowerCase("en-ZA").includes(search));
  });
}
