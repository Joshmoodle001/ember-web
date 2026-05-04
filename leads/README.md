# Leads Data - Ember Web Futuristic

This folder contains all lead generation data for the Ember Web Futuristic business (web design, SEO, AI solutions, social media marketing).

## Folder Structure

```
leads/
├── master_leads.json          # Master file with 2,725 leads (JSON format)
├── master_leads_formatted.csv  # Formatted CSV with priority labels
├── master_leads_formatted.xlsx # Excel with RED/ORANGE/GREEN color coding
├── leads_summary.json        # Statistics and summary data
├── combine_leads.py         # Script to merge Excel + JSON leads
├── format_master.py         # Script to format and color-code leads
└── docs/
    ├── CONTINUE.md          # Live working memory (session log)
    ├── MASTER_SUMMARY.md    # Lead statistics summary report
    ├── OUTREACH_PLAN.md    # Comprehensive outreach strategy
    └── (other documentation)
```

## Key Files

### Data Files
- **master_leads.json** (2,725 leads) - Master JSON with all leads combined
  - 70 HIGH-PRIORITY (RED) - No website or score <30/100
  - 78 MEDIUM-PRIORITY (ORANGE) - Score 30-70/100
  - 2,577 LOW-PRIORITY (GREEN) - Score >70/100
  - 2,606 leads (95.6%) have NO website - prime prospects!

- **master_leads_formatted.xlsx** - Excel file with color coding:
  - 🔴 RED cells = High priority (call immediately)
  - 🟠 ORANGE cells = Medium priority
  - 🟢 GREEN cells = Low priority

- **leads_summary.json** - Statistics:
  - Total leads: 2,725
  - By industry: Home Services (776), Professional Services (301), etc.
  - By location: Johannesburg areas
  - By priority: RED/ORANGE/GREEN counts

### Documentation
- **OUTREACH_PLAN.md** - Comprehensive 8-section outreach plan:
  1. Segmentation Strategy
  2. Multi-Channel Outreach (Email, Phone, WhatsApp, LinkedIn, SMS)
  3. Spam Avoidance Tactics
  4. Personalization Framework
  5. Follow-Up Sequence (5-touch)
  6. Compliance & Legal (POPIA, CAN-SPAM)
  7. Success Metrics (KPIs)
  8. Team Workflow

- **MASTER_SUMMARY.md** - Summary report with:
  - Top 10 high-priority leads
  - Statistics by industry/location
  - Quality scores

- **CONTINUE.md** - Live working memory for this project

### Scripts
- **combine_leads.py** - Merged new Excel leads with existing JSON
- **format_master.py** - Created formatted outputs with color coding

## Quick Start

### View Leads
1. Open `master_leads_formatted.xlsx` in Excel
2. Sort by "Priority Score" column (highest first)
3. Start with RED leads (no website = highest conversion potential)

### Execute Outreach
1. Read `docs/OUTREACH_PLAN.md`
2. Start with 70 RED leads (Section 5: Follow-Up Sequence)
3. Use email templates from the plan
4. Track responses in CRM

### Regenerate Files (if needed)
```bash
python combine_leads.py   # Re-merge leads
python format_master.py   # Re-format with colors
```

## Source Data

Original lead sources:
- `C:\Users\joshm\Desktop\App\EMBER WEB\Website search\.tmp\` (original files)
- `C:\Users\joshm\Desktop\App\EMBER WEB\Website search\Lead Gen - 2026-03-30.xlsx` (new Excel)

## Obsidian Vault

All files are also synced to:
`C:\Users\joshm\Documents\Obsidian\00 - AI Brain\Projects\`

Graph View: Search "Website search - Master Index" in Obsidian

---

**Last Updated**: 2026-04-30
**Total Leads**: 2,725
**Business**: Ember Web Futuristic (Web Design, SEO, AI, Social Media)
**Target Market**: Johannesburg, South Africa
