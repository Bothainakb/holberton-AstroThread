"""Small JSON helpers shared by the profile and bookmark routes."""
from flask import jsonify, request


def error(message, status):
    return jsonify({"error": message}), status


def read_json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None
