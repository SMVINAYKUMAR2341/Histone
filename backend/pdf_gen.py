"""ReportLab referral summary PDF generator."""
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)


URGENCY_COLOR = {
    "urgent": colors.HexColor("#e11d48"),
    "routine": colors.HexColor("#f59e0b"),
    "borderline": colors.HexColor("#94a3b8"),
    "no_referral": colors.HexColor("#10b981"),
}


def generate_referral_pdf(assessment: dict, patient: dict | None, pathway_name: str) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.7*inch, rightMargin=0.7*inch,
        topMargin=0.6*inch, bottomMargin=0.6*inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("t", parent=styles["Heading1"], fontSize=18, spaceAfter=6, textColor=colors.HexColor("#0f172a"))
    subtitle = ParagraphStyle("st", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b"))
    section = ParagraphStyle("sec", parent=styles["Heading3"], fontSize=11, textColor=colors.HexColor("#0f172a"), spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle("b", parent=styles["Normal"], fontSize=10, leading=14)
    small = ParagraphStyle("sm", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#64748b"))

    story = []
    story.append(Paragraph("Genetics Referral Summary", title_style))
    story.append(Paragraph("Decision support output — NOT YET CLINICALLY VALIDATED. Not a diagnosis.", subtitle))
    story.append(Spacer(1, 8))

    outcome = assessment.get("outcome", "no_referral")
    outcome_label = {
        "urgent": "REFER — URGENT",
        "routine": "REFER — ROUTINE",
        "borderline": "BORDERLINE — CONSIDER DISCUSSION",
        "no_referral": "NO REFERRAL NEEDED",
    }.get(outcome, outcome.upper())
    color = URGENCY_COLOR.get(outcome, colors.grey)

    outcome_tbl = Table([[Paragraph(f"<font color='white'><b>{outcome_label}</b></font>", body)]], colWidths=[6.9*inch])
    outcome_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), color),
        ("BOX", (0,0), (-1,-1), 0.5, color),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("RIGHTPADDING", (0,0), (-1,-1), 12),
        ("TOPPADDING", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ]))
    story.append(outcome_tbl)
    story.append(Spacer(1, 6))

    # Meta table
    meta_rows = [
        ["Pathway", pathway_name],
        ["Referral target", assessment.get("referral_target", "-")],
        ["Generated", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
    ]
    if patient:
        meta_rows.append(["Patient", f"{patient.get('initials','')} · DOB {patient.get('dob','')} · MRN {patient.get('mrn','')}"])
    tbl = Table(meta_rows, colWidths=[1.6*inch, 5.3*inch])
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#64748b")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    story.append(tbl)

    # Reasoning
    story.append(Paragraph("Reasoning — criteria matched", section))
    matches = assessment.get("matched_criteria", [])
    if not matches:
        story.append(Paragraph("No criteria matched. No referral triggered by the current rule set.", body))
    else:
        for m in matches:
            story.append(Paragraph(f"<b>{m.get('label','')}</b>", body))
            story.append(Paragraph(f"Outcome: {m.get('outcome','').upper()} · Target: {m.get('referral_target','')}", small))
            story.append(Paragraph(f"Source: {m.get('guideline_source','')} — {m.get('citation','')}", small))
            story.append(Spacer(1, 4))

    # Plain-language explanation
    if assessment.get("explanation"):
        story.append(Paragraph("Plain-language summary", section))
        story.append(Paragraph(assessment["explanation"].replace("\n", "<br/>"), body))

    # Input recap
    story.append(Paragraph("Input data", section))
    input_data = assessment.get("input_data", {})
    if input_data:
        for k, v in input_data.items():
            story.append(Paragraph(f"<b>{k}</b>: {v}", small))

    story.append(Spacer(1, 14))
    story.append(Paragraph(
        "This document was produced by an automated decision support tool using placeholder "
        "criteria. It is NOT a substitute for clinical judgement, formal genetic counseling, "
        "or a licensed genetics specialist review.", small))

    doc.build(story)
    return buf.getvalue()
