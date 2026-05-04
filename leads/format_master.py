#!/usr/bin/env python3
"""
Format master leads with color coding and smart organization
Create both JSON and CSV outputs with proper formatting
"""
import json
import csv
from datetime import datetime

def load_master_leads(json_path):
    """Load leads from master JSON file"""
    leads = []
    with open(json_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    lead = json.loads(line)
                    leads.append(lead)
                except json.JSONDecodeError:
                    continue
    return leads

def organize_by_priority(leads):
    """Organize leads by priority and color code"""
    # Sort by priority score (descending), then by quality score (descending)
    sorted_leads = sorted(leads, key=lambda x: (
        x.get('priority_score', 0) or 0,
        x.get('quality_score', 0) or 0
    ), reverse=True)
    
    # Group by color code
    grouped = {
        'red': [],    # High priority
        'orange': [], # Medium priority
        'green': []   # Low priority
    }
    
    for lead in sorted_leads:
        color = lead.get('color_code', 'green')
        if color in grouped:
            grouped[color].append(lead)
    
    return sorted_leads, grouped

def create_formatted_csv(leads, output_path):
    """Create a well-formatted CSV with color coding"""
    print(f"\nCreating formatted CSV: {output_path}")
    
    # Define CSV columns
    fieldnames = [
        'priority_label', 'color_code', 'title', 'category', 'location', 'address',
        'phone', 'website', 'website_status', 'review_rating', 'review_count',
        'priority_score', 'quality_score', 'pain_points', 'automation_opportunities',
        'source', 'input_source'
    ]
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for lead in leads:
            row = {}
            for field in fieldnames:
                value = lead.get(field, '')
                # Handle None values
                if value is None:
                    value = ''
                # Convert lists/dicts to string
                elif isinstance(value, (list, dict)):
                    value = json.dumps(value)
                row[field] = value
            
            writer.writerow(row)
    
    print(f"Saved {len(leads)} leads to CSV")

def create_excel_with_colors(leads, output_path):
    """Create Excel file with color coding"""
    try:
        import openpyxl
        from openpyxl.styles import PatternFill, Font, Alignment
        from openpyxl.utils import get_column_letter
        
        print(f"\nCreating Excel file with colors: {output_path}")
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Master Leads"
        
        # Define headers
        headers = [
            'Priority', 'Color', 'Business Name', 'Category', 'Location', 'Address',
            'Phone', 'Website', 'Website Status', 'Rating', 'Reviews',
            'Priority Score', 'Quality Score', 'Pain Points', 'Automation Ideas',
            'Source'
        ]
        
        # Write headers
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")
        
        # Color mapping
        color_map = {
            'red': "FF6B6B",    # Light red
            'orange': "FFA500",  # Orange
            'green': "90EE90"    # Light green
        }
        
        # Write data
        for row_idx, lead in enumerate(leads, 2):
            color = lead.get('color_code', 'green')
            fill_color = color_map.get(color, "FFFFFF")
            
            data = [
                lead.get('priority_label', ''),
                color,
                lead.get('title', ''),
                lead.get('category', ''),
                lead.get('location', ''),
                lead.get('address', ''),
                lead.get('phone', ''),
                lead.get('website', ''),
                lead.get('website_status', ''),
                lead.get('review_rating', 0),
                lead.get('review_count', 0),
                lead.get('priority_score', 0),
                lead.get('quality_score', 0),
                lead.get('pain_points', ''),
                lead.get('automation_opportunities', ''),
                lead.get('source', '')
            ]
            
            for col, value in enumerate(data, 1):
                cell = ws.cell(row=row_idx, column=col, value=value)
                cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
                
                # Bold text for high priority
                if color == 'red':
                    cell.font = Font(bold=True)
        
        # Auto-adjust column widths
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column].width = adjusted_width
        
        # Freeze first row
        ws.freeze_panes = 'A2'
        
        wb.save(output_path)
        print(f"Saved {len(leads)} leads to Excel with color coding")
        
    except ImportError:
        print("openpyxl not available, skipping Excel creation")

def create_summary_report(leads, output_path):
    """Create a summary report"""
    print(f"\nCreating summary report: {output_path}")
    
    # Calculate statistics
    total = len(leads)
    with_website = sum(1 for l in leads if l.get('has_website'))
    without_website = total - with_website
    
    high_priority = sum(1 for l in leads if l.get('color_code') == 'red')
    medium_priority = sum(1 for l in leads if l.get('color_code') == 'orange')
    low_priority = sum(1 for l in leads if l.get('color_code') == 'green')
    
    # By industry
    industries = {}
    for lead in leads:
        ind = lead.get('industry', lead.get('category', 'Unknown'))
        industries[ind] = industries.get(ind, 0) + 1
    
    # By location
    locations = {}
    for lead in leads:
        loc = lead.get('location', 'Unknown')
        locations[loc] = locations.get(loc, 0) + 1
    
    # Top leads (high priority, high quality)
    top_leads = [l for l in leads if l.get('color_code') == 'red' and (l.get('quality_score', 0) or 0) > 50]
    
    report = f"""
# Master Leads Summary Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Overview
- **Total Leads**: {total}
- **With Website**: {with_website} ({(with_website/total*100):.1f}%)
- **Without Website**: {without_website} ({(without_website/total*100):.1f}%)
- **High Priority (Red)**: {high_priority} ({(high_priority/total*100):.1f}%)
- **Medium Priority (Orange)**: {medium_priority} ({(medium_priority/total*100):.1f}%)
- **Low Priority (Green)**: {low_priority} ({(low_priority/total*100):.1f}%)

## Top 10 Leads (High Priority + High Quality)
"""
    
    for i, lead in enumerate(top_leads[:10], 1):
        report += f"\n{i}. **{lead.get('title', 'Unknown')}**\n"
        report += f"   - Category: {lead.get('category', 'N/A')}\n"
        report += f"   - Location: {lead.get('location', 'N/A')}\n"
        report += f"   - Phone: {lead.get('phone', 'N/A')}\n"
        report += f"   - Priority Score: {lead.get('priority_score', 0)}\n"
        report += f"   - Quality Score: {lead.get('quality_score', 0):.1f}\n"
        report += f"   - Pain Points: {lead.get('pain_points', 'N/A')}\n"
    
    report += f"\n## By Industry\n"
    for ind, count in sorted(industries.items(), key=lambda x: x[1], reverse=True)[:15]:
        report += f"- {ind}: {count}\n"
    
    report += f"\n## By Location (Top 10)\n"
    for loc, count in sorted(locations.items(), key=lambda x: x[1], reverse=True)[:10]:
        report += f"- {loc}: {count}\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"Summary report saved")

def main():
    base_dir = r"C:\Users\joshm\Desktop\App\EMBER WEB\Website search"
    master_json = os.path.join(base_dir, ".tmp", "master_leads.json")
    formatted_csv = os.path.join(base_dir, ".tmp", "master_leads_formatted.csv")
    formatted_xlsx = os.path.join(base_dir, ".tmp", "master_leads_formatted.xlsx")
    summary_md = os.path.join(base_dir, ".tmp", "MASTER_SUMMARY.md")
    
    print("="*60)
    print("FORMATTING MASTER LEADS")
    print("="*60)
    
    # Load master leads
    print(f"\nLoading master leads from: {master_json}")
    leads = load_master_leads(master_json)
    print(f"Loaded {len(leads)} leads")
    
    # Organize by priority
    print("\nOrganizing leads by priority...")
    sorted_leads, grouped = organize_by_priority(leads)
    
    print(f"\nLeads by color:")
    print(f"  - Red (High Priority): {len(grouped['red'])}")
    print(f"  - Orange (Medium Priority): {len(grouped['orange'])}")
    print(f"  - Green (Low Priority): {len(grouped['green'])}")
    
    # Create formatted CSV
    create_formatted_csv(sorted_leads, formatted_csv)
    
    # Create Excel with colors
    create_excel_with_colors(sorted_leads, formatted_xlsx)
    
    # Create summary report
    create_summary_report(sorted_leads, summary_md)
    
    print("\n" + "="*60)
    print("FORMATTING COMPLETE!")
    print("="*60)
    print(f"\nFiles created:")
    print(f"  1. {formatted_csv}")
    print(f"  2. {formatted_xlsx}")
    print(f"  3. {summary_md}")

if __name__ == "__main__":
    import os
    main()
