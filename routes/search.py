"""Global search across permits, workers, companies."""
from flask import Blueprint, request, jsonify
import server.data as db
from .auth import require_auth

search_bp = Blueprint('search', __name__)


@search_bp.get('/')
def search():
    _, err = require_auth()
    if err: return err
    q = (request.args.get('q') or '').lower()
    if not q:
        return jsonify({'permits': [], 'workers': [], 'companies': []})

    permits = [
        db.enrich_permit(p) for p in db.permits
        if q in (p.get('permitNumber','') + p.get('occupation','')).lower()
    ]
    workers = [
        w for w in db.workers
        if q in (w['fullName'] + w.get('idNumber','')).lower()
    ]
    companies = [
        c for c in db.companies
        if q in c['name'].lower()
    ]
    return jsonify({'permits': permits[:10], 'workers': workers[:10], 'companies': companies[:10]})
