"""Audit logs."""
from flask import Blueprint, request, jsonify
import database as db
from routes.auth import require_auth

logs_bp = Blueprint('logs', __name__)


@logs_bp.get('/')
def list_logs():
    _, err = require_auth()
    if err:
        return err
    return jsonify(db.list_logs(
        q=request.args.get('q'),
        user_id=request.args.get('userId'),
        action=request.args.get('action'),
        entity_type=request.args.get('entityType'),
        page=int(request.args.get('page', 1)),
        limit=int(request.args.get('limit', 20)),
    ))
