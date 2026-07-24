"""
Direct Gmail-via-SMTP email sender for referral PDFs.
Requires GMAIL_ADDRESS + GMAIL_APP_PASSWORD env vars (Gmail App Password —
NOT the user's regular Google password; create one at
https://myaccount.google.com/apppasswords).
"""
import os
import smtplib
import ssl
from email.message import EmailMessage


class EmailNotConfigured(Exception):
    pass


def is_configured() -> bool:
    return bool(os.environ.get("GMAIL_ADDRESS") and os.environ.get("GMAIL_APP_PASSWORD"))


def send_referral_email(
    to_addr: str,
    subject: str,
    body: str,
    pdf_bytes: bytes,
    pdf_filename: str = "referral.pdf",
    cc: str | None = None,
    reply_to: str | None = None,
) -> dict:
    from_addr = os.environ.get("GMAIL_ADDRESS")
    from_password = os.environ.get("GMAIL_APP_PASSWORD")
    if not (from_addr and from_password):
        raise EmailNotConfigured(
            "GMAIL_ADDRESS and GMAIL_APP_PASSWORD must be set in backend/.env"
        )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    if cc:
        msg["Cc"] = cc
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=pdf_filename,
    )

    recipients = [to_addr]
    if cc:
        recipients.extend([c.strip() for c in cc.split(",") if c.strip()])

    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx, timeout=30) as s:
        s.login(from_addr, from_password)
        s.send_message(msg, from_addr=from_addr, to_addrs=recipients)

    return {"ok": True, "to": to_addr, "cc": cc, "from": from_addr}
