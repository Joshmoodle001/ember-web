import { clamp, smooth, cardFlight, chapterAt, genesisAt, INTRO_DURATION, celestialPose } from "./galaxy-motion.mjs?v=20261108-atlas";
import { createUniverseRenderer } from "./galaxy-renderer.mjs?v=20261108-atlas";

const stage = document.querySelector(".galaxy-stage");
if (stage) {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 760px)");
  const entry = document.querySelector(".universe-entry");
  const ignite = entry.querySelector(".universe-ignite");
  const skip = entry.querySelector(".universe-skip");
  const caption = entry.querySelector(".entry-caption");
  const replay = document.querySelector(".universe-replay");
  const main = document.querySelector("#main-content");
  const formation = document.querySelector(".cosmos-formation");
  const homeworld=document.querySelector(".ember-homeworld");
  const closePass=document.querySelector(".cosmos-close-pass");
  const nodes=[...document.querySelectorAll("[data-system-node]")];
  const beatElements = [...document.querySelectorAll(".formation-beat")];
  const cards = [...document.querySelectorAll("[data-galaxy-card]")];
  const chapters = [...document.querySelectorAll("[data-cosmos-scene]")];
  const chapterLabel = document.querySelector(".cosmos-chapter");
  const labels = ["00 / THE SPARK", "01 / FORMATION", "02 / POSSIBILITIES", "03 / CONNECTED WORLDS", "04 / EXPANSION"];
  const properties = ["x", "y", "z", "yaw", "pitch", "roll", "scale", "opacity", "blur"];
  const renderer = createUniverseRenderer(stage.querySelector(".universe-canvas"), stage.querySelector(".universe-particles"), () => {stage.dataset.fallback="true";});
  stage.dataset.renderer = renderer.renderer;
  let width=1,height=1,boxes=[],geometry=[],formationBox=null,closeBox=null,homeworldBox=null,needsMeasure=true;
  let frame=0,lastFrame=0,lastPaint=0,elapsed=0,scene=0,lastScene=0,filmTime=0;
  let mouseX=0,mouseY=0,pointerX=0,pointerY=0,scrollDirty=true;
  let mode="world",savedFocus=null,quality=1,slowFrames=0,paintCount=0;
  const motionEnabled=()=>root.classList.contains("motion-enabled")&&!reduced.matches;
  const topOf=element=>{let top=0;for(let current=element;current;current=current.offsetParent)top+=current.offsetTop;return top;};

  function measure() {
    width=innerWidth;height=innerHeight;
    renderer.resize(width,height,compact.matches,quality);
    boxes=cards.map(element=>({element,top:topOf(element),height:element.offsetHeight,width:element.offsetWidth}));
    geometry=chapters.map(element=>({top:topOf(element),height:element.offsetHeight,scene:Number(element.dataset.cosmosScene)}));
    formationBox=formation?{top:topOf(formation),height:formation.offsetHeight}:null;
    closeBox=closePass?{top:topOf(closePass),height:closePass.offsetHeight}:null;
    homeworldBox=homeworld?{top:topOf(homeworld),height:homeworld.offsetHeight}:null;
    needsMeasure=false;
  }
  function resetCards() {
    cards.forEach(element=>{element.classList.remove("is-galaxy-active");properties.forEach(property=>element.style.removeProperty("--card-"+property));});
  }
  function updateCards(scrollY) {
    for(const {element,top,height:cardHeight,width:cardWidth} of boxes) {
      const y=top-scrollY;
      if(!cardWidth||!cardHeight||y>height*1.4||y+cardHeight< -height*.4){element.classList.remove("is-galaxy-active");continue;}
      const values=cardFlight(y,cardHeight,height,cards.indexOf(element),compact.matches);
      element.classList.add("is-galaxy-active");
      for(const property of properties){const unit=["x","y","z","blur"].includes(property)?"px":["yaw","pitch","roll"].includes(property)?"deg":"";element.style.setProperty("--card-"+property,values[property].toFixed(4)+unit);}
    }
  }
  function updateFormation(scrollY) {
    if(!formationBox)return;
    const progress=clamp((scrollY-formationBox.top)/Math.max(1,formationBox.height-height));
    formation.style.setProperty("--formation-progress",progress.toFixed(5));
    formation.dataset.beat=String(Math.min(2,Math.floor(progress*3)));
    // Keep the full text in document order. Only the pinned composition changes.
    beatElements.forEach((element,index)=>{
      const phase=progress*3-index;
      const opacity=smooth(phase/.18)*(1-smooth((phase-.84)/.16));
      element.style.setProperty("--beat-opacity",opacity.toFixed(4));
      element.style.setProperty("--beat-y",((1-smooth(phase/.22))*42).toFixed(2)+"px");
    });
  }
  function updateClosePass(scrollY){
    if(!closeBox)return;
    const progress=clamp((scrollY-closeBox.top)/Math.max(1,closeBox.height-height));
    closePass.style.setProperty("--system-progress",progress.toFixed(5));
    nodes.forEach((node,index)=>{
      const enter=motionEnabled()?1-smooth((progress*4-index+.2)/.75):0;
      node.style.setProperty("--node-enter",enter.toFixed(5));
      node.dataset.active=String(progress*4>=index);
    });
  }
  function updateHomeworld(scrollY){
    if(!homeworldBox)return;
    const travel=motionEnabled()?clamp((scrollY-homeworldBox.top+height)/(homeworldBox.height+height)):.5;
    homeworld.style.setProperty("--world-turn",(-8+travel*16).toFixed(3)+"deg");
    homeworld.style.setProperty("--world-scale",(.9+travel*.2).toFixed(4));
    homeworld.style.setProperty("--world-rise",((travel-.5)*-90).toFixed(3)+"px");
  }
  function lockPage(locked) {
    if(locked) {
      for(const element of document.body.children){if(element===entry||element===stage||element.tagName==="SCRIPT"||element.inert)continue;element.inert=true;element.dataset.cosmosInert="";}
    } else {
      document.querySelectorAll("[data-cosmos-inert]").forEach(element=>{element.inert=false;delete element.dataset.cosmosInert;});
    }
  }
  function finishIntro(restoreFocus=true) {
    const wasEntry=mode!=="world";
    mode="world";filmTime=INTRO_DURATION;entry.hidden=true;
    root.classList.remove("cosmos-gated","cosmos-opening");
    root.style.removeProperty("--intro-collapse");root.style.removeProperty("--intro-reveal");
    stage.dataset.intro="complete";lockPage(false);
    const heading=main.querySelector("h1");
    if(heading)heading.tabIndex=-1;
    if(restoreFocus)(savedFocus?.isConnected?savedFocus:heading)?.focus({preventScroll:true});
    if(wasEntry){
      try { sessionStorage.setItem("ember:visited-atlas","1"); } catch {}
      window.scrollTo({top:0,behavior:"instant"});
      if ("history" in window) window.history.scrollRestoration="auto";
    }
    request(true);
  }
  function prepareIntro() {
    savedFocus=document.activeElement?.closest?.(".universe-replay")||null;
    window.scrollTo({top:0,behavior:"instant"});
    for(const key of ["--infall","--blast","--radius"])entry.style.removeProperty(key);
    entry.hidden=false;ignite.disabled=false;caption.textContent="";filmTime=0;mode="idle";scene=0;elapsed=0;
    root.classList.add("cosmos-gated");root.classList.remove("cosmos-opening");
    root.style.setProperty("--intro-collapse","0");root.style.setProperty("--intro-reveal","0");
    stage.dataset.intro="idle";lockPage(true);ignite.focus({preventScroll:true});request(true);
  }
  function startIntro() {
    if(mode!=="idle")return;
    if(!motionEnabled()){finishIntro();return;}
    mode="film";filmTime=0;lastFrame=0;ignite.disabled=true;
    root.classList.add("cosmos-opening");stage.dataset.intro="collapse";skip.focus({preventScroll:true});request();
  }
  function tick(now) {
    frame=0;if(document.hidden)return;
    const dt=Math.min(80,lastFrame?now-lastFrame:16);lastFrame=now;
    if(needsMeasure)measure();
    const active=motionEnabled();
    const scrollY=window.scrollY||0;
    const target=chapterAt(scrollY,height,geometry);
    const film=mode==="film";
    if(film&&!active){finishIntro();return;}
    if(active) {
      elapsed+=dt/1000;
      pointerX+=(mouseX-pointerX)*.05;pointerY+=(mouseY-pointerY)*.05;
      if(mode==="world")scene+=(target-scene)*(1-Math.exp(-dt*.006));
      if(scrollDirty&&mode==="world")updateCards(scrollY);
    }else resetCards();
    if(film)filmTime+=dt;
    const intro=genesisAt(filmTime);
    const isEntry=mode!=="world";
    if(film){
      root.style.setProperty("--intro-collapse",intro.collapse.toFixed(5));
      root.style.setProperty("--intro-reveal",intro.reveal.toFixed(5));
      entry.style.setProperty("--infall", (intro.collapse*(1-intro.explosion)).toFixed(4));
      entry.style.setProperty("--blast", (intro.explosion*(1-intro.reveal)).toFixed(4));
      entry.style.setProperty("--radius",intro.expansion.toFixed(4));
      if(caption.textContent!==intro.caption)caption.textContent=intro.caption;
      stage.dataset.intro=intro.explosion>.1?"expansion":intro.tunnel>.1?"tunnel":"collapse";
    }
    if(scrollDirty||film||now-lastPaint>(compact.matches?40:30)||!active||mode==="idle") {
      const paintStart=performance.now();
      renderer.draw({time:elapsed,scene:film?intro.reveal*1.72:1.72+scene*.65,pointerX,pointerY,velocity:Math.abs(scene-lastScene),entry:isEntry?1:0,
        collapse:isEntry?intro.collapse:0,tunnel:isEntry?intro.tunnel:0,explosion:isEntry?intro.explosion:0,expansion:isEntry?intro.expansion:0,reveal:isEntry?intro.reveal:1});
      lastScene=scene;lastPaint=now;
      stage.dataset.scene=scene.toFixed(4);
      const bodies=celestialPose(scene);
      for(const [key,value] of Object.entries(bodies)){const name=key.replace(/[A-Z]/g,match=>"-"+match.toLowerCase());const unit=/[XY]$/.test(key)?"%":"";stage.style.setProperty("--"+name,(isEntry&&key.endsWith("Opacity")?0:value).toFixed(5)+unit);}
      if(mode==="world"){
        if(chapterLabel)chapterLabel.textContent=labels[Math.min(4,Math.floor(scene))];
        if(active||scrollDirty){updateFormation(scrollY);updateClosePass(scrollY);updateHomeworld(scrollY);}
      }
      // Cap pixel work on sustained slow devices. Text/layout are independent.
      if(performance.now()-paintStart>22)slowFrames++;
      if(++paintCount===90&&slowFrames>35&&quality>.7){quality=.7;needsMeasure=true;}
      scrollDirty=false;
    }
    if(film&&intro.complete){finishIntro();return;}
    if((active&&mode!=="idle")||film)frame=requestAnimationFrame(tick);
  }
  function request(again=false){if(again)needsMeasure=true;scrollDirty=true;if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
  ignite.addEventListener("click",startIntro);
  skip.addEventListener("click",()=>finishIntro());
  replay?.addEventListener("click",()=>{if(reduced.matches){finishIntro();return;}prepareIntro();});
  document.addEventListener("keydown",event=>{
    if(mode==="world")return;
    if(event.key==="Escape"){event.preventDefault();finishIntro();}
    if(event.key==="Tab"){
      const first=mode==="idle"?ignite:skip;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();skip.focus();}
      else if(!event.shiftKey&&document.activeElement===skip){event.preventDefault();first.focus();}
    }
  });
  window.addEventListener("scroll",()=>request(),{passive:true});
  window.addEventListener("resize",()=>request(true),{passive:true});
  window.addEventListener("pointermove",event=>{if(compact.matches||event.pointerType!=="mouse"||!motionEnabled())return;mouseX=(event.clientX/width-.5)*2;mouseY=(event.clientY/height-.5)*2;},{passive:true});
  window.addEventListener("blur",()=>{mouseX=0;mouseY=0;});
  document.addEventListener("click",event=>{if(event.target.closest?.("[data-project-target],[data-workflow-target]"))request(true);});
  new MutationObserver(()=>request()).observe(root,{attributes:true,attributeFilter:["class"]});
  reduced.addEventListener("change",()=>{if(reduced.matches&&mode!=="world")finishIntro();request();});
  compact.addEventListener("change",()=>request(true));
  document.addEventListener("visibilitychange",()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;}else request(true);});
  window.addEventListener("pagehide",()=>{if(frame)cancelAnimationFrame(frame);frame=0;});
  window.addEventListener("pageshow",event=>{if(event.persisted){finishIntro(false);request(true);}});
  if("ResizeObserver" in window)new ResizeObserver(()=>request(true)).observe(main);
  document.fonts?.ready.then(()=>request(true));
  if(root.classList.contains("cosmos-gated")&&!reduced.matches)prepareIntro();else finishIntro(false);
  document.dispatchEvent(new Event("ember:cosmos-ready"));
  request(true);
}
