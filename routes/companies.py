"""Companies CRUD."""
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
import server.data as db
from .auth import require_auth

companies_bp = Blueprint('companies', __name__)


@companies_bp.get('/')
def list_companies():
    _, err = require_auth()
    if err: return err
    q      = (request.args.get('q') or '').lower()
    status = request.args.get('status')
    page   = int(request.args.get('page', 1))
    limit  = int(request.args.get('limit', 20))
    results = list(db.companies)
    if q:
        results = [c for c in results if q in c['name'].lower()]
    if status:
        results = [c for c in results if c['status'] == status]
    return jsonify(db.paginate(results, page, limit))


@companies_bp.post('/')
def create_company():
    user, err = require_auth()
    if err: return err
    body = request.get_json(silent=True) or {}
    ts   = datetime.now(timezone.utc).isoformat()
    cid  = str(uuid.uuid4())
    company = {
        'id': cid,
        'name':          body.get('name', ''),
        'companyNumber': body.get('companyNumber', ''),
        'email':         body.get('email', ''),
        'phone':         body.get('phone', ''),
        'city':          body.get('city', ''),
        'address':       body.get('address', ''),
        'status':        body.get('status', 'active'),
        'createdAt': ts, 'updatedAt': ts,
    }
    db.companies.append(company)
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'إضافة شركة',
        'userId': user['id'], 'entityType': 'company', 'entityId': cid,
        'details': f'تم إضافة الشركة {company["name"]}', 'createdAt': ts})
    return jsonify(company), 201


@companies_bp.get('/<cid>')
def get_company(cid):
    _, err = require_auth()
    if err: return err
    c = db.find_by_id(db.companies, cid)
    if not c: return jsonify({'message': 'الشركة غير موجودة'}), 404
    return jsonify(c)


@companies_bp.put('/<cid>')
def update_company(cid):
    user, err = require_auth()
    if err: return err
    c = db.find_by_id(db.companies, cid)
    if not c: return jsonify({'message': 'الشركة غير موجودة'}), 404
    body = request.get_json(silent=True) or {}
    for k in ('name','companyNumber','email','phone','city','address','status'):
        if k in body: c[k] = body[k]
    c['updatedAt'] = datetime.now(timezone.utc).isoformat()
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'تعديل شركة',
        'userId': user['id'], 'entityType': 'company', 'entityId': cid,
        'details': f'تم تعديل الشركة {c["name"]}', 'createdAt': c['updatedAt']})
    return jsonify(c)


@companies_bp.delete('/<cid>')
def delete_company(cid):
    user, err = require_auth()
    if err: return err
    c = db.find_by_id(db.companies, cid)
    if not c: return jsonify({'message': 'الشركة غير موجودة'}), 404
    db.companies.remove(c)
    ts = datetime.now(timezone.utc).isoformat()
    db.logs.insert(0, {'id': str(uuid.uuid4()), 'action': 'حذف شركة',
        'userId': user['id'], 'entityType': 'company', 'entityId': cid,
        'details': f'تم حذف الشركة {c["name"]}', 'createdAt': ts})
    return jsonify({'message': 'تم الحذف'})
