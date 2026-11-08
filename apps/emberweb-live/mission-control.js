"use strict";
(() => {
  function openLinkedExample() {
    const example = document.getElementById(location.hash.slice(1));
    if (example?.matches("details.case-study")) example.open = true;
  }
  openLinkedExample();
  window.addEventListener("hashchange", openLinkedExample);

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
    const values=[["Starting point",journey==="business"?"An existing business":"A new idea or personal project"],["Your goal",journey==="business"?field("business_goal")?.value:field("startup_goal")?.value],["Stage",journey==="startup"?field("startup_stage")?.value:""],["Audience",journey==="startup"?field("audience")?.value:""],["Current tools",journey==="business"?field("current_tools")?.value:""],["Service",field("need")?.value==="Other"?"":field("need")?.value],["Package",field("package")?.value?.replace(/(^|-)\w/g, key => key.replace("-"," ").toUpperCase())],["Your brief",field("notes")?.value],["Timing",field("timing")?.value],["Name",field("name")?.value],["Email",field("email")?.value],["Project / business",field("business")?.value],["Phone / WhatsApp",field("phone")?.value]];
    for(const [name,value] of values){if(!value)continue;const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=name;dd.textContent=value;row.append(dt,dd);summary.append(row);}
  }
  function show(index,moveFocus=true){
    current=index;steps.forEach((step,i)=>{step.hidden=i!==index;});
    [...progress.children].forEach((li,i)=>{if(i===index)li.setAttribute("aria-current","step");else li.removeAttribute("aria-current");});
    back.hidden=index===0;next.hidden=index===3;status.textContent=`Step ${index+1} of 4`;
    const heading = document.querySelector("#brief-heading");
    const intro = document.querySelector("[data-journey-intro]");
    if (heading) heading.textContent = ["Where are you starting?", "What do you need?", "Your contact details", "Review your brief"][index];
    if (intro) intro.hidden = index !== 0;
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
