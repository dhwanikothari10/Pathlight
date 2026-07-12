"""
Minimal SMTP email helper. Used for password-reset emails.

If SMTP_HOST isn't configured (e.g. local dev), the reset link is logged
to the console instead of sent, so the flow still works without setup.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    subject = "Reset your PathLight password"
    text_body = (
        f"We received a request to reset your PathLight password.\n\n"
        f"Reset it here (link expires in 1 hour):\n{reset_link}\n\n"
        f"If you didn't request this, you can safely ignore this email."
    )
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>We received a request to reset your PathLight password.</p>
      <p>
        <a href="{reset_link}"
           style="display:inline-block;background:#111;color:#fff;padding:12px 20px;
                  border-radius:8px;text-decoration:none;font-weight:600;">
          Reset password
        </a>
      </p>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour.
      If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    if not settings.SMTP_HOST:
        # No SMTP configured (e.g. local dev) — log instead of failing.
        logger.warning(
            "SMTP not configured — password reset link for %s: %s",
            to_email,
            reset_link,
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())