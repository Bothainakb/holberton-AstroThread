"""Design-only research threads that may show live data without a database record.

These threads exist only in the frontend design data (frontend/src/data/threads.ts).
Their pages may load OpenAlex papers and NASA images by slug; nothing else is
available for them. A fixed list, so the design routes cannot be used to search
OpenAlex or NASA for arbitrary text. Must match DESIGN_PAPER_PREVIEWS in
frontend/src/pages/ThreadDetails/useOpenAlexPapers.ts (a test checks this).
"""

# Dark Matter has a database record (migration 007); its preview is kept for
# databases that have not applied 007 yet. The library has no other topics.
DESIGN_THREADS = {
    "dark-matter": "Dark Matter",
}
