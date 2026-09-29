import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr


def get_mail_config():
    """Retrieve email configuration from environment variables."""
    server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    port = int(os.getenv("MAIL_PORT", "587"))
    use_tls = os.getenv("MAIL_USE_TLS", "true").lower() in ("true", "1", "yes")
    username = os.getenv("MAIL_USERNAME", "").strip()
    password = os.getenv("MAIL_PASSWORD", "").strip()
    from_name = os.getenv("MAIL_FROM_NAME", "Pregnify Team").strip()

    return {
        "server": server,
        "port": port,
        "use_tls": use_tls,
        "username": username,
        "password": password,
        "from_name": from_name,
    }


def send_password_reset_otp_email(to_email: str, user_name: str, otp_code: str):
    """
    Send a 6-digit OTP password reset email via Gmail SMTP.
    
    Raises:
        ValueError: If Gmail username or app password is not configured.
        smtplib.SMTPAuthenticationError: If authentication fails.
        Exception: If SMTP connection or sending fails.
    """
    config = get_mail_config()

    if not config["username"] or not config["password"]:
        raise ValueError(
            "Gmail SMTP credentials are not configured in backend/.env. "
            "Please set MAIL_USERNAME and MAIL_PASSWORD (Gmail App Password)."
        )

    # Format recipient name safely
    display_name = user_name.strip() if user_name else "User"

    # Plaintext message body
    plain_text = f"""Subject: Pregnify Password Reset OTP

Hello {display_name},

We received a request to reset your Pregnify account password.

Your verification code is:

{otp_code}

This OTP will expire in 1 minute.

If you did not request a password reset, please ignore this email.

Pregnify Team
"""

    # HTML message body
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pregnify Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520px" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #f3f4f6;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #db2777; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Pregnify</h1>
              <p style="margin: 4px 0 0 0; color: #fce7f3; font-size: 14px;">Maternal Care & Pregnancy Tracking</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #1f2937;">
                Hello <strong>{display_name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 22px; color: #4b5563;">
                We received a request to reset your Pregnify account password. Use the verification code below to complete your password reset:
              </p>

              <!-- OTP Box -->
              <div style="text-align: center; margin: 28px 0;">
                <div style="display: inline-block; background-color: #fdf2f8; border: 2px dashed #ec4899; border-radius: 12px; padding: 16px 36px; text-align: center;">
                  <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #be185d; font-family: monospace;">{otp_code}</span>
                </div>
              </div>

              <!-- Expiry Note -->
              <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px 16px; border-radius: 6px; margin: 24px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 18px; color: #9f1239;">
                  ⏱ <strong>This code will expire in 1 minute.</strong> For security reasons, please do not share this code with anyone.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                &copy; Pregnify Team &bull; All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Pregnify Password Reset OTP"
    msg["From"] = formataddr((config["from_name"], config["username"]))
    msg["To"] = to_email

    # Attach plaintext first, then html
    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Connect to SMTP server
    server_address = config["server"]
    port = config["port"]

    if port == 465:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(server_address, port, context=context, timeout=15) as server:
            server.login(config["username"], config["password"])
            server.send_message(msg)
    else:
        with smtplib.SMTP(server_address, port, timeout=15) as server:
            if config["use_tls"]:
                context = ssl.create_default_context()
                server.starttls(context=context)
            server.login(config["username"], config["password"])
            server.send_message(msg)

    return True
