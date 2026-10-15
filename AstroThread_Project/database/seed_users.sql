-- Demo accounts for testing the login feature (development only).
--
-- Run after schema.sql, from the AstroThread_Project folder:
--   psql -U postgres -d astrothread_db -f database/seed_users.sql
--
--   Email                       Password         Role
--   demo@astrothread.dev        AstroUser2026    user
--   owner@astrothread.dev       AstroOwner2026   owner
--
-- The owner account can only be created here: the public register endpoint
-- always creates "user" accounts. Never load these passwords in production.
-- Hashes were made with werkzeug.security.generate_password_hash (scrypt).

INSERT INTO users (name, email, password_hash, role) VALUES
    ('Demo User', 'demo@astrothread.dev',
     'scrypt:32768:8:1$cFDG6MddhTbUhyIL$b62f99e2090b717ba5259d2d12f2b522ab90d513dd8eee691b836a85b11fd74fba997bacad3c7a0fc13822cdf792a20090fd240ce10146333b9b3fd232151413',
     'user'),
    ('AstroThread Owner', 'owner@astrothread.dev',
     'scrypt:32768:8:1$l6gB880Ur5ZfUhAr$f2bfa224c58b5ce140d512fcc2ad7fab6e4be0a5e19c51104e89f6420c5deaeaf08e552cf00f7595e4e50f517263d61b1fc1c527da119fd58ce33f47dcedcd13',
     'owner')
ON CONFLICT (email) DO NOTHING;
