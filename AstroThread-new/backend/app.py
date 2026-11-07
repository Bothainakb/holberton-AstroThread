from app import app
from app.services import paper_count_service

if __name__ == "__main__":
    paper_count_service.start_background_refresh(app.logger)
    app.run(debug=True, use_reloader=False, port=5000)
