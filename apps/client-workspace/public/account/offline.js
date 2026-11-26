if ("indexedDB" in window) indexedDB.deleteDatabase("ember-workspace-v1");

document.getElementById("sign-out").addEventListener("click", async () => {
  if (navigator.onLine) {
    const response = await fetch("/auth/signout", { method: "POST", redirect: "manual" }).catch(() => null);
    if (response?.type === "opaqueredirect" || response?.ok) {
      location.replace("/login");
      return;
    }
  }
  document.getElementById("status").textContent = "Reconnect to sign out securely.";
});
