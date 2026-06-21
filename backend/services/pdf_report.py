from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from sqlalchemy.orm import Session
from models.carbon_record import CarbonRecord
from models.user import User

def generate_pdf_report(user: User, db: Session) -> BytesIO:
    # Fetch logs
    records = db.query(CarbonRecord).filter(CarbonRecord.user_id == user.id).all()
    
    # Calculate stats
    total_co2 = sum(r.co2_output for r in records)
    category_totals = {}
    for r in records:
        category_totals[r.category] = category_totals.get(r.category, 0.0) + r.co2_output
        
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#2e7d32'), # Forest green
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        textColor=colors.HexColor('#555555'),
        spaceAfter=30
    )
    
    header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        textColor=colors.HexColor('#1b5e20'),
        spaceAfter=12
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#333333'),
        spaceAfter=10
    )
    
    story = []
    
    # Title
    story.append(Paragraph("Carbon Footprint Platform - Summary Report", title_style))
    story.append(Paragraph(f"Generated for: {user.username} ({user.email}) | Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Summary Info
    story.append(Paragraph("Emissions Overview", header_style))
    overview_text = f"This report provides a breakdown of your carbon emissions logged to date. Your total recorded footprint is <b>{total_co2:.2f} kg CO2e</b>."
    story.append(Paragraph(overview_text, body_style))
    story.append(Spacer(1, 10))
    
    # Category Breakdowns
    data = [["Category", "Total Emissions (kg CO2e)", "Percentage"]]
    for cat, val in category_totals.items():
        percentage = (val / total_co2 * 100) if total_co2 > 0 else 0
        data.append([cat.capitalize(), f"{val:.2f}", f"{percentage:.1f}%"])
        
    if not category_totals:
        data.append(["No records logged yet", "0.00", "0%"])
        
    t = Table(data, colWidths=[200, 150, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2e7d32')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f1f8e9')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#a5d6a7')),
        ('TOPPADDING', (0,1), (-1,-1), 6),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Recent Logged Activities
    story.append(Paragraph("Recent Activities Log", header_style))
    log_data = [["Date", "Category", "Activity", "Value", "CO2 Output (kg)"]]
    
    sorted_records = sorted(records, key=lambda x: x.date, reverse=True)[:10] # Show top 10 recent
    for r in sorted_records:
        log_data.append([
            r.date.strftime("%Y-%m-%d"),
            r.category.capitalize(),
            r.activity.replace("_", " ").capitalize(),
            f"{r.value:.1f} {r.unit}",
            f"{r.co2_output:.2f}"
        ])
        
    if not sorted_records:
        log_data.append(["-", "-", "-", "-", "0.00"])
        
    log_table = Table(log_data, colWidths=[90, 90, 120, 100, 100])
    log_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1b5e20')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#c8e6c9')),
        ('TOPPADDING', (0,1), (-1,-1), 5),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
    ]))
    story.append(log_table)
    
    # Build Document
    doc.build(story)
    buffer.seek(0)
    return buffer
