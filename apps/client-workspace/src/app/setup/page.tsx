import OwnerActivation from "@/components/owner-activation";

export default function SetupPage() {
  return <main className="shell narrow-shell"><header className="topbar"><a className="brand" href="https://emberweb.co.za">EMBER<span>WEB</span></a></header><section className="panel auth-panel"><p className="eyebrow">OWNER ACTIVATION</p><h1>Your internal staff login.</h1><p className="muted">Set a password for the existing approved owner account using your private, single-use activation code. Choose the password yourself; it never needs to be shared in chat.</p><OwnerActivation /></section></main>;
}
