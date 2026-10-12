"use strict";

(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const mobileNavigation = document.querySelector("#mobile-navigation");
  const guide = document.querySelector(".ember-guide");
  const guideButton = guide?.querySelector(".ember-guide-button");
  const guidePanel = guide?.querySelector(".ember-guide-panel");

  const revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const scrollProgress = document.querySelector(".progress");
  if (scrollProgress) {
    const updateProgress = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const amount = available > 0 ? window.scrollY / available : 0;
      scrollProgress.style.transform = "scaleX(" + Math.min(1, Math.max(0, amount)) + ")";
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
  }

  function setMenuOpen(open) {
    if (!menuButton || !mobileNavigation) return;
    menuButton.setAttribute("aria-expanded", String(open));
    mobileNavigation.setAttribute("aria-hidden", String(!open));
    mobileNavigation.classList.toggle("is-open", open);
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
    setMenuOpen(false);
    setGuideOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (mobileNavigation && menuButton && !mobileNavigation.contains(event.target) && !menuButton.contains(event.target)) {
      setMenuOpen(false);
    }
    if (guide && !guide.contains(event.target)) setGuideOpen(false);
  });

  const projectForm = document.querySelector("form");
  if (projectForm) {
    const search = new URLSearchParams(window.location.search);
    const packageField = projectForm.elements.namedItem("package");
    if (packageField && search.has("package")) packageField.value = search.get("package");

    const status = document.createElement("p");
    status.className = "form-note form-status";
    status.setAttribute("aria-live", "polite");
    projectForm.append(status);

    projectForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!projectForm.reportValidity()) return;

      const field = (name) => {
        const control = projectForm.elements.namedItem(name);
        return control ? String(control.value || "").trim() : "";
      };
      const isAudit = Boolean(projectForm.elements.namedItem("focus"));
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
            ["Name", field("name")],
            ["Business", field("business")],
            ["Email", field("email")],
            ["Phone / WhatsApp", field("phone")],
            ["What is needed", field("need")],
            ["Launch timing", field("timing")],
            ["More context", field("notes")],
          ];

      for (const [label, value] of fields) {
        if (value) lines.push(label + ": " + value);
      }
      for (const key of ["package", "service", "industry", "goal", "source"]) {
        const value = search.get(key);
        if (value && !lines.some((line) => line.startsWith(key + ":"))) {
          lines.push(key.charAt(0).toUpperCase() + key.slice(1) + ": " + value);
        }
      }

      const whatsappUrl = "https://wa.me/27723398781?text=" + encodeURIComponent(lines.join("\n"));
      const whatsappWindow = window.open(whatsappUrl, "_blank");
      if (whatsappWindow) {
        whatsappWindow.opener = null;
        status.textContent = "Your brief is ready in WhatsApp. Review it there before sending.";
      } else {
        window.location.assign(whatsappUrl);
      }
    });
  }

  const auditFocus = document.querySelector('select[name="focus"]');
  if (auditFocus) {
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
        document.querySelector("#request")?.scrollIntoView({ behavior: "smooth", block: "start" });
        auditFocus.focus({ preventScroll: true });
      });
    });
  }

  const launchPath = document.querySelector(".answers");
  launchPath?.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const goal = button.textContent.replace(/→/g, "").trim();
      window.location.href = "/start?goal=" + encodeURIComponent(goal);
    });
  });
})();
