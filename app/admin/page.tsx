import { requireOwner } from "./owner";
import { AdminConsole } from "./admin-console";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const owner = await requireOwner();
  return <main id="main-content" className="admin-shell"><header className="admin-header"><div><p className="section-label">[ EmberWeb owner workspace ]</p><h1>Clients, codes<br />and <em>next moves.</em></h1></div><p>Signed in as {owner.email}</p></header><AdminConsole /></main>;
}
