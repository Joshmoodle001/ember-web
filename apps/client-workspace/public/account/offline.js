(async()=>{
 const store=window.EmberStore,status=document.getElementById("status"),projects=document.getElementById("projects"),business=document.getElementById("business"),project=document.getElementById("project");
 let identity,accounts=[];
 try{
  identity=(await store.get("identity"))?.value;
  if(!identity||identity.role!=="client"){status.textContent="Connect and sign in to load your private workspace.";return;}
  const snapshot=await store.cached(identity.id,"dashboard");accounts=snapshot?.value?.accounts||[];
  status.textContent=snapshot?`Offline project view · saved ${new Date(snapshot.savedAt).toLocaleString()}`:"Connect once to save your project view on this device.";
  for(const account of accounts){
   const option=document.createElement("option");option.value=account.client.id;option.textContent=account.client.company||account.client.full_name;business.append(option);
   for(const item of account.projects){
    const card=document.createElement("article");card.className="card";
    const heading=document.createElement("h2");heading.textContent=item.title;card.append(heading);
    const detail=document.createElement("p");detail.textContent=`${item.status.replaceAll("_"," ")} · ${item.progress}% at last sync`;card.append(detail);
    const links=document.createElement("div");links.className="project-links";
    for(const resource of item.resources||[]){try{const url=new URL(resource.url);if(url.protocol!=="https:"||url.username||url.password)continue;const a=document.createElement("a");a.href=url.href;a.textContent=resource.title;a.target="_blank";a.rel="noopener noreferrer";links.append(a);}catch{}}
    card.append(links);projects.append(card);
   }
  }
  function choices(){project.replaceChildren();const general=document.createElement("option");general.value="";general.textContent="General account request";project.append(general);for(const item of accounts.find(a=>a.client.id===business.value)?.projects||[]){const option=document.createElement("option");option.value=item.id;option.textContent=item.title;project.append(option);}}
  business.addEventListener("change",choices);choices();document.getElementById("request-card").hidden=!accounts.length;
  document.getElementById("request-form").addEventListener("submit",async event=>{
   event.preventDefault();const form=event.currentTarget,fields=new FormData(form);
   try{await store.enqueue(identity.id,"/api/account/requests",{action:"create",clientId:fields.get("clientId"),projectId:fields.get("projectId")||null,subject:fields.get("subject"),description:fields.get("description"),submissionId:crypto.randomUUID()});form.reset();choices();status.textContent="Request saved on this device. It will sync after your account is verified online.";if(navigator.onLine)await store.flush(identity.id);}catch(error){status.textContent=error.message;}
  });
  window.addEventListener("online",()=>void store.flush(identity.id).then(()=>{status.textContent="Connection restored. Open your full workspace to check the latest updates.";}));
 }catch{status.textContent="Your saved workspace could not be opened. Connect to sign in again.";}
 document.getElementById("sign-out").addEventListener("click",async()=>{
  if(!confirm("Remove saved projects and unsynced requests from this device?"))return;
  if(navigator.onLine)await fetch("/auth/signout",{method:"POST"}).catch(()=>{});
  await store.clear();for(const row of document.cookie.split(";")){const name=row.split("=")[0].trim();if(name.startsWith("sb-")&&name.includes("-auth-token"))document.cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;}
  projects.replaceChildren();document.getElementById("request-card").hidden=true;status.textContent="Signed out on this device. Connect to sign in again.";
 });
})();
