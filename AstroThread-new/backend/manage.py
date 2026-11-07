
import sys
from pathlib import Path

import psycopg

import app  
from app.db import get_connection

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def migrate():
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with get_connection() as conn:
        for path in files:
            conn.execute(path.read_text(encoding="utf-8"))
            print(f"Applied {path.name}")


def main():
    if sys.argv[1:] != ["migrate"]:
        sys.exit("Usage: python manage.py migrate")
    try:
        migrate()
    except psycopg.Error as error:
        sys.exit(f"Database error: {error}")


if __name__ == "__main__":
    main()
