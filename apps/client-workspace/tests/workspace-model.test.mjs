import test from "node:test";
import assert from "node:assert/strict";
import { validSeedCommand,validAgentUpdate } from "../src/lib/workspace-model.ts";
import { normalizeLead,publicLeadUrl } from "../src/lib/lead-research.ts";
const id="11111111-1111-4111-8111-111111111111";
test("project commands require valid versions and bounded progress",()=>{
 const p={action:"stage",submissionId:id,seedId:id,version:3,progress:65,stage:"building"};
 assert.equal(validSeedCommand(p),true);for(const value of [{...p,version:0},{...p,progress:101},{...p,stage:"starting"},{...p,seedId:"invalid"}])assert.equal(validSeedCommand(value),false);
});
test("agent writes cannot publish, choose another actor or exceed text limits",()=>{
 const p={submissionId:id,body:"Review completed",clientSummary:"Draft only"};assert.equal(validAgentUpdate(p),true);
 for(const value of [{...p,published:true},{...p,actorId:id},{...p,stage:"live"},{...p,body:"x".repeat(8001)},null])assert.equal(validAgentUpdate(value),false);
});
test("provider data becomes bounded plain text and unsupported contacts stay empty",()=>{
 const lead=normalizeLead({name:"Company",email:"invented string",phone:"call me",summary:"x".repeat(3000)},"https://business.co.za/contact");assert.equal(lead.email,"");assert.equal(lead.phone,"");assert.equal(lead.summary.length,1500);
 assert.equal(normalizeLead({name:"Company"},"javascript:alert(1)"),null);
 for(const url of ["http://business.co.za","https://127.0.0.1","https://localhost","https://user:pass@business.co.za"])assert.equal(publicLeadUrl(url),"");
});
