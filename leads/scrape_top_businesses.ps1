# Scrape leads for top business types
# Generated: 2026-04-30 11:34:41

$queriesFile = "C:\Users\joshm\Desktop\App\EMBER WEB\ember-web-futuristic\leads\scrape_queries.txt"
$outputDir = "C:\Users\joshm\Desktop\App\EMBER WEB\ember-web-futuristic\leads"
$outputCsv = "$outputDir\gmaps_top_businesses.csv"

# Create output directory if not exists
if (-not (Test-Path $outputDir)) {
    New-Item -Path $outputDir -ItemType Directory -Force
}

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
