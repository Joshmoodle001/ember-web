/* Original vector motion composition. Its lifecycle is owned by motion.js. */
export const introFilm = `<div class="intro-screen" data-intro-film aria-hidden="true" hidden>
  <div class="film-atmosphere"></div>
  <div class="intro-composition film-composition">
    <div class="film-edition"><span>EMBERWEB / DIGITAL STUDIO</span><span>IDEAS INTO EXPERIENCES</span></div>
    <div class="film-stage">
      <svg class="film-sculpture" viewBox="0 0 800 800" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="film-cobalt" x1="240" y1="220" x2="540" y2="560" gradientUnits="userSpaceOnUse"><stop stop-color="#d1e0ff"/><stop offset=".4" stop-color="#8eafff"/><stop offset="1" stop-color="#1558c9"/></linearGradient>
          <linearGradient id="film-lime" x1="280" y1="280" x2="490" y2="500" gradientUnits="userSpaceOnUse"><stop stop-color="#f5ffc7"/><stop offset=".45" stop-color="#d4ff24"/><stop offset="1" stop-color="#a4c821"/></linearGradient>
          <linearGradient id="film-trace" x1="130" y1="640" x2="650" y2="170" gradientUnits="userSpaceOnUse"><stop stop-color="#1558c9" stop-opacity="0"/><stop offset=".5" stop-color="#8eafff"/><stop offset="1" stop-color="#d4ff24"/></linearGradient>
          <linearGradient id="film-glass" x1="160" y1="220" x2="590" y2="600" gradientUnits="userSpaceOnUse"><stop stop-color="#152b55" stop-opacity=".7"/><stop offset="1" stop-color="#030407" stop-opacity=".9"/></linearGradient>
        <linearGradient id="film-flame-blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8EAFFF"/><stop offset=".4" stop-color="#1558C9"/><stop offset="1" stop-color="#082E83"/></linearGradient><linearGradient id="film-flame-edge" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#1558C9"/><stop offset=".65" stop-color="#4E8BFF"/><stop offset="1" stop-color="#8EAFFF"/></linearGradient><linearGradient id="film-flame-lime" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F1FFBD"/><stop offset=".42" stop-color="#D4FF24"/><stop offset="1" stop-color="#A9D31D"/></linearGradient></defs>
        <g class="film-field" stroke="#8eafff" stroke-opacity=".13">
          <path d="M90 400h620M400 90v620"/>
          <circle cx="400" cy="400" r="300"/>
          <circle cx="400" cy="400" r="250" stroke-dasharray="2 16"/>
          <path d="m178 178 444 444M178 622l444-444"/>
        </g>
        <g class="film-orbit film-orbit-a"><ellipse cx="400" cy="400" rx="310" ry="144" transform="rotate(-32 400 400)" stroke="url(#film-trace)" stroke-width="2" pathLength="1"/><circle cx="663" cy="237" r="6" fill="#d4ff24"/></g>
        <g class="film-orbit film-orbit-b"><ellipse cx="400" cy="400" rx="193" ry="294" transform="rotate(-28 400 400)" stroke="#1558c9" stroke-width="1.5" pathLength="1"/></g>
        <g class="film-rays" stroke="url(#film-trace)" stroke-width="2"><path d="M90 400h176M534 400h176M400 90v176M400 534v176" pathLength="1"/><path d="m159 159 117 117m248 248 117 117M159 641l117-117m248-248 117-117" pathLength="1"/></g>
        <g class="film-panel film-panel-a"><rect x="141" y="320" width="216" height="142" rx="16" fill="url(#film-glass)" stroke="#8eafff" stroke-opacity=".5"/><path d="M161 347h176" stroke="#8eafff" stroke-opacity=".3"/><circle cx="164" cy="334" r="3" fill="#d4ff24"/><circle cx="176" cy="334" r="3" fill="#8eafff"/><path d="M166 372h78m-78 16h132m-132 16h102" stroke="#8eafff" stroke-width="4" stroke-linecap="round"/><rect x="165" y="424" width="75" height="14" rx="7" fill="#d4ff24"/></g>
        <g class="film-panel film-panel-b"><rect x="490" y="219" width="176" height="172" rx="16" fill="url(#film-glass)" stroke="#8eafff" stroke-opacity=".5"/><path d="M512 246h132" stroke="#8eafff" stroke-opacity=".3"/><rect x="513" y="270" width="31" height="31" rx="6" fill="#1558c9"/><rect x="553" y="270" width="31" height="31" rx="6" fill="#8eafff"/><rect x="593" y="270" width="31" height="31" rx="6" fill="#d4ff24"/><path d="M514 325h107m-107 17h77m-77 17h94" stroke="#8eafff" stroke-width="4" stroke-linecap="round"/></g>
        <circle class="film-seed" cx="400" cy="400" r="10" fill="#d4ff24"/>
        <g class="film-mark-frame"><ellipse cx="405" cy="606" rx="127" ry="13" fill="#1558c9" opacity=".12"/></g><g class="film-ribbon film-ribbon-a"><g transform="translate(169.6 169.6) scale(7.2)"><path d="M33 3C38 17 24 23 17 34C10 47 19 58 32 61C12 61 5 47 10 35C15 22 29 17 33 3Z" fill="url(#film-flame-blue)"/><path d="M33 4C35 17 22 24 16 35C12 42 14 49 19 54" stroke="#8EAFFF" stroke-opacity=".65" stroke-width=".75" stroke-linecap="round"/></g></g><g class="film-ribbon film-ribbon-b"><g transform="translate(169.6 169.6) scale(7.2)"><path d="M44 15C45 28 59 32 58 44C57 54 47 62 33 61C45 57 49 48 45 40C41 32 36 31 37 26C39 22 42 19 44 15Z" fill="url(#film-flame-edge)"/><path d="M45 25C49 33 57 35 56 44C55 51 49 57 42 59" stroke="#8EAFFF" stroke-opacity=".5" stroke-width=".65" stroke-linecap="round"/></g></g><g class="film-interlock"><g transform="translate(169.6 169.6) scale(7.2)"><path d="M32 23C33 34 21 37 23 46C24 53 29 58 35 60C36 52 45 48 44 41C43 34 35 33 32 23Z" fill="url(#film-flame-lime)"/><path d="M31 29C30 36 23 39 25 46C26 51 29 54 32 56" stroke="#F1FFBD" stroke-opacity=".7" stroke-width=".65" stroke-linecap="round"/></g></g>
        <g class="film-dust" fill="#8eafff"><circle cx="209" cy="234" r="3"/><circle cx="591" cy="566" r="3"/><circle cx="232" cy="570" r="2"/><circle cx="577" cy="166" r="2"/><path d="M603 477v20m-10-10h20" stroke="#d4ff24" stroke-width="2"/><path d="M206 293v14m-7-7h14" stroke="#8eafff" stroke-width="1.5"/></g>
      </svg>
    </div>
    <div class="film-title"><p class="intro-wordmark">EMBER<span>WEB</span></p></div>
    <p class="intro-caption film-caption">Ideas into experiences.</p>
    <div class="film-services"><span>DESIGN</span><i></i><span>SOFTWARE</span><i></i><span>INTELLIGENCE</span></div>
    <div class="intro-line film-rule"></div>
  </div>
</div>`;
