import { PaymentCode } from "./payment-code";

export default async function Pay({ searchParams }: { searchParams: Promise<{ code?: string }> }) { const { code = "" } = await searchParams; return <main id="main-content" className="payment-code-page"><PaymentCode initialCode={code} /></main>; }
