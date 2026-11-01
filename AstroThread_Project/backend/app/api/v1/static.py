
from flask import Blueprint, jsonify

static_bp = Blueprint("static_v1", __name__)


@static_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})
