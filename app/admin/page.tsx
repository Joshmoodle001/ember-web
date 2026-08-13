import { isOwner } from "./owner";
import { AdminConsole } from "./admin-console";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isOwner())) return <LoginForm />;
  return <main id="main-content" className="admin-shell"><header className="admin-header"><div><p className="section-label">[ EmberWeb owner workspace ]</p><h1>Clients, codes<br />and <em>next moves.</em></h1></div><p>Signed in as Josh</p></header><AdminConsole /></main>;
}
