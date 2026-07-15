"""Dashboard statistics."""
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
import server.data as db
from .auth import require_auth

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('/stats')
def stats():
    _, err = require_auth()
    if err: return err
    today = datetime.now(timezone.utc).date()
    soon  = today + timedelta(days=30)
    active   = sum(1 for p in db.permits if p['status'] == 'active')
    expiring = sum(1 for p in db.permits
                   if p['status'] == 'active' and p.get('expiryDate','') <= str(soon))
    return jsonify({
        'totalPermits':   len(db.permits),
        'activePermits':  active,
        'totalWorkers':   len(db.workers),
        'totalCompanies': len(db.companies),
        'expiringPermits': expiring,
        'pendingPermits': sum(1 for p in db.permits if p['status'] == 'pending'),
    })


@dashboard_bp.get('/permits-by-status')
def permits_by_status():
    _, err = require_auth()
    if err: return err
    counts: dict = {}
    for p in db.permits:
        s = p['status']
        counts[s] = counts.get(s, 0) + 1
    return jsonify([{'status': k, 'count': v} for k, v in counts.items()])


@dashboard_bp.get('/expiring-soon')
def expiring_soon():
    _, err = require_auth()
    if err: return err
    days  = int(request.args.get('days', 30))
    limit = int(request.args.get('limit', 10))
    today = datetime.now(timezone.utc).date()
    soon  = today + timedelta(days=days)
    result = [
        db.enrich_permit(p) for p in db.permits
        if p['status'] == 'active' and p.get('expiryDate','') <= str(soon)
    ]
    result.sort(key=lambda x: x.get('expiryDate', ''))
    return jsonify(result[:limit])


@dashboard_bp.get('/activity')
def activity():
    _, err = require_auth()
    if err: return err
    limit = int(request.args.get('limit', 10))
    enriched = []
    for log in db.logs[:limit]:
        u = db.find_by_id(db.users, log.get('userId', ''))
        enriched.append({**log, 'userName': u['fullName'] if u else 'النظام'})
    return jsonify(enriched)
