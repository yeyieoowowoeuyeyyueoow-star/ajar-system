"""Activity logs."""
from flask import Blueprint, request, jsonify
import server.data as db
from .auth import require_auth

logs_bp = Blueprint('logs', __name__)


@logs_bp.get('/')
def list_logs():
    _, err = require_auth()
    if err: return err
    q          = (request.args.get('q') or '').lower()
    user_id    = request.args.get('userId')
    action     = request.args.get('action')
    entity_type = request.args.get('entityType')
    page       = int(request.args.get('page', 1))
    limit      = int(request.args.get('limit', 20))

    results = list(db.logs)
    if user_id:
        results = [l for l in results if l.get('userId') == user_id]
    if action:
        results = [l for l in results if action in l.get('action', '')]
    if entity_type:
        results = [l for l in results if l.get('entityType') == entity_type]
    if q:
        results = [l for l in results if q in (l.get('action','') + l.get('details','')).lower()]

    enriched = []
    for log in results:
        u = db.find_by_id(db.users, log.get('userId', ''))
        enriched.append({**log, 'userName': u['fullName'] if u else 'النظام'})

    return jsonify(db.paginate(enriched, page, limit))
