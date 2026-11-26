"use strict";

(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const mobileNavigation = document.querySelector("#mobile-navigation");
  const guide = document.querySelector(".ember-guide");
  const guideButton = guide?.querySelector(".ember-guide-button");
  const guidePanel = guide?.querySelector(".ember-guide-panel");

  function setMenuOpen(open) {
    if (!menuButton || !mobileNavigation) return;
    menuButton.setAttribute("aria-expanded", String(open));
    mobileNavigation.setAttribute("aria-hidden", String(!open));
    mobileNavigation.classList.toggle("is-open", open);
    mobileNavigation.inert = !open;
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    menuButton.querySelectorAll(".sr-only").forEach((label) => {
      label.textContent = open ? "Close navigation" : "Open navigation";
    });
    mobileNavigation.querySelectorAll("a").forEach((link) => {
      link.tabIndex = open ? 0 : -1;
    });
  }

  function setGuideOpen(open) {
    if (!guide || !guideButton) return;
    guide.classList.toggle("is-open", open);
    guideButton.setAttribute("aria-expanded", String(open));
    guideButton.setAttribute("aria-label", open ? "Close EmberGuide" : "Open EmberGuide");
    if (guidePanel) {
      guidePanel.setAttribute("aria-hidden", String(!open));
      guidePanel.inert = !open;
      guidePanel.querySelectorAll("a").forEach((link) => {
        link.tabIndex = open ? 0 : -1;
      });
    }
  }

  menuButton?.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });
  mobileNavigation?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });
  guideButton?.addEventListener("click", () => {
    setGuideOpen(guideButton.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const focusInMenu = mobileNavigation?.contains(document.activeElement);
    const focusInGuide = guidePanel?.contains(document.activeElement);
    setMenuOpen(false);
    setGuideOpen(false);
    if (focusInMenu) menuButton?.focus();
    else if (focusInGuide) guideButton?.focus();
  });

  setMenuOpen(false);
  if (menuButton) menuButton.hidden = false;
  setGuideOpen(false);

  // A disclosure opened on a phone must not reopen after rotating through desktop.
  const desktopNavigation = window.matchMedia?.("(min-width: 901px)");
  desktopNavigation?.addEventListener("change", (event) => {
    if (!event.matches) return;
    const focusInMenu = mobileNavigation?.contains(document.activeElement);
    setMenuOpen(false);
    if (focusInMenu) document.querySelector(".site-nav-links a")?.focus({ preventScroll: true });
  });

  document.addEventListener("click", (event) => {
    if (mobileNavigation && menuButton && !mobileNavigation.contains(event.target) && !menuButton.contains(event.target)) {
      setMenuOpen(false);
    }
    if (guide && !guide.contains(event.target)) setGuideOpen(false);
  });

  const searchParams = new URLSearchParams(window.location.search);
  const knownSources = ["linkedin", "referral", "organic", "partner"];
  const sourceParam = searchParams.get("utm_source") || searchParams.get("source");
  let funnelSource = knownSources.includes(sourceParam) ? sourceParam : "direct";
  try {
    if (funnelSource !== "direct") sessionStorage.setItem("ember-source", funnelSource);
    else {
      const previous = sessionStorage.getItem("ember-source");
      if (knownSources.includes(previous)) funnelSource = previous;
      else if (/(^|\.)google\.[a-z.]+$/i.test(new URL(document.referrer || "https://emberweb.co.za").hostname)) funnelSource = "organic";
    }
  } catch { /* Tracking is optional if storage is unavailable. */ }

  function countFunnel(milestone) {
    if (!document.querySelector('meta[name="ember-workspace-origin"]') || navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    try {
      const key = "ember-counted:" + milestone + ":" + funnelSource;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      void fetch("/api/intake/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ milestone, source: funnelSource }), keepalive: true }).catch(() => {});
    } catch { /* The form works without measurement. */ }
  }
  const workshopAudit = window.location.pathname === "/audit" && searchParams.get("focus") === "workshop";
  if (window.location.pathname === "/gauteng-workshops") countFunnel("landing_visit");
  const projectForm = document.querySelector("form");
  if (workshopAudit) projectForm?.addEventListener("focusin", () => countFunnel("audit_start"), { once: true });
  if (projectForm) {
    const search = new URLSearchParams(window.location.search);
    const packageField = projectForm.elements.namedItem("package");
    if (packageField && search.has("package")) packageField.value = search.get("package");
    const needField = projectForm.elements.namedItem("need");
    const context = [search.get("service"), search.get("goal"), search.get("package")].filter(Boolean).join(" ");
    if (needField && context) {
      const explicitService = search.get("service");
      const hasExplicitService = [...(needField.options || [])].some(option => option.value === explicitService);
      needField.value = hasExplicitService ? explicitService : /ongoing care|EmberCare/i.test(context) ? "Ongoing care"
        : /task force|\bagents?\b/i.test(context) ? "AI agent task force"
        : /knowledge|document.*engine/i.test(context) ? "AI knowledge engine"
        : /automation|workflow|Systems/i.test(context) ? "Workflow automation"
        : /\bapps?\b|portal|dashboard/i.test(context) ? "Custom web app"
        : /\bAI\b/i.test(context) ? "Automation or AI support"
        : /old|redesign|Replacing/i.test(context) ? "Website redesign"
        : /shop|booking/i.test(context) ? "Online shop / bookings" : "New website";
      const specifics = projectForm.querySelector(".brief-specifics");
      if (specifics) specifics.open = true;
    }
    const packageNames = { "launch-lite": "Launch Lite", starter: "Starter", business: "Business", growth: "Growth" };
    const chosenPackage = search.get("package");
    const selectedContext = [Object.hasOwn(packageNames, chosenPackage) ? packageNames[chosenPackage] : chosenPackage, search.get("goal"), search.get("service"), search.get("industry")].filter(Boolean);
    if (selectedContext.length) {
      const contextNote = document.createElement("p");
      contextNote.className = "request-context wide";
      contextNote.textContent = "Your starting point: " + selectedContext.map(value => value.slice(0, 160)).join(" · ");
      document.querySelector(".brief-intro")?.append(contextNote);
    }

    const status = document.createElement("p");
    status.className = "form-note form-status";
    status.setAttribute("aria-live", "polite");
    projectForm.append(status);

    let submitting = false;
    let saved = false;
    const submissionId = crypto.randomUUID();
    const syntheticPreview = document.querySelector('meta[name="ember-intake-preview"]')?.content === "synthetic";
    const connected = syntheticPreview || document.querySelector('meta[name="ember-workspace-origin"]')?.content === "https://portal.emberweb.co.za";
    const review = document.querySelector("[data-request-review]");
    if (review) {
      review.querySelector("[data-edit-request]").addEventListener("click", () => review.close("edit"));
      review.querySelector("[data-confirm-request]").addEventListener("click", () => review.close("send"));
    }
    if (syntheticPreview) status.textContent = "Preview only. Use an example.test email and sample details.";
    projectForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting || saved || review?.open) return;
      if (!projectForm.reportValidity()) return;

      const field = (name) => {
        const control = projectForm.elements.namedItem(name);
        return control ? String(control.value || "").trim() : "";
      };
      const isAudit = Boolean(projectForm.elements.namedItem("focus"));
      const journey = ["startup", "business"].includes(field("journey")) ? field("journey") : "";
      const lines = [isAudit ? "New EmberWeb audit request" : "New EmberWeb project brief"];
      const fields = isAudit
        ? [
            ["Audit focus", field("focus")],
            ["Name", field("name")],
            ["Business", field("business")],
            ["Website", field("website")],
            ["Email", field("email")],
            ["What to improve", field("notes")],
          ]
        : [
            ["Starting point", journey === "startup" ? "Starting something new" : journey === "business" ? "Existing business" : ""],
            ["Idea stage", journey === "startup" ? field("startup_stage") : ""],
            ["Intended customers / users", journey === "startup" ? field("audience") : ""],
            ["First useful outcome", journey === "startup" ? field("startup_goal") : journey === "business" ? field("business_goal") : ""],
            ["Existing tools / website", journey === "business" ? field("current_tools") : ""],
            ["Name", field("name")],
            ["Business", field("business")],
            ["Email", field("email")],
            ["Phone / WhatsApp", field("phone")],
            ["What is needed", field("need")],
            ["Launch timing", field("timing")],
            ["More context", field("notes")],
          ];

      const source = funnelSource;
      for (const [label, value] of fields) {
        if (value && !["Name", "Business", "Email", "Phone / WhatsApp"].includes(label)) lines.push(label + ": " + value);
      }
      for (const key of ["package", "service", "industry", "goal"]) {
        const value = search.get(key)?.trim().slice(0, 160);
        if (value && !lines.some((line) => line.startsWith(key + ":"))) {
          lines.push(key.charAt(0).toUpperCase() + key.slice(1) + ": " + value);
        }
      }

      if (connected) {
        const controls = Array.from(projectForm.elements);
        const button = projectForm.querySelector('[type="submit"]');
        const originalLabel = button.textContent;
        const need = (field("need") + " " + field("focus")).toLowerCase();
        const service = /ai|automat|workflow/.test(need) ? (/website|web.*ai/.test(need) ? "web_and_ai" : "ai_development") : /\bapp\b|portal/.test(need) ? "other" : /web|site|shop|booking/.test(need) ? "web_design" : "other";
        const consent = projectForm.elements.namedItem("contact_consent");
        const marketing = projectForm.elements.namedItem("marketing_consent");
        const payload = { submission_id: submissionId, name: field("name"), company: field("business"), email: field("email"), phone: field("phone"), service, brief: lines.slice(1).join("\n").slice(0, 5000), source, campaign: workshopAudit ? "gauteng_workshops" : null, consent: { inquiry: consent?.checked === true, marketing: marketing?.checked === true, policy: "2026-11-26", form: isAudit ? "audit" : "brief" } };
        if (review) {
          review.querySelector("[data-review-summary]").textContent = [
            ...fields.filter(([, value]) => value).map(([label, value]) => label + ": " + value),
            "Email updates: " + (payload.consent.marketing ? "Yes" : "No"),
          ].join("\n");
          review.returnValue = "edit";
          review.showModal();
          await new Promise(resolve => review.addEventListener("close", resolve, { once: true }));
          if (review.returnValue !== "send") { button.focus(); return; }
        }
        submitting = true;
        const originalDisabled = controls.map((control) => control.disabled);
        controls.forEach((control) => { control.disabled = true; });
        button.textContent = "Sending request…";
        status.textContent = "Saving your request…";
        status.dataset.state = "pending";
        projectForm.setAttribute("aria-busy", "true");
        try {
          if (syntheticPreview) {
            if (!/^[^@]+@example\.test$/i.test(payload.email)) throw new Error("Use a sample email ending in @example.test.");
            if (payload.email.toLowerCase() === "preview-error@example.test") throw new Error("Simulated error. Change the sample email and try again.");
          } else {
            const response = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
            const result = await response.json().catch(() => ({ error: "Your request could not be saved. Please try again shortly." }));
            if (!response.ok || result.success !== true) throw new Error(result.error || "Your request could not be saved. Please try again.");
          }
          saved = true;
          projectForm.classList.add("is-complete");
          button.textContent = "Request sent ✓";
          status.textContent = syntheticPreview ? "Sample request complete. No information was sent. You can check the booking fallback next." : "Request received. Next, choose a discovery time using the same email as your brief. No payment is due at this step.";
          status.dataset.state = "success";
          const next = document.createElement("a");
          next.href = journey ? "/book?journey=" + journey : "/book";
          next.textContent = "Choose a discovery time →";
          next.className = "btn btn-primary form-next-action";
          status.insertAdjacentElement("afterend", next);
          next.focus({ preventScroll: true });
          status.scrollIntoView({ behavior: "instant", block: "center" });
        } catch (error) {
          controls.forEach((control, index) => { control.disabled = originalDisabled[index]; });
          button.textContent = originalLabel;
          status.textContent = error.name === "TimeoutError" ? "We couldn’t confirm your request. Please wait a moment before trying again, or contact us directly." : error.message || "We couldn’t save your request. Please try again.";
          status.dataset.state = "error";
          status.tabIndex = -1;
          status.focus();
        } finally {
          submitting = false;
          projectForm.setAttribute("aria-busy", "false");
        }
        return;
      }

      const whatsappUrl = "https://wa.me/27723398781?text=" + encodeURIComponent(isAudit ? "Hi EmberWeb, I would like a free audit." : "Hi EmberWeb, I would like to discuss a project.");
      const whatsappWindow = window.open(whatsappUrl, "_blank");
      if (whatsappWindow) {
        whatsappWindow.opener = null;
        status.textContent = "WhatsApp is open with a short message. Add any details you want to share before sending.";
      } else {
        window.location.assign(whatsappUrl);
      }
    });
  }

  const auditFocus = document.querySelector('select[name="focus"]');
  if (auditFocus) {
    const website = document.querySelector('input[name="website"]');
    function updateAuditWebsite() {
      if (!website) return;
      const required = auditFocus.value === "Website audit";
      website.required = required;
      const notes = projectForm?.elements.namedItem("notes");
      if (notes) notes.required = !required;
      const labelText = website.closest("label")?.firstChild;
      if (labelText?.nodeType === Node.TEXT_NODE) labelText.textContent = required ? "Website link *" : "Website link (optional)";
    }
    auditFocus.addEventListener("change", updateAuditWebsite);
    updateAuditWebsite();
    const requestedAudits = ["Website audit", "AI + automation audit"];
    document.querySelectorAll(".audit-choice button").forEach((button, index) => {
      const requestedAudit = requestedAudits[index];
      if (!requestedAudit) return;
      button.addEventListener("click", () => {
        const option = Array.from(auditFocus.options).find(
          (item) => item.value === requestedAudit || item.textContent.trim() === requestedAudit,
        );
        if (!option) return;
        auditFocus.value = option.value;
        updateAuditWebsite();
        document.querySelector("#request")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        auditFocus.focus({ preventScroll: true });
      });
    });
  }

  document.querySelectorAll("[data-workflow-explorer]").forEach((explorer) => {
    const controls = explorer.querySelector(".workflow-switch");
    const buttons = [...explorer.querySelectorAll("[data-workflow-target]")];
    const panels = [...explorer.querySelectorAll(".workflow-panel")];
    if (!controls || !buttons.length || panels.length !== buttons.length) return;
    if (buttons.some((button) => !panels.some((panel) => panel.id === button.dataset.workflowTarget))) return;
    function selectExample(button) {
      buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      panels.forEach((panel) => { panel.hidden = panel.id !== button.dataset.workflowTarget; });
    }
    buttons.forEach((button) => button.addEventListener("click", () => selectExample(button)));
    selectExample(buttons[0]);
    controls.hidden = false;
  });

  const launchPath = document.querySelector(".answers");
  launchPath?.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const goal = button.textContent.replace(/→/g, "").trim();
      window.location.href = "/start?goal=" + encodeURIComponent(goal);
    });
  });
})();
