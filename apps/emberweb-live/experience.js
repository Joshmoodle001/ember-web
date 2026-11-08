"use strict";

(() => {
  // Every project remains readable when scripting is unavailable.
  document.querySelectorAll("[data-project-explorer]").forEach(explorer => {
    const picker = explorer.querySelector(".project-picker");
    const buttons = [...explorer.querySelectorAll("[data-project-target]")];
    const panels = [...explorer.querySelectorAll(".project-panel")];
    if (!picker || buttons.length !== panels.length || buttons.some(button => !panels.some(panel => panel.id === button.dataset.projectTarget))) return;
    function select(button) {
      buttons.forEach(control => control.setAttribute("aria-pressed", String(control === button)));
      panels.forEach(panel => { panel.hidden = panel.id !== button.dataset.projectTarget; });
    }
    buttons.forEach(button => button.addEventListener("click", () => select(button)));
    select(buttons[0]);
    picker.hidden = false;
  });

})();
