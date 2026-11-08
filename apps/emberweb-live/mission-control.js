"use strict";
(() => {
  // Examples are honest local previews. Selection never calls a model or a service.
  document.querySelectorAll("[data-ai-lab]").forEach(lab=>{
    const buttons=[...lab.querySelectorAll("[data-lab-target]")];
    const panels=[...lab.querySelectorAll(".lab-panel")];
    const select=button=>{buttons.forEach(control=>control.setAttribute("aria-pressed",String(control===button)));panels.forEach(panel=>{panel.hidden=panel.id!==button.dataset.labTarget;});};
    buttons.forEach(button=>button.addEventListener("click",()=>select(button)));
    if(buttons.length===panels.length&&buttons.length){const deepLink=buttons.find(button=>"#"+button.dataset.labTarget===location.hash);select(deepLink||buttons[0]);}
    const matcher=lab.querySelector("[data-lab-match]");
    if(matcher){
      const input=matcher.querySelector("input"),message=matcher.querySelector("[data-match-result]");
      matcher.querySelector("button").addEventListener("click",()=>{
        const task=input.value.trim();
        if(task.length<8){message.textContent="Describe one task in a little more detail, or choose an example below.";input.focus();return;}
        const matches=[["learning",/learn|study|train|skill|excel|teach/i],["knowledge",/document|policy|search|knowledge|manual|find answers/i],["enquiries",/enquir|inquir|email|sales|reply|customer|lead/i],["operations",/handover|spreadsheet|operations|job|quote|process|admin/i],["personal",/personal|week|calendar|house|life|priorit|organis|organiz/i]];
        const id=matches.find(([,pattern])=>pattern.test(task))?.[0]||"planning";
        const button=buttons.find(control=>control.dataset.labTarget==="lab-"+id);
        if(button){select(button);message.textContent="Here’s a related example to explore. It uses sample content; your description has not been sent to an AI service.";}
      });
      input.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();matcher.querySelector("button").click();}});
    }
  });
  const routes={
    idea:{title:"Work out what is worth building first.",copy:"Clarify the offer, who it helps and what you need to test. Then choose a realistic first version, with its scope and costs explained.",link:"/start?journey=startup",action:"Start with your idea"},
    business:{title:"Find the improvement that matters first.",copy:"Show us where the work gets stuck: enquiries, admin, customer access or disconnected tools. We’ll map the current process and agree a focused improvement.",link:"/start?journey=business",action:"Talk about your business"},
    personal:{title:"Build a tool around the way you live and work.",copy:"Organise a project, make a learning routine or explore a personal assistant. Start with one task you want to make easier, then choose the simplest useful tool.",link:"/start?journey=startup&service=Custom%20web%20app&goal=Explore%20a%20personal%20tool%20for%20planning%2C%20learning%20or%20everyday%20tasks",action:"Plan a personal project"},
  };
  document.querySelectorAll("[data-world-routes]").forEach(world=>{
    const buttons=[...world.querySelectorAll("[data-world-route]")];
    buttons.forEach(button=>button.addEventListener("click",()=>{
      const route=routes[button.dataset.worldRoute];if(!route)return;
      buttons.forEach(control=>control.setAttribute("aria-pressed",String(control===button)));
      world.querySelector("[data-world-title]").textContent=route.title;world.querySelector("[data-world-copy]").textContent=route.copy;
      const link=world.querySelector("[data-world-link]");link.href=route.link;link.textContent=route.action+" ↗";
    }));
  });
  const guide=document.querySelector(".cosmos-concierge");
  if(guide){
    const launcher=guide.querySelector(".concierge-launch"),panel=guide.querySelector(".concierge-panel");
    function open(value){panel.hidden=!value;launcher.setAttribute("aria-expanded",String(value));launcher.setAttribute("aria-label",value?"Close Ember guide":"Open Ember guide");guide.classList.toggle("is-open",value);if(value)panel.querySelector(".concierge-close").focus({preventScroll:true});}
    launcher.addEventListener("click",()=>open(panel.hidden));
    guide.querySelector(".concierge-close").addEventListener("click",()=>{open(false);launcher.focus({preventScroll:true});});
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){open(false);launcher.focus({preventScroll:true});}});
    document.addEventListener("click",event=>{if(!guide.contains(event.target)&&!panel.hidden)open(false);});
    if("IntersectionObserver" in window){
      const prompts={"ai-lab":"Explore an AI example","planet-ember":"Find your starting point","request":"Help with your brief","services":"Find the right fit"};
      new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&prompts[entry.target.id])launcher.querySelector("span:not(.concierge-dot)").textContent=prompts[entry.target.id];}),{threshold:.15}).observe(document.querySelector("#ai-lab")||document.querySelector("#request")||document.querySelector("#main-content"));
    }
  }

  // Enhance the existing intake contract; all names, conditional requirements,
  // submissions and fallback destinations stay owned by journeys.js / site.js.
  const form=document.querySelector(".client-brief-section form");
  if(!form)return;
  const field=name=>form.elements.namedItem(name);
  const label=name=>field(name)?.closest("label");
  const grouping=[
    {title:"Your starting point",nodes:[form.querySelector(".journey-picker")]},
    {title:"What you want to do",nodes:[...form.querySelectorAll(".journey-details"),label("notes"),label("timing"),form.querySelector(".brief-specifics")]},
    {title:"How to reach you",nodes:[label("name"),label("email"),label("business"),label("phone"),form.querySelector(".form-consent"),form.querySelector(".form-note")]},
  ];
  if(grouping.some(group=>!group.nodes.some(Boolean)))return;
  const submit=form.querySelector('[type="submit"]');if(!submit)return;
  const progress=document.createElement("ol");progress.className="brief-progress";progress.setAttribute("aria-label","Your project brief");
  for(const [index,title] of [...grouping.map(group=>group.title),"Review & send"].entries()){const li=document.createElement("li");li.textContent=`0${index+1} / ${title}`;progress.append(li);}
  form.prepend(progress);
  const steps=grouping.map((group,index)=>{const wrapper=document.createElement("div");wrapper.className="brief-wizard-step";wrapper.dataset.briefStep=String(index);group.nodes.filter(Boolean).forEach(node=>wrapper.append(node));form.append(wrapper);return wrapper;});
  const review=document.createElement("section");review.className="brief-review brief-wizard-step";review.dataset.briefStep="3";review.setAttribute("aria-label","Review your brief");
  const reviewIntro=document.createElement("p");reviewIntro.textContent="Check the details below. You can go back to edit any answer before sending.";review.append(reviewIntro);
  const summary=document.createElement("dl");review.append(summary);review.append(submit);form.append(review);steps.push(review);
  const controls=document.createElement("div");controls.className="brief-wizard-controls";
  const back=document.createElement("button");back.type="button";back.className="button button-secondary";back.textContent="← Back";
  const next=document.createElement("button");next.type="button";next.className="button button-primary";next.textContent="Continue →";
  const status=document.createElement("p");status.className="brief-stage-status";status.setAttribute("aria-live","polite");
  controls.append(back,status,next);form.append(controls);
  let current=0;
  function summarize(){
    summary.replaceChildren();
    const journey=field("journey")?.value;
    const values=[["Starting point",journey==="business"?"An existing business":"A new idea or personal project"],["Your goal",journey==="business"?field("business_goal")?.value:field("startup_goal")?.value],["Your brief",field("notes")?.value],["Timing",field("timing")?.value],["Name",field("name")?.value],["Email",field("email")?.value],["Project / business",field("business")?.value],["Phone / WhatsApp",field("phone")?.value]];
    for(const [name,value] of values){if(!value)continue;const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=name;dd.textContent=value;row.append(dt,dd);summary.append(row);}
  }
  function show(index,moveFocus=true){
    current=index;steps.forEach((step,i)=>{step.hidden=i!==index;});
    [...progress.children].forEach((li,i)=>{if(i===index)li.setAttribute("aria-current","step");else li.removeAttribute("aria-current");});
    back.hidden=index===0;next.hidden=index===3;status.textContent=`Step ${index+1} of 4`;
    const guideImage=document.querySelector(".concierge-launch img");if(guideImage)guideImage.src=index===1?"/brand/ember-planning-v2.webp":index===3?"/brand/ember-building-v2.webp":"/brand/ember-welcome-v2.webp";
    if(index===3)summarize();
    if(moveFocus){progress.tabIndex=-1;progress.focus({preventScroll:true});progress.scrollIntoView({block:"start",behavior:"instant"});}
  }
  next.addEventListener("click",()=>{
    const invalid=[...steps[current].querySelectorAll("input,select,textarea")].find(input=>input.willValidate&&!input.checkValidity());
    if(invalid){invalid.reportValidity();return;}show(Math.min(3,current+1));
  });
  back.addEventListener("click",()=>show(Math.max(0,current-1)));
  // Intercept Enter only before review; native validation and final submission
  // still run through the original intake handler on the last step.
  form.addEventListener("keydown",event=>{if(event.key==="Enter"&&event.target.tagName==="INPUT"&&!["radio","checkbox"].includes(event.target.type)&&current<3){event.preventDefault();next.click();}});
  form.addEventListener("invalid",event=>{const index=steps.findIndex(step=>step.contains(event.target));if(index>=0&&index!==current)show(index);},true);
  form.classList.add("is-guided-brief");show(0,false);
})();
