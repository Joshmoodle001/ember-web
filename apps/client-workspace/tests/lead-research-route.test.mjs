import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source=await readFile(new URL('../src/app/api/admin/leads/route.ts',import.meta.url),'utf8');
const id='11111111-1111-4111-8111-111111111111';
async function harness(options={}) {
 const calls=[];let paidCalls=0;
 const mocks={
 'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200})}},
 '@/lib/admin':{requireSuperAdmin:async()=>options.denied?{ok:false,response:{status:403}}:{ok:true,user:{id}}},
 '@/lib/supabase/service':{createServiceClient:()=>({rpc:async(name,args)=>{calls.push(args);return {data:{started:false,run:{id,status:'completed',results:[]}},error:null};}})},
 '@/lib/staff-origin':{hasAllowedStaffOrigin:()=>!options.crossOrigin},
 '@/lib/request-body':{readLimitedText:request=>request.text()},
 '@/lib/rate-limit':{checkRateLimits:async()=>!options.rateLimited},
 '@/lib/client-account':{isUuid:value=>value===id},'@/lib/workspace-model':{validSeedCommand:()=>false},
 '@/lib/lead-research':{},'@/lib/website-audit':{normalizePublicResearchPage:value=>{if(value.includes('localhost'))throw Error();return value;}},cheerio:{},
 'scrapegraph-js':{ScrapeGraphAI:()=>{paidCalls++;return {};}}
 };
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};vm.runInNewContext(compiled,{exports:mod.exports,module:mod,require:name=>mocks[name],process:{env:{SGAI_API_KEY:options.configured?'test-key':undefined}},URL});
 const request=(body)=>new Request('https://portal.emberweb.co.za/api/admin/leads',{method:'POST',body:JSON.stringify(body)});
 return {...mod.exports,request,calls,paid:()=>paidCalls};
}
const payload={action:'run',mode:'search',input:'Guesthouses Durban',submissionId:id};
test('clients and ordinary admins cannot read or run lead research',async()=>{const t=await harness({denied:true});assert.equal((await t.GET(new Request('https://portal.emberweb.co.za/api/admin/leads'))).status,403);assert.equal((await t.POST(t.request(payload))).status,403);assert.equal(t.calls.length,0);assert.equal(t.paid(),0);});
test('cross-origin and rate-limited scrapes never reach the provider',async()=>{for(const options of [{crossOrigin:true},{rateLimited:true}]){const t=await harness({...options,configured:true});assert.ok([403,429].includes((await t.POST(t.request(payload))).status));assert.equal(t.calls.length,0);assert.equal(t.paid(),0);}});
test('missing API key reports setup rather than fake scrape results',async()=>{const t=await harness();const r=await t.POST(t.request(payload));assert.equal(r.status,503);assert.match(r.body.error,/SGAI_API_KEY/);assert.equal(t.paid(),0);});
test('a repeated submission returns its saved run without another paid call',async()=>{const t=await harness({configured:true});const r=await t.POST(t.request(payload));assert.equal(r.status,200);assert.equal(r.body.reused,true);assert.equal(t.calls[0].p_action,'begin');assert.equal(t.paid(),0);});
test('unsafe website targets and malformed requests never start a run',async()=>{const t=await harness({configured:true});for(const body of [{...payload,mode:'website',input:'https://localhost/'},{...payload,submissionId:'invalid'},null])assert.equal((await t.POST(t.request(body))).status,400);assert.equal(t.calls.length,0);assert.equal(t.paid(),0);});
