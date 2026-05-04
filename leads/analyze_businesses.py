#!/usr/bin/env python3
"""Analyze leads to find top 10 business types that need websites most"""
import json
from collections import defaultdict

# Load master leads
leads = []
with open('master_leads.json', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            try:
                leads.append(json.loads(line))
            except:
                continue

print(f"Total leads loaded: {len(leads)}")

# Analyze by industry
industry_stats = defaultdict(lambda: {
    'total': 0,
    'no_website': 0,
    'with_website': 0,
    'priorities': [],
    'leads_no_website': []
})

for lead in leads:
    industry = (lead.get('industry') or lead.get('category') or '').strip()
    if not industry or industry.lower() == 'null':
        continue
    
    industry_stats[industry]['total'] += 1
    
    priority = lead.get('priority_score', 0) or 0
    industry_stats[industry]['priorities'].append(priority)
    
    has_website = lead.get('has_website', False)
    website = lead.get('website', '')
    no_website = not has_website or not website or str(website).strip() == ''
    
    if no_website:
        industry_stats[industry]['no_website'] += 1
        industry_stats[industry]['leads_no_website'].append({
            'title': lead.get('title', 'Unknown'),
            'phone': lead.get('phone', 'N/A'),
            'priority': priority
        })
    else:
        industry_stats[industry]['with_website'] += 1

# Calculate averages and percentages
industry_list = []
for industry, stats in industry_stats.items():
    total = stats['total']
    no_web = stats['no_website']
    avg_priority = sum(stats['priorities']) / len(stats['priorities']) if stats['priorities'] else 0
    pct_no_web = (no_web / total * 100) if total > 0 else 0
    
    industry_list.append({
        'industry': industry,
        'total': total,
        'no_website': no_web,
        'with_website': stats['with_website'],
        'pct_no_website': pct_no_web,
        'avg_priority': avg_priority,
        'leads_no_website': stats['leads_no_website']
    })

# Sort by % without website (highest first)
sorted_by_pct = sorted(industry_list, key=lambda x: x['pct_no_website'], reverse=True)

print("\n" + "="*70)
print("TOP 10 BUSINESS TYPES (by % WITHOUT WEBSITE - most need sites)")
print("="*70)
for i, stat in enumerate(sorted_by_pct[:10], 1):
    print(f"{i:2}. {stat['industry']:35} {stat['no_website']:4}/{stat['total']:4} no website ({stat['pct_no_website']:5.1f}%) | Avg Priority: {stat['avg_priority']:5.1f}")

# Sort by average priority (highest first)
sorted_by_priority = sorted(industry_list, key=lambda x: x['avg_priority'], reverse=True)

print("\n" + "="*70)
print("TOP 10 BUSINESS TYPES (by AVG PRIORITY SCORE - most urgent)")
print("="*70)
for i, stat in enumerate(sorted_by_priority[:10], 1):
    print(f"{i:2}. {stat['industry']:35} {stat['no_website']:4}/{stat['total']:4} no website ({stat['pct_no_website']:5.1f}%) | Avg Priority: {stat['avg_priority']:5.1f}")

# Show top 5 leads for #1 industry (most needy)
if sorted_by_pct:
    top_industry = sorted_by_pct[0]
    print(f"\n" + "="*70)
    print(f"TOP 5 LEADS WITHOUT WEBSITE: {top_industry['industry']}")
    print("="*70)
    for i, lead in enumerate(top_industry['leads_no_website'][:5], 1):
        title = (lead.get('title') or 'Unknown')[:40]
        phone = (lead.get('phone') or 'N/A')[:15]
        priority = lead.get('priority', 0)
        print(f"{i:2}. {title:40} | Phone: {phone:15} | Priority: {priority}")

# Also show by total leads
sorted_by_total = sorted(industry_list, key=lambda x: x['total'], reverse=True)

print("\n" + "="*70)
print("TOP 10 BUSINESS TYPES (by TOTAL LEADS)")
print("="*70)
for i, stat in enumerate(sorted_by_total[:10], 1):
    print(f"{i:2}. {stat['industry']:35} {stat['total']:4} total | {stat['no_website']:4} no website ({stat['pct_no_website']:5.1f}%)")
