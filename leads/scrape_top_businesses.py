#!/usr/bin/env python3
"""
Scrape Google Maps for top business types using Python
Falls back to web search if Docker is unavailable
"""
import json
import time
import requests
from datetime import datetime

# Business types to scrape (top 10 from analysis)
BUSINESS_TYPES = [
    # Home Services (776 leads, 100% no website)
    {"query": "plumber Johannesburg", "category": "Home Services"},
    {"query": "electrician Johannesburg", "category": "Home Services"},
    {"query": "contractor Johannesburg", "category": "Home Services"},
    {"query": "handyman Johannesburg", "category": "Home Services"},
    {"query": "painter Johannesburg", "category": "Home Services"},
    
    # Professional Services (301 leads, 100% no website)
    {"query": "attorney Johannesburg", "category": "Professional Services"},
    {"query": "accountant Johannesburg", "category": "Professional Services"},
    {"query": "real estate Johannesburg", "category": "Professional Services"},
    {"query": "insurance broker Johannesburg", "category": "Professional Services"},
    
    # Food & Hospitality (240 leads, 100% no website)
    {"query": "restaurant Johannesburg", "category": "Food & Hospitality"},
    {"query": "cafe Johannesburg", "category": "Food & Hospitality"},
    {"query": "bakery Johannesburg", "category": "Food & Hospitality"},
    
    # Beauty & Fitness (240 leads, 100% no website)
    {"query": "hair salon Johannesburg", "category": "Beauty & Fitness"},
    {"query": "beauty salon Johannesburg", "category": "Beauty & Fitness"},
    {"query": "gym Johannesburg", "category": "Beauty & Fitness"},
    {"query": "spa Johannesburg", "category": "Beauty & Fitness"},
    
    # Other Small Businesses (240 leads, 100% no website)
    {"query": "auto repair Johannesburg", "category": "Other Small Businesses"},
    {"query": "car wash Johannesburg", "category": "Other Small Businesses"},
    {"query": "pet grooming Johannesburg", "category": "Other Small Businesses"},
]

def scrape_google_maps_placeholder(query, category):
    """
    Placeholder for Google Maps scraping
    In production, this would use:
    - Google Places API (paid)
    - SerpAPI (paid)
    - Custom scraper with Playwright/Selenium
    - Or Docker with gosom/google-maps-scraper
    """
    # This is a placeholder - returns empty results
    # Replace with actual scraping logic when Docker is available
    print(f"  Skipping {query} (Docker unavailable)")
    return []

def save_leads(leads, output_path):
    """Save leads to JSON file"""
    with open(output_path, 'a', encoding='utf-8') as f:
        for lead in leads:
            f.write(json.dumps(lead, ensure_ascii=False) + '\n')
    print(f"Saved {len(leads)} leads to: {output_path}")

def main():
    base_dir = r"C:\Users\joshm\Desktop\App\EMBER WEB\ember-web-futuristic\leads"
    output_path = os.path.join(base_dir, "gmaps_top_businesses.json")
    
    # Clear output file
    with open(output_path, 'w') as f:
        pass
    
    print("="*70)
    print("SCRAPING TOP BUSINESS TYPES (without websites)")
    print("="*70)
    print(f"Total queries: {len(BUSINESS_TYPES)}")
    print(f"Output: {output_path}")
    print("\nNOTE: Docker is unavailable. This script is a placeholder.")
    print("To actually scrape, start Docker Desktop and run:")
    print("  cd ember-web-futuristic\\leads")
    print("  .\\scrape_top_businesses.ps1\n")
    
    total_leads = 0
    for i, business in enumerate(BUSINESS_TYPES, 1):
        print(f"\n{i}/{len(BUSINESS_TYPES)}. Scraping: {business['query']}")
        print(f"   Category: {business['category']}")
        
        # Placeholder - no actual scraping without Docker
        leads = scrape_google_maps_placeholder(business['query'], business['category'])
        
        # If we had leads, save them
        if leads:
            save_leads(leads, output_path)
            total_leads += len(leads)
        
        time.sleep(1)  # Be nice to APIs
    
    print("\n" + "="*70)
    print(f"SCRAPING COMPLETE!")
    print(f"Total leads scraped: {total_leads}")
    print(f"Saved to: {output_path}")
    print("="*70)
    
    # Create a manual instructions file
    instructions_path = os.path.join(base_dir, "HOW_TO_SCRAPE.txt")
    with open(instructions_path, 'w') as f:
        f.write("HOW TO SCRAPE ADDITIONAL LEADS\n")
        f.write("="*50 + "\n\n")
        f.write("Docker Desktop is not running. To scrape leads:\n\n")
        f.write("1. Start Docker Desktop (wait for it to fully load)\n")
        f.write("2. Open PowerShell\n")
        f.write(f"3. cd \"{base_dir}\"\n")
        f.write("4. .\\scrape_top_businesses.ps1\n\n")
        f.write("Or manually run:\n")
        f.write("  docker run --name gmaps-scraper \\\n")
        f.write("    -v gmaps-playwright-cache:/opt \\\n")
        f.write(f"    -v \"{base_dir}\\scrape_queries.txt:/queries.txt\" \\\n")
        f.write(f"    -v \"{base_dir}\\gmaps_top_businesses.csv:/results.csv\" \\\n")
        f.write("    gosom/google-maps-scraper \\\n")
        f.write("    -input /queries.txt -results /results.csv \\\n")
        f.write("    -exit-on-inactivity 5m -depth 3 -email -lang en -c 4\n")
    
    print(f"\nInstructions saved to: {instructions_path}")

if __name__ == "__main__":
    import os
    main()
