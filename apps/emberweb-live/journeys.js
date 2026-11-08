"use strict";

(() => {
  const paths = {
    startup: {
      heading: "Let's shape your idea.",
      intro: "An early idea is enough. A project name is optional.",
      businessLabel: "Project / working name (optional)",
      briefLabel: "Tell us about your idea *",
      placeholder: "For example, I want customers to book a repair and choose a collection time.",
      booking: "For your first call: bring your idea, who it could help and any questions. You do not need a company name or finished plan.",
    },
    business: {
      heading: "What would make your business work better?",
      intro: "Tell us where the work slows down.",
      businessLabel: "Business name *",
      briefLabel: "What would you like to change? *",
      placeholder: "For example, we copy every order from WhatsApp into a spreadsheet.",
      booking: "For your discovery call: bring your priorities and a short outline of the tools or processes you use.",
    },
  };
  const requested = new URLSearchParams(window.location.search).get("journey");
  const requestedPath = Object.hasOwn(paths, requested) ? requested : null;
  const form = document.querySelector("form");
  const radios = form ? [...form.querySelectorAll('input[name="journey"]')] : [];

  if (radios.length) {
    const business = form.elements.namedItem("business");
    const notes = form.elements.namedItem("notes");
    const heading = document.querySelector("#brief-heading");
    const intro = document.querySelector("[data-journey-intro]");
    const businessLabel = document.querySelector("[data-business-label]");
    const briefLabel = document.querySelector("[data-brief-label]");
    const fieldsets = [...form.querySelectorAll("[data-journey-fields]")];
    const plans = [...document.querySelectorAll("[data-journey-plan]")];
    const choices = [...document.querySelectorAll("[data-journey-choice]")];

    function updatePath() {
      const selected = radios.find((radio) => radio.checked)?.value;
      const path = Object.hasOwn(paths, selected) ? selected : null;
      const copy = path ? paths[path] : null;
      fieldsets.forEach((fieldset) => {
        const active = Boolean(path) && fieldset.dataset.journeyFields === path;
        fieldset.hidden = !active;
        fieldset.disabled = !active;
      });
      plans.forEach((plan) => { plan.hidden = plan.dataset.journeyPlan !== (path || "default"); });
      choices.forEach((choice) => { choice.classList.toggle("is-selected", choice.dataset.journeyChoice === path); });
      if (business) business.required = path === "business";
      if (heading) heading.textContent = copy?.heading || "Start where you are.";
      if (intro) intro.textContent = copy?.intro || "Choose the path that fits you. You can change it without losing what you have entered.";
      if (businessLabel) businessLabel.textContent = copy?.businessLabel || "Project or business name (optional)";
      if (briefLabel) briefLabel.textContent = copy?.briefLabel || "What would you like to make possible? *";
      if (notes) notes.placeholder = copy?.placeholder || "Describe the job in your own words.";
    }

    if (requestedPath) radios.forEach((radio) => { radio.checked = radio.value === requestedPath; });
    radios.forEach((radio) => radio.addEventListener("change", updatePath));
    updatePath();
  }

  const bookingGuidance = document.querySelector("[data-booking-guidance]");
  if (bookingGuidance && requestedPath) {
    bookingGuidance.textContent = paths[requestedPath].booking;
    bookingGuidance.hidden = false;
    const returnLink = document.querySelector(".booking-next a");
    if (returnLink?.getAttribute("href") === "/start") returnLink.setAttribute("href", "/start?journey=" + requestedPath);
  }
})();
