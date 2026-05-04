#!/usr/bin/env python3
"""
Scrape additional leads for top 10 business types that need websites most
Target: Home Services, Professional Services, Food & Hospitality, Beauty & Fitness, Other Small Businesses
"""
import os
import json
from datetime import datetime

# Business types to scrape (from analysis)
BUSINESS_TYPES = [
    # Home Services
    {"name": "plumber", "category": "Home Services"},
    {"name": "electrician", "category": "Home Services"},
    {"name": "contractor", "category": "Home Services"},
    {"name": "handyman", "category": "Home Services"},
    {"name": "painter", "category": "Home Services"},
    
    # Professional Services
    {"name": "attorney", "category": "Professional Services"},
    {"name": "accountant", "category": "Professional Services"},
    {"name": "real estate agency", "category": "Professional Services"},
    {"name": "insurance broker", "category": "Professional Services"},
    {"name": "architect", "category": "Professional Services"},
    
    # Food & Hospitality
    {"name": "restaurant", "category": "Food & Hospitality"},
    {"name": "cafe", "category": "Food & Hospitality"},
    {"name": "catering company", "category": "Food & Hospitality"},
    {"name": "bakery", "category": "Food & Hospitality"},
    {"name": "coffee shop", "category": "Food & Hospitality"},
    
    # Beauty & Fitness
    {"name": "hair salon", "category": "Beauty & Fitness"},
    {"name": "beauty salon", "category": "Beauty & Fitness"},
    {"name": "gym", "category": "Beauty & Fitness"},
    {"name": "spa", "category": "Beauty & Fitness"},
    {"name": "nail salon", "category": "Beauty & Fitness"},
    
    # Other Small Businesses
    {"name": "auto repair", "category": "Other Small Businesses"},
    {"name": "car wash", "category": "Other Small Businesses"},
    {"name": "pet grooming", "category": "Other Small Businesses"},
    {"name": "tattoo shop", "category": "Other Small Businesses"},
    {"name": "laundry", "category": "Other Small Businesses"},
]

# Johannesburg areas to target
AREAS = [
    "Johannesburg CBD",
    "Sandton",
    "Randburg",
    "Roodepoort",
    "Midrand",
    "Rosebank",
    "Fourways",
    "Bryanston",
    "Edenvale",
    "Bedfordview"
]

def generate_queries():
    """Generate search queries for Google Maps scraper"""
    queries = []
    
    for business in BUSINESS_TYPES:
        for area in AREAS[:5]:  # Limit to 5 areas per business type to avoid too many
            query = f"{business['name']} in {area}"
            queries.append({
                "query": query,
                "category": business['category'],
                "business_type": business['name']
            })
    
    return queries

def save_queries(queries, output_path):
    """Save queries to file for scraper"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for q in queries:
            f.write(q['query'] + '\n')
    
    print(f"Saved {len(queries)} queries to: {output_path}")

def create_scrape_script(queries_path, output_dir):
    """Create a PowerShell script to run the Google Maps scraper"""
    script = f"""# Scrape leads for top business types
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

$queriesFile = "{queries_path}"
$outputDir = "{output_dir}"
$outputCsv = "$outputDir\\gmaps_top_businesses.csv"

# Create output directory if not exists
if (-not (Test-Path $outputDir)) {{
    New-Item -Path $outputDir -ItemType Directory -Force
}}

# Run Docker scraper
docker rm gmaps-scraper 2>$null
docker run --name gmaps-scraper `
  -v gmaps-playwright-cache:/opt `
  -v "$(Resolve-Path $queriesFile):/queries.txt" `
  -v "$(Resolve-Path $outputCsv):/results.csv" `
  gosom/google-maps-scraper `
  -input /queries.txt `
  -results /results.csv `
  -exit-on-inactivity 5m `
  -depth 3 -email -lang en -c 4

Write-Output "Scraping complete! Results saved to: $outputCsv"
"""
    
    script_path = os.path.join(output_dir, "scrape_top_businesses.ps1")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script)
    
    print(f"Created scrape script: {script_path}")
    return script_path

def main():
    base_dir = r"C:\Users\joshm\Desktop\App\EMBER WEB\ember-web-futuristic\leads"
    queries_path = os.path.join(base_dir, "scrape_queries.txt")
    output_dir = base_dir
    
    print("="*70)
    print("GENERATING SCRAPE QUERIES FOR TOP BUSINESS TYPES")
    print("="*70)
    
    # Generate queries
    queries = generate_queries()
    print(f"\nGenerated {len(queries)} search queries")
    
    # Save queries
    save_queries(queries, queries_path)
    
    # Create scrape script
    script_path = create_scrape_script(queries_path, output_dir)
    
    # Show sample queries
    print(f"\nSample queries (first 10):")
    for i, q in enumerate(queries[:10], 1):
        print(f"  {i}. {q['query']} ({q['category']})")
    
    print(f"\nTo run the scraper:")
    print(f"  1. Open PowerShell")
    print(f"  2. cd \"{output_dir}\"")
    print(f"  3. .\\scrape_top_businesses.ps1")
    print(f"\nOr manually run Docker command with queries from: {queries_path}")
    
    print("\n" + "="*70)
    print("QUERIES GENERATED SUCCESSFULLY!")
    print("="*70)

if __name__ == "__main__":
    main()
