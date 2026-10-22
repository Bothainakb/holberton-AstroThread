"""Database and account commands for local development.

Run from the backend folder (uses the database in backend/.env):

    python manage.py migrate
    python manage.py create-user EMAIL [--name NAME] [--role user|owner]
    python manage.py set-role EMAIL user|owner

There are no passwords: people sign in with a code emailed to them. Existing
accounts are never overwritten.
"""
import argparse
import sys
from pathlib import Path

import psycopg

from app.api.v1.auth import ROLES, normalize_email, valid_email
from app.persistence.database import get_db_connection

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def migrate(_args):
    """Applies every migrations/*.sql file in name order (each is re-runnable)."""
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with get_db_connection() as conn:
        for path in files:
            conn.execute(path.read_text(encoding="utf-8"))
            print(f"Applied {path.name}")


def email_argument(value):
    email = normalize_email(value)
    if not valid_email(email):
        raise argparse.ArgumentTypeError(f"not a valid email address: {value!r}")
    return email


def create_user(args):
    with get_db_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO users (name, email, role)
            VALUES (%s, %s, %s)
            ON CONFLICT (lower(email)) DO NOTHING
            RETURNING id;
            """,
            (args.name, args.email, args.role),
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
    create.add_argument("email", type=email_argument)
    create.add_argument("--name")
    create.add_argument("--role", choices=ROLES, default="user")
    create.set_defaults(run=create_user)

    role = commands.add_parser("set-role", help="promote or demote an account")
    role.add_argument("email", type=email_argument)
    role.add_argument("role", choices=ROLES)
    role.set_defaults(run=set_role)

    args = parser.parse_args(argv)
    try:
        args.run(args)
    except (psycopg.Error, RuntimeError) as error:
        sys.exit(f"Database error: {error}")


if __name__ == "__main__":
    main()
