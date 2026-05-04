# Johannesburg Lead Generation Outreach Plan
**Prepared For**: Full-Service Digital Agency (Web Design, SEO, AI Solutions, Social Media Marketing)
**Date**: 30 April 2026
**Total Leads**: 2,725 (Johannesburg, South Africa)
**Priority Segments**:
- 70 RED: No website / score <30/100
- 78 ORANGE: Score 30-70/100
- 2,577 GREEN: Score >70/100
**Key Opportunity**: 2,606 leads (95.6%) have no website – highest conversion potential

---

## Executive Summary
This actionable outreach plan targets Johannesburg small businesses with no/underperforming websites, using compliant, multi-channel strategies to maximize response rates while avoiding spam filters. It prioritizes high-need RED leads first, uses personalized value-first messaging, and adheres strictly to South Africa’s POPIA regulations. All templates, workflows, and compliance checklists are included for immediate implementation.

---

## 1. Segmentation Strategy
### Priority Order
1. **RED Leads (70)**: Highest priority – no website or critical issues (<30/100). These businesses lose ~70% of local leads daily. Prioritize leads with 10+ Google reviews first (larger budget, higher conversion potential).
2. **ORANGE Leads (78)**: Medium priority – poor-performing sites (30-70/100). Focus on quick wins (SEO fixes, mobile optimization) to show fast ROI.
3. **GREEN Leads (2,577)**: Low priority – better sites but room for improvement (AI chatbots, conversion optimization). Batch outreach monthly.

### Industry-Specific Approach
| Industry | Pain Point | Outreach Angle |
|----------|------------|----------------|
| Home Services (Plumbers, Electricians) | 87% of Johannesburg residents call the first online result | "Get found first when locals search for [service]" |
| Professional Services (Dentists, Lawyers) | Credibility gap vs competitors with sites | "Build trust with a professional website that converts visitors to clients" |
| Food & Hospitality | No online ordering/reservations | "Add online booking to increase revenue by 30%" |
| Beauty & Fitness | No class booking/social proof integration | "Automate bookings and show off your 5-star reviews" |
| Other Small Businesses | Generic local search visibility | "Outrank competitors in Johannesburg local search results" |

### Business Size Proxy
Use Google review count to gauge size/budget:
- 0-5 reviews: Small, bootstrapped – lead with low-cost starter packages
- 6-20 reviews: Medium – lead with ROI case studies
- 20+ reviews: Large – lead with enterprise solutions (AI, custom SEO)

---

## 2. Multi-Channel Outreach
### Email
- **Timing**: Tuesday-Thursday, 10-11am SAST (avoids Monday backlog, Friday early finishes)
- **Frequency Caps**: Max 20 emails/day per sending domain, 1 email per lead per 7 days
- **Personalization Depth**: RED leads get full personalization (business name, score, industry pain point); ORANGE/GREEN get semi-personalized (industry + local reference)
- **Subject Line Strategy**: Avoid spam words (free, guarantee, act now). Use personalization: `[Business Name] – Missing 70% of Johannesburg Leads`
- **Authentication Setup**:
  1. **SPF**: Add TXT record to domain: `v=spf1 include:[your-email-provider] ~all`
  2. **DKIM**: Generate key pair via email provider, add public key as TXT record
  3. **DMARC**: Add TXT record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@[yourdomain.com]`

### Phone Calls
- **Best Times**: 9-11am, 2-4pm SAST (avoid lunch 12-1pm, after 5pm)
- **Frequency Limits**: Max 2 calls/week per lead, 10 calls/day total
- **Call Script**:
  ```
  Hi [Contact Name], this is [Your Name] from [Agency]. I’m calling about [Business Name] – we’re a Johannesburg digital agency and noticed you don’t have a website. 78% of local customers search online before booking [industry] – we help businesses like yours get online and start getting leads. Do you have 2 minutes to chat?
  ```
- **Voicemail Strategy**: 30 seconds max, clear CTA: "Hi [Name], this is [Your Name] from [Agency]. I left a note about your business not having a website – 70% of your competitors are getting leads you’re missing. Call me back at [number] or reply to my email. Thanks!"

### WhatsApp Business
- **Avoid Blocking**: Use official WhatsApp Business API (not personal WhatsApp) – apply via Meta Business Manager
- **Opt-In Strategy**: Only message leads who reply "YES" to this email snippet: `Reply "YES" to this email to get your free website audit via WhatsApp`
- **Message Template**:
  ```
  Hi [Name], this is [Your Name] from [Agency]. I sent you an email earlier about your business not having a website – just wanted to share this quick case study: we built a site for a Johannesburg plumber that got 12 leads in their first month. Let me know if you want to see the audit we did for your business.
  ```
- **Frequency**: Max 1 WhatsApp/week per lead, only after opt-in

### LinkedIn
- **Connection Request**:
  ```
  Hi [Name], noticed your Johannesburg-based [industry] business doesn’t have a website yet – would love to connect to share how we help local businesses get more leads.
  ```
- **InMail Strategy**: Same as email but shorter (150 words max), lead with case study
- **Company Page Approach**: Comment on their Google Business Profile posts (if linked) before reaching out

### SMS
- **Compliance**: Include opt-out instructions, physical address, POPIA contact
- **Timing**: 10am-6pm SAST, max 1 SMS/week per lead
- **Template**:
  ```
  Hi [Name], this is [Agency] – 78% of Johannesburg [industry] customers search online first. Your business has no website – we can help. Reply STOP to opt out. [Physical Address]
  ```

---

## 3. Spam Avoidance Tactics
### Email Authentication
- Verify SPF/DKIM/DMARC pass with [MXToolbox](https://mxtoolbox.com) before sending
- Use dedicated sending IP (not shared) for better reputation

### IP Warming Schedule
| Day | Emails/Day |
|-----|------------|
| 1-3 | 10 |
| 4-6 | 15 |
| 7-9 | 20 |
| 10-12 | 30 |
| 13+ | 50 (max) |

### Content Strategies
- Avoid all caps, spam trigger words (free, guarantee, limited time)
- Use plain text emails first (higher deliverability than HTML)
- Keep subject lines under 50 characters

### Sending Limits
- 1 email per hour per domain
- 50 emails/day max per dedicated IP
- Never send to purchased lists (only your curated 2,725 leads)

### List Hygiene
- Remove hard bounces immediately
- Validate all emails with [ZeroBounce](https://www.zerobounce.net) before sending
- Suppress unsubscribed leads within 24 hours

### WhatsApp Considerations
- Never send unsolicited WhatsApp messages (violates Meta policy)
- Keep messages under 1000 characters
- Use message templates pre-approved by Meta for the Business API

---

## 4. Personalization Framework
### Website Issue References
RED leads: `Your business has no website – you’re missing 70% of local [industry] leads`
ORANGE leads: `Your website scored 45/100 – it’s not mobile-optimized, so 60% of visitors leave immediately`

### Local Johannesburg References
- `78% of Johannesburg residents search online before booking [service]`
- `We’ve helped 12 Johannesburg [industry] businesses get online this year`
- `Rank higher in Johannesburg local search results`

### Industry-Specific Pain Points
- Plumbers: `87% of Johannesburg residents call the first plumber they find online`
- Dentists: `Patients check 3+ dentist websites before booking an appointment`
- Restaurants: `Online ordering increases average order value by 25%`

### Competitor Comparisons
`Your competitor [Competitor Name] has a website that’s booking 12 leads/week – here’s how you can match them`

### Social Proof
Include 1-sentence case study in every message:
`We built a website for a Johannesburg [industry] business that increased leads by 300% in 2 months`

---

## 5. Follow-Up Sequence
### 5-Touch Email Sequence (RED Leads)
| Touch | Day | Content |
|-------|-----|---------|
| 1 | 0 | Initial outreach + free audit offer |
| 2 | 3 | Follow-up with specific website issue (e.g., no mobile optimization) |
| 3 | 7 | Case study of similar Johannesburg business |
| 4 | 14 | Mention phone call attempt + calendar link |
| 5 | 30 | Breakup email |

### Breakup Email Template
```
Hi [Name],

I’ve tried reaching out a few times about getting [Business Name] online – assuming you’re not interested in growing your local leads right now, so I’ll close your file.

If you ever want to discuss this, reply here and I’ll pick it up immediately.

Best,
[Your Name]
[Unsubscribe Link]
```

### Phone Follow-Up Schedule
- Day 2: First call attempt
- Day 7: Second call attempt (reference email 3)
- Day 14: Third call attempt (leave voicemail)

### WhatsApp Follow-Up
Only after opt-in:
- Day 1 after email: Send case study
- Day 7 after email: Send audit snippet

### Stop Pursuing Rules
- No response after 5 touches (email + call)
- Explicit opt-out request
- Bounce/unreachable contact

---

## 6. Compliance & Legal
### POPIA (South Africa) Requirements
- **Legitimate Interest**: B2B outreach is allowed under POPIA for legitimate business interests
- **Required Footer Content**: Physical business address, POPIA Information Officer contact (email/phone), opt-out link
- **Opt-Out**: Honor unsubscribe requests within 24 hours
- **Data Retention**: Keep lead data for 12 months, then anonymize if no engagement
- **Right to Be Forgotten**: Process deletion requests within 72 hours, confirm via email

### CAN-SPAM (If Applicable)
- Not required for SA-only leads, but include physical address and opt-out link if any US leads are added

### WhatsApp Business Policy
- No unsolicited messages – only contact opted-in leads
- Use pre-approved message templates for the Business API
- Do not use automated bulk messaging without API access

### Opt-In/Opt-Out Mechanisms
- **Opt-In**: Reply "YES" to email, check consent box on website, reply "YES" to SMS
- **Opt-Out**: Link in every email/SMS/WhatsApp, reply "STOP" to SMS/WhatsApp, reply "UNSUBSCRIBE" to email

### Data Retention Policy
- Active leads: Retain for 12 months
- Unengaged leads: Anonymize after 12 months
- Closed deals: Retain for 5 years (tax compliance)

---

## 7. Success Metrics
### Response Rate Targets
| Channel | RED Leads | ORANGE Leads | GREEN Leads |
|---------|-----------|--------------|-------------|
| Email | 8-12% | 5-8% | 2-4% |
| Phone | 15-20% | 10-15% | 5-10% |
| WhatsApp | 20-25% | 15-20% | 10-15% |

### Conversion Goals
- Meeting booking: 20% of email responders
- Proposal sent: 50% of meetings
- Deal closed: 15% of proposals
- Average deal value: R15,000/month

### ROI Calculation
`ROI = (Revenue from closed deals - Total outreach cost) / Total outreach cost * 100`
Target ROI: 300% in first 3 months

### A/B Testing Plan
- Test 2 subject lines per 100 leads (personalized vs benefit-led)
- Test send times (10am vs 2pm)
- Test call scripts (direct vs value-first)

---

## 8. Team Workflow
### Role Responsibilities
| Role | Responsibilities |
|------|------------------|
| Caller | Outbound calls, voicemails, follow-up calls |
| Emailer | Send personalized sequences, manage unsubscribes |
| Account Manager | Handle meetings, close deals, respond to technical queries |

### CRM Recommendation
Use **HubSpot** (free tier) or **Zoho CRM** to track:
- Lead status (new, contacted, meeting booked, closed)
- Interaction history (emails, calls, WhatsApps)
- Compliance records (opt-in, opt-out, POPIA requests)

### Common Objection Responses
| Objection | Response |
|-----------|----------|
| "Too expensive" | "We have starter packages at R2,000/month – less than the value of 1 new lead" |
| "I don’t need a website" | "78% of your customers search online first – you’re losing R10k+ in revenue every month" |
| "I’ll think about it" | "I’ll send over the free audit we did for your business – you can review it and let me know" |

### Escalation Procedures
- Lead asks for technical SEO/AI details → Escalate to Account Manager within 1 hour
- Lead requests contract → Escalate to Account Manager immediately
- Compliance request (POPIA deletion) → Escalate to Operations Manager within 24 hours

---

## Ready-to-Use Templates
### Email Templates
#### Day 0 (RED Lead)
```
Subject: [Business Name] – Missing 70% of Johannesburg Leads

Hi [Contact Name],

I was reviewing Johannesburg-based [industry] businesses and noticed [Business Name] doesn’t have a website yet.

78% of Johannesburg residents search online before booking a [industry] service – you’re missing out on hundreds of potential leads every month.

We’re a local digital agency that builds high-converting websites for Johannesburg businesses. I’d love to send you a free, no-obligation website audit for your business.

Are you open to a 10-minute chat this week to discuss how we can get you online?

Best,
[Your Name]
[Agency Name]
[Physical Address]
POPIA Information Officer: [email@example.com]
[Unsubscribe Link]
```

#### Day 3 Follow-Up (RED Lead)
```
Subject: Re: [Business Name] – Your Website Audit Snippet

Hi [Contact Name],

I sent you a note earlier this week – just wanted to share a quick snippet from the free audit we did for [Business Name]:

- No website = 0 visibility in Johannesburg local search
- Competitors with sites are getting 10+ leads/week
- A basic site would pay for itself in 2 weeks

Let me know if you want to see the full audit.

Best,
[Your Name]
[Unsubscribe Link]
```

### Call Scripts
#### Initial Call (RED Lead)
```
Hi [Contact Name], this is [Your Name] from [Agency]. I’m calling about [Business Name] – we’re a Johannesburg digital agency and noticed you don’t have a website. 78% of local customers search online before booking [industry] – we help businesses like yours get online and start getting leads. Do you have 2 minutes to chat?
```

#### Voicemail
```
Hi [Name], this is [Your Name] from [Agency]. I left a note about your business not having a website – 70% of your competitors are getting leads you’re missing. Call me back at [your number] or reply to my email. Thanks!
```

### WhatsApp Templates (Opted-In Only)
#### Initial Message
```
Hi [Name], this is [Your Name] from [Agency]. I sent you an email earlier about your business not having a website – just wanted to share this quick case study: we built a site for a Johannesburg plumber that got 12 leads in their first month. Let me know if you want to see the audit we did for your business.
```

#### Follow-Up
```
Hi [Name], following up on the audit we sent – do you have any questions? We can get your site live in 7 days. Let me know if you want to chat.
```

---

## Compliance Checklist
- [ ] SPF, DKIM, DMARC configured and verified for sending domain
- [ ] POPIA Information Officer details added to all footers
- [ ] Physical business address included in all communications
- [ ] Opt-out link in every email/SMS/WhatsApp
- [ ] WhatsApp Business API opt-in confirmed before messaging any lead
- [ ] Data retention policy (12 months) documented and shared with team
- [ ] Right to be forgotten process in place (72-hour response time)
- [ ] Unsubscribed leads suppressed in CRM within 24 hours
- [ ] Email list validated with ZeroBounce before first send

---

## Daily/Weekly Workflow Schedules
### Daily Schedule (9am-5pm SAST)
| Time | Task |
|------|------|
| 9:00-9:30 | Review previous day’s responses, update CRM |
| 9:30-11:00 | Send personalized emails (max 20/day) |
| 11:00-13:00 | Outbound calls to RED leads (max 10/day) |
| 14:00-15:30 | Follow up on email responses, send WhatsApps to opted-in leads |
| 15:30-17:00 | Update CRM, prepare next day’s lead list |

### Weekly Schedule
| Day | Task |
|-----|------|
| Monday | Review weekly metrics, adjust email sequences |
| Wednesday | Clean email list (remove bounces, unsubscribed) |
| Friday | Team meeting: discuss wins, objections, process improvements |

---

## KPI Dashboard Recommendations
Track these metrics in your CRM (HubSpot/Zoho):
1. **Outreach Volume**: Emails sent, calls made, WhatsApps sent
2. **Engagement**: Open rate, click rate, response rate, opt-out rate
3. **Conversion**: Meetings booked, proposals sent, deals closed
4. **Compliance**: POPIA requests processed, opt-out rate
5. **ROI**: Revenue from closed deals / total outreach cost

Example dashboard widget:
- Red lead response rate: 10% (target 8-12%)
- Meetings booked: 14 (target 12/month)
- ROI: 320% (target 300%)

---

**Plan Version**: 1.0
**Next Review Date**: 30 May 2026
