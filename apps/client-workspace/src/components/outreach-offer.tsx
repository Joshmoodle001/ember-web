"use client";
import Image from "next/image";
import { useState } from "react";
import { createOutreachOfferDraft, formatOfferRand, getOutreachOffer, outreachPricePlans, type OutreachOfferInput, type OutreachPlanId } from "@/lib/outreach-offer";
import "./outreach-offer.css";
export type OutreachOfferProps = OutreachOfferInput & { onUseDraft: (message: string) => void; disabled?: boolean };
export default function OutreachOffer({ onUseDraft, disabled=false, ...input }: OutreachOfferProps) {
 const [planId,setPlanId]=useState<OutreachPlanId>("launch-lite");
 const offer=getOutreachOffer(input);
 const plan=outreachPricePlans.find(item=>item.id===planId)??outreachPricePlans[0];
 return <aside className="outreach-offer" aria-labelledby="outreach-offer-title"><header><p className="eyebrow">ONE BUSINESS · ONE USEFUL IDEA</p><h3 id="outreach-offer-title">{input.businessName.trim()||"Select a business to shape its offer"}</h3><p className="micro-note">{offer.qualification}</p></header>
 <figure><Image src="/outreach/demo-poster.jpg" width={1280} height={720} sizes="(max-width: 760px) 100vw, 440px" alt="Generic EmberWeb demonstration visual, not this business’s website" unoptimized /><figcaption>Illustrative concept, not this business’s current site. <a href="/outreach/demo-poster.jpg" download>Download visual</a></figcaption></figure>
 <h4>{offer.biosync?"BioSync discussion points":"Suggested improvements to discuss"}</h4><ul>{offer.suggestions.map(item=><li key={item}>{item}</li>)}</ul>
 {offer.biosync?<p className="outreach-offer-price">BioSync: quote after requirements review. No fixed product price is assumed.</p>:<><label className="field">Indicative website package<select value={planId} disabled={disabled} onChange={event=>setPlanId(event.target.value as OutreachPlanId)}>{outreachPricePlans.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><dl className="outreach-offer-prices"><div><dt>Once-off website launch</dt><dd>{plan.from?"From ":""}{formatOfferRand(plan.onceOff)}</dd></div><div><dt>Separate EmberCare service</dt><dd>{formatOfferRand(plan.monthlyCare)}<small> / month</small></dd></div></dl><p className="micro-note">Existing public package prices; indicative until scope is agreed. Excludes VAT where applicable. Apps, AI work, premium software and provider charges are quoted separately. <a href="https://emberweb.co.za/packages" target="_blank" rel="noopener noreferrer">Compare package scope ↗</a></p></>}
 <button type="button" className="button button-primary" disabled={disabled||!input.businessName.trim()} onClick={()=>onUseDraft(createOutreachOfferDraft(input,planId))}>Use this draft</button><p className="micro-note">Updates the draft for review only. Contact permission and saved details are still required before WhatsApp handoff.</p></aside>;
}
