export function clearWorkspaceCookies(){
 for(const cookie of document.cookie.split(";")){
  const name=cookie.split("=")[0].trim();
  if(name.startsWith("sb-")&&name.includes("-auth-token"))document.cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;
 }
}
