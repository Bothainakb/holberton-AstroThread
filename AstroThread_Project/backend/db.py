"""PostgreSQL connection shared by every part of the API."""
import os

import psycopg


def get_db_connection():
    password = os.getenv("DB_PASSWORD")

    if not password:
        raise RuntimeError(
            "DB_PASSWORD is not set. Check your backend/.env file."
        )

    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "astrothread_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=password,
    )
