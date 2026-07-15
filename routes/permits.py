"""Permits CRUD + QR code + PDF download."""
import io
import uuid
from datetime import datetime, timezone

import qrcode
from flask import Blueprint, request, jsonify, send_file

import server.data as db
from .auth import require_auth
from server.pdf.generator import generate_permit_pdf

permits_bp = Blueprint('permits', __name__)


def _qr_bytes(text: str) -> bytes:
    img = qrcode.make(text)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


# ── GET /api/permits ───────────────────────────────────────────────────────────
@permits_bp.get('/')
def list_permits():
    _, err = require_auth()
    if err: return err

    q       = (request.args.get('q') or '').lower()
    status  = request.args.get('status')
    company = request.args.get('companyId')
    worker  = request.args.get('workerId')
    page    = int(request.args.get('page', 1))
    limit   = int(request.args.get('limit', 20))

    results = [db.enrich_permit(p) for p in db.permits]
    if q:
        results = [p for p in results if q in (p.get('permitNumber','') + p.get('workerName','')).lower()]
    if status:
        results = [p for p in results if p.get('status') == status]
    if company:
        results = [p for p in results if p.get('companyId') == company]
    if worker:
        results = [p for p in results if p.get('workerId') == worker]

    return jsonify(db.paginate(results, page, limit))


# ── POST /api/permits ──────────────────────────────────────────────────────────
@permits_bp.post('/')
def create_permit():
    user, err = require_auth()
    if err: return err

    body = request.get_json(silent=True) or {}
    ts   = datetime.now(timezone.utc).isoformat()
    pid  = str(uuid.uuid4())

    permit = {
        'id': pid,
        'permitNumber': body.get('permitNumber') or f'TQ{str(uuid.uuid4().int)[:7]}',
        'workerId':             body.get('workerId', ''),
        'companyId':            body.get('companyId', ''),
        'beneficiaryCompanyId': body.get('beneficiaryCompanyId', ''),
        'occupation':           body.get('occupation', ''),
        'notes':                body.get('notes', ''),
        'workLocation':         body.get('workLocation', ''),
        'status':               body.get('status', 'pending'),
        'startDate':            body.get('startDate', ''),
        'expiryDate':           body.get('expiryDate', ''),
        'issueDate':            body.get('issueDate', ts[:10]),
        'createdAt': ts, 'updatedAt': ts,
    }
    db.permits.append(permit)
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'إنشاء تصريح',
        'userId': user['id'], 'entityType': 'permit', 'entityId': pid,
        'details': f'تم إنشاء التصريح {permit["permitNumber"]}', 'createdAt': ts})
    return jsonify(db.enrich_permit(permit)), 201


# ── GET /api/permits/<id> ──────────────────────────────────────────────────────
@permits_bp.get('/<pid>')
def get_permit(pid):
    _, err = require_auth()
    if err: return err
    p = db.find_by_id(db.permits, pid)
    if not p: return jsonify({'message': 'التصريح غير موجود'}), 404
    return jsonify(db.enrich_permit(p))


# ── PUT /api/permits/<id> ──────────────────────────────────────────────────────
@permits_bp.put('/<pid>')
def update_permit(pid):
    user, err = require_auth()
    if err: return err
    p = db.find_by_id(db.permits, pid)
    if not p: return jsonify({'message': 'التصريح غير موجود'}), 404

    body = request.get_json(silent=True) or {}
    allowed = ('occupation','notes','workLocation','status','startDate',
               'expiryDate','issueDate','companyId','beneficiaryCompanyId',
               'workerId','permitNumber')
    for k in allowed:
        if k in body:
            p[k] = body[k]
    p['updatedAt'] = datetime.now(timezone.utc).isoformat()

    ts = p['updatedAt']
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'تعديل تصريح',
        'userId': user['id'], 'entityType': 'permit', 'entityId': pid,
        'details': f'تم تعديل التصريح {p["permitNumber"]}', 'createdAt': ts})
    return jsonify(db.enrich_permit(p))


# ── DELETE /api/permits/<id> ───────────────────────────────────────────────────
@permits_bp.delete('/<pid>')
def delete_permit(pid):
    user, err = require_auth()
    if err: return err
    p = db.find_by_id(db.permits, pid)
    if not p: return jsonify({'message': 'التصريح غير موجود'}), 404
    db.permits.remove(p)
    ts = datetime.now(timezone.utc).isoformat()
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'حذف تصريح',
        'userId': user['id'], 'entityType': 'permit', 'entityId': pid,
        'details': f'تم حذف التصريح {p["permitNumber"]}', 'createdAt': ts})
    return jsonify({'message': 'تم الحذف'})


# ── GET /api/permits/<id>/qr ───────────────────────────────────────────────────
@permits_bp.get('/<pid>/qr')
def permit_qr(pid):
    _, err = require_auth()
    if err: return err
    p = db.find_by_id(db.permits, pid)
    if not p: return jsonify({'message': 'التصريح غير موجود'}), 404
    data = _qr_bytes(p['permitNumber'])
    return send_file(io.BytesIO(data), mimetype='image/png',
                     download_name=f'{p["permitNumber"]}.png')


# ── GET /api/permits/<id>/pdf ──────────────────────────────────────────────────
@permits_bp.get('/<pid>/pdf')
def permit_pdf(pid):
    _, err = require_auth()
    if err: return err
    p = db.find_by_id(db.permits, pid)
    if not p: return jsonify({'message': 'التصريح غير موجود'}), 404

    enriched = db.enrich_permit(p)
    pdf_bytes = generate_permit_pdf(enriched)
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'{p["permitNumber"]}.pdf',
    )
