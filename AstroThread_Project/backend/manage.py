"""Database and account commands for local development.

Run from the backend folder (uses the database in backend/.env):

    python manage.py migrate
    python manage.py create-user EMAIL [--name NAME] [--role user|owner]
    python manage.py set-role EMAIL user|owner

Passwords are typed at a hidden prompt, never passed as arguments, so they do
not end up in shell history. Existing accounts are never overwritten.
"""
import argparse
import getpass
import sys
from pathlib import Path

import psycopg
from werkzeug.security import generate_password_hash

from app import (
    EMAIL_PATTERN,
    MAX_EMAIL_LENGTH,
    MAX_PASSWORD_LENGTH,
    ROLES,
    get_db_connection,
    normalize_email,
)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"
MIN_PASSWORD_LENGTH = 8


def migrate(_args):
    """Applies every migrations/*.sql file in name order (each is re-runnable)."""
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with get_db_connection() as conn:
        for path in files:
            conn.execute(path.read_text(encoding="utf-8"))
            print(f"Applied {path.name}")


def valid_email(value):
    email = normalize_email(value)
    if len(email) > MAX_EMAIL_LENGTH or not EMAIL_PATTERN.fullmatch(email):
        raise argparse.ArgumentTypeError(f"not a valid email address: {value!r}")
    return email


def prompt_password():
    password = getpass.getpass("Password: ")
    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        sys.exit(
            f"Password must be {MIN_PASSWORD_LENGTH}-{MAX_PASSWORD_LENGTH} characters."
        )
    if getpass.getpass("Repeat password: ") != password:
        sys.exit("Passwords do not match.")
    return password


def create_user(args):
    password = prompt_password()
    with get_db_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, role)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (lower(email)) DO NOTHING
            RETURNING id;
            """,
            (args.name, args.email, generate_password_hash(password), args.role),
        ).fetchone()
    if row is None:
        sys.exit(f"An account for {args.email} already exists; nothing was changed.")
    print(f"Created {args.role} account {args.email} (id {row[0]}).")


def set_role(args):
    with get_db_connection() as conn:
        row = conn.execute(
            """
            UPDATE users SET role = %s, updated_at = CURRENT_TIMESTAMP
            WHERE lower(email) = %s
            RETURNING id;
            """,
            (args.role, args.email),
        ).fetchone()
    if row is None:
        sys.exit(f"No account found for {args.email}.")
    print(f"{args.email} is now a {args.role}.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("migrate", help="create missing tables").set_defaults(
        run=migrate
    )

    create = commands.add_parser("create-user", help="add an account")
    create.add_argument("email", type=valid_email)
    create.add_argument("--name")
    create.add_argument("--role", choices=ROLES, default="user")
    create.set_defaults(run=create_user)

    role = commands.add_parser("set-role", help="promote or demote an account")
    role.add_argument("email", type=valid_email)
    role.add_argument("role", choices=ROLES)
    role.set_defaults(run=set_role)

    args = parser.parse_args(argv)
    try:
        args.run(args)
    except (psycopg.Error, RuntimeError) as error:
        sys.exit(f"Database error: {error}")


if __name__ == "__main__":
    main()
