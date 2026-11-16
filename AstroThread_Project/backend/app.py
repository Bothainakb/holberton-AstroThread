"""Starts the AstroThread API. Run from the backend folder:  python app.py

The application and all its routes live in the app package (app/__init__.py),
which the tests import too, so the server and the tests run the same routes.
"""
from app import app
from app.services import paper_count_service

if __name__ == "__main__":
    # Fills in the thread cards' OpenAlex paper counts without delaying start-up.
    paper_count_service.start_background_refresh(app.logger)
    app.run(debug=True, use_reloader=False, port=5000)
