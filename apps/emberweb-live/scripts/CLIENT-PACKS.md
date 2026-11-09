The public PDFs are committed in `assets/downloads` and copied by the static build.
They are snapshots dated November 2026, with no private client data or implementation details.
Company contact information comes from `company.mjs`; project descriptions come from
`PORTFOLIO_PROJECTS` in `portfolio.mjs`. Keep those sources current before regenerating.

To regenerate with Python 3, ReportLab and Pillow available:

```powershell
node scripts/client-pack-data.mjs "$env:TEMP/emberweb-client-pack-data.json"
python scripts/create-client-packs.py "$env:TEMP/emberweb-client-pack-data.json"
```

The generator currently uses Windows Arial fonts. Preview every page with a PDF renderer
after any content change; it checks page bounds but visual review is still required.
Check that all current public portfolio records are included, links work, and no private
project endpoints, records, architecture or credentials have entered the copy.
