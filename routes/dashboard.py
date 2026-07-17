"""Dashboard statistics."""
from flask import Blueprint, request, jsonify
import database as db
from routes.auth import require_auth

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('/stats')
def stats():
    _, err = require_auth()
    if err:
        return err
    return jsonify(db.dashboard_stats())


@dashboard_bp.get('/permits-by-status')
def permits_by_status():
    _, err = require_auth()
    if err:
        return err
    return jsonify(db.permits_by_status())


@dashboard_bp.get('/expiring-soon')
def expiring_soon_route():
    _, err = require_auth()
    if err:
        return err
    days = int(request.args.get('days', 30))
    limit = int(request.args.get('limit', 10))
    return jsonify(db.expiring_soon(days, limit))


@dashboard_bp.get('/activity')
def activity():
    _, err = require_auth()
    if err:
        return err
    limit = int(request.args.get('limit', 10))
    return jsonify(db.recent_activity(limit))
