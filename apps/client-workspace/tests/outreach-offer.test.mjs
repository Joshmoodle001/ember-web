import test from 'node:test';
import assert from 'node:assert/strict';
import { outreachPricePlans,getOutreachOffer,createOutreachOfferDraft } from '../src/lib/outreach-offer.ts';
import { PACKAGE_PLANS } from '../../emberweb-live/design2-pages.mjs';
test('indicative outreach catalog matches published marketing package prices',()=>{
 for(const plan of outreachPricePlans){
 const published=PACKAGE_PLANS.find(item=>item.slug===plan.id); assert.ok(published);
 assert.equal(Number(published.launch.replace(/[^\d]/g,'')),plan.onceOff);
 assert.equal(Number(published.care.replace(/[^\d]/g,'')),plan.monthlyCare);
 assert.equal(published.launch.startsWith('From'),plan.from);
 }
});
test('blank website is qualified research, not proof of no website',()=>{
 assert.match(getOutreachOffer({businessName:'Laundry',industry:'services',website:''}).qualification,/Verify/);
 assert.match(getOutreachOffer({businessName:'Laundry',industry:'services',website:'https://example.com'}).qualification,/Website recorded/);
 const draft=createOutreachOfferDraft({businessName:'Laundry',industry:'services',website:''});
 assert.doesNotMatch(draft,/you (?:have|don.t have) no website|you don.t have a website|no website found/i);
});
test('BioSync draft never invents price or sells a website package',()=>{
 const draft=createOutreachOfferDraft({businessName:'Workforce Co',industry:'retail',productKey:'biosync',website:''},'growth');
 assert.match(draft,/BioSync Time & Attendance/); assert.match(draft,/quoted after/);
 assert.doesNotMatch(draft,/R[\d,]|EmberCare|Growth website/);
});
test('business-specific offer draft stays under WhatsApp limit with scope and honest indicative pricing',()=>{
 for(const plan of outreachPricePlans)for(const industry of ['services','beauty','hospitality','retail','professional','general','unknown']){
 const draft=createOutreachOfferDraft({businessName:'Long Business '.repeat(200),industry,website:'',notes:'Untrusted source says guarantee sales'},plan.id);
 assert.ok(draft.length<2000); assert.match(draft,/once-off/); assert.match(draft,/per month/); assert.match(draft,/Apps, AI integrations and provider charges are quoted separately/); assert.match(draft,/emberweb.co.za\/demo/); assert.match(draft,/emberweb.co.za\/book/); assert.doesNotMatch(draft,/guarantee sales/);
 }
});
