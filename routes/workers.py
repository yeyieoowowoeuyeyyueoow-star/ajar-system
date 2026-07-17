"""Workers CRUD."""
from flask import Blueprint, request, jsonify
import database as db
from routes.auth import require_auth

workers_bp = Blueprint('workers', __name__)


@workers_bp.get('/')
def list_workers():
    _, err = require_auth()
    if err:
        return err
    return jsonify(db.list_workers(
        q=request.args.get('q'),
        status=request.args.get('status'),
        company_id=request.args.get('companyId'),
        page=int(request.args.get('page', 1)),
        limit=int(request.args.get('limit', 20)),
    ))


@workers_bp.post('/')
def create_worker():
    user, err = require_auth()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    return jsonify(db.create_worker(body, user['id'])), 201


@workers_bp.get('/<wid>')
def get_worker(wid):
    _, err = require_auth()
    if err:
        return err
    w = db.get_worker(wid)
    if not w:
        return jsonify({'message': 'العامل غير موجود'}), 404
    return jsonify(w)


@workers_bp.put('/<wid>')
def update_worker(wid):
    user, err = require_auth()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    w = db.update_worker(wid, body, user['id'])
    if not w:
        return jsonify({'message': 'العامل غير موجود'}), 404
    return jsonify(w)


@workers_bp.delete('/<wid>')
def delete_worker(wid):
    user, err = require_auth()
    if err:
        return err
    if not db.delete_worker(wid, user['id']):
        return jsonify({'message': 'العامل غير موجود'}), 404
    return jsonify({'message': 'تم الحذف'})
