from flask import Blueprint, current_app, jsonify, request

from app.services import nasa_images

images_bp = Blueprint("images", __name__)

MIN_QUERY_LENGTH = 2
MAX_QUERY_LENGTH = 100


@images_bp.get("/api/images")
def images():
    query = " ".join(request.args.get("q", "").split())

    if len(query) < MIN_QUERY_LENGTH:
        return jsonify({"error": "Type at least 2 characters to search"}), 400
    if len(query) > MAX_QUERY_LENGTH:
        return jsonify({"error": f"Searches can be at most {MAX_QUERY_LENGTH} characters"}), 400

    try:
        results = nasa_images.search_images(query)
    except nasa_images.NasaImagesError as error:
        current_app.logger.warning("NASA image search failed: %s", error)
        return jsonify({"error": error.message}), error.status

    return jsonify({"query": query, "results": results})
