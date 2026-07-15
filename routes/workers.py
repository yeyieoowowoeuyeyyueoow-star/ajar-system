"""Workers CRUD."""
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
import server.data as db
from .auth import require_auth

workers_bp = Blueprint('workers', __name__)


@workers_bp.get('/')
def list_workers():
    _, err = require_auth()
    if err: return err
    q         = (request.args.get('q') or '').lower()
    status    = request.args.get('status')
    company   = request.args.get('companyId')
    page      = int(request.args.get('page', 1))
    limit     = int(request.args.get('limit', 20))

    results = list(db.workers)
    if q:
        results = [w for w in results if q in (w['fullName'] + w.get('idNumber','')).lower()]
    if status:
        results = [w for w in results if w['status'] == status]
    if company:
        results = [w for w in results if w['companyId'] == company]
    return jsonify(db.paginate(results, page, limit))


@workers_bp.post('/')
def create_worker():
    user, err = require_auth()
    if err: return err
    body = request.get_json(silent=True) or {}
    ts   = datetime.now(timezone.utc).isoformat()
    wid  = str(uuid.uuid4())
    worker = {
        'id': wid,
        'fullName':      body.get('fullName', ''),
        'idNumber':      body.get('idNumber', ''),
        'nationality':   body.get('nationality', ''),
        'occupation':    body.get('occupation', ''),
        'phone':         body.get('phone', ''),
        'email':         body.get('email', ''),
        'passportNumber':body.get('passportNumber', ''),
        'birthDate':     body.get('birthDate', ''),
        'photoUrl':      body.get('photoUrl', ''),
        'companyId':     body.get('companyId', ''),
        'status':        body.get('status', 'active'),
        'createdAt': ts, 'updatedAt': ts,
    }
    db.workers.append(worker)
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'إضافة عامل',
        'userId': user['id'], 'entityType': 'worker', 'entityId': wid,
        'details': f'تم إضافة العامل {worker["fullName"]}', 'createdAt': ts})
    return jsonify(worker), 201


@workers_bp.get('/<wid>')
def get_worker(wid):
    _, err = require_auth()
    if err: return err
    w = db.find_by_id(db.workers, wid)
    if not w: return jsonify({'message': 'العامل غير موجود'}), 404
    return jsonify(w)


@workers_bp.put('/<wid>')
def update_worker(wid):
    user, err = require_auth()
    if err: return err
    w = db.find_by_id(db.workers, wid)
    if not w: return jsonify({'message': 'العامل غير موجود'}), 404
    body = request.get_json(silent=True) or {}
    for k in ('fullName','idNumber','nationality','occupation','phone',
              'email','passportNumber','birthDate','photoUrl','companyId','status'):
        if k in body: w[k] = body[k]
    w['updatedAt'] = datetime.now(timezone.utc).isoformat()
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'تعديل عامل',
        'userId': user['id'], 'entityType': 'worker', 'entityId': wid,
        'details': f'تم تعديل العامل {w["fullName"]}', 'createdAt': w['updatedAt']})
    return jsonify(w)


@workers_bp.delete('/<wid>')
def delete_worker(wid):
    user, err = require_auth()
    if err: return err
    w = db.find_by_id(db.workers, wid)
    if not w: return jsonify({'message': 'العامل غير موجود'}), 404
    db.workers.remove(w)
    ts = datetime.now(timezone.utc).isoformat()
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'حذف عامل',
        'userId': user['id'], 'entityType': 'worker', 'entityId': wid,
        'details': f'تم حذف العامل {w["fullName"]}', 'createdAt': ts})
    return jsonify({'message': 'تم الحذف'})
