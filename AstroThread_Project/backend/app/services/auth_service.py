"""One-time sign-in codes and the email that delivers them.

Emails are sent with Brevo's transactional email API
(https://developers.brevo.com/reference/sendtransacemail). Set BREVO_API_KEY
and EMAIL_FROM (a sender address verified in Brevo) in backend/.env. For local
development, OTP_PRINT_TO_TERMINAL=true prints codes in the Flask terminal
instead of emailing them.
"""
import json
import os
import secrets
import urllib.error
import urllib.request

from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

BREVO_URL = "https://api.brevo.com/v3/smtp/email"
CODE_LENGTH = 6


class EmailDeliveryError(Exception):
    """The sign-in email could not be sent."""


def generate_code():
    """A random 6-digit code, e.g. "042917"."""
    return f"{secrets.randbelow(10 ** CODE_LENGTH):0{CODE_LENGTH}d}"


def hash_code(code):
    # Codes are stored hashed like passwords, so a database leak exposes none.
    return generate_password_hash(code)


def code_matches(code_hash, code):
    return check_password_hash(code_hash, code)


def send_code_email(email, code, minutes_valid):
    if os.getenv("OTP_PRINT_TO_TERMINAL", "").lower() == "true":
        current_app.logger.warning("Sign-in code for %s: %s", email, code)
        return

    api_key = os.getenv("BREVO_API_KEY")
    sender = os.getenv("EMAIL_FROM")
    if not api_key or not sender:
        raise EmailDeliveryError(
            "BREVO_API_KEY and EMAIL_FROM must be set in backend/.env"
        )

    body = {
        "sender": {
            "email": sender,
            "name": os.getenv("EMAIL_FROM_NAME") or "AstroThread",
        },
        "to": [{"email": email}],
        "subject": f"Your AstroThread code: {code}",
        "textContent": (
            f"Your AstroThread sign-in code is {code}.\n\n"
            f"It expires in {minutes_valid} minutes. If you did not ask "
            "for it, you can ignore this email."
        ),
    }
    request = urllib.request.Request(
        BREVO_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "api-key": api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise EmailDeliveryError(
            f"Brevo responded {error.code}: {detail}"
        ) from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise EmailDeliveryError(f"Could not reach Brevo: {error}") from error
