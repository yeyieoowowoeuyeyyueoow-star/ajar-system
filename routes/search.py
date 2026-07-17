"""Global search."""
from flask import Blueprint, request, jsonify
import database as db
from routes.auth import require_auth

search_bp = Blueprint('search', __name__)


@search_bp.get('/')
def search():
    _, err = require_auth()
    if err:
        return err
    q = request.args.get('q', '').strip()
    return jsonify(db.search_all(q))
