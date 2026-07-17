"""Permits CRUD + QR code + PDF download."""
import io
import qrcode
from flask import Blueprint, request, jsonify, send_file
import database as db
from routes.auth import require_auth
from pdf.generator import generate_permit_pdf

permits_bp = Blueprint('permits', __name__)


@permits_bp.get('/')
def list_permits():
    _, err = require_auth()
    if err:
        return err
    return jsonify(db.list_permits(
        q=request.args.get('q'),
        status=request.args.get('status'),
        company_id=request.args.get('companyId'),
        worker_id=request.args.get('workerId'),
        page=int(request.args.get('page', 1)),
        limit=int(request.args.get('limit', 20)),
    ))


@permits_bp.post('/')
def create_permit():
    user, err = require_auth()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    permit = db.create_permit(body, user['id'])
    return jsonify(permit), 201


@permits_bp.get('/<pid>')
def get_permit(pid):
    _, err = require_auth()
    if err:
        return err
    p = db.get_permit(pid)
    if not p:
        return jsonify({'message': 'التصريح غير موجود'}), 404
    return jsonify(p)


@permits_bp.put('/<pid>')
def update_permit(pid):
    user, err = require_auth()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    p = db.update_permit(pid, body, user['id'])
    if not p:
        return jsonify({'message': 'التصريح غير موجود'}), 404
    return jsonify(p)


@permits_bp.delete('/<pid>')
def delete_permit(pid):
    user, err = require_auth()
    if err:
        return err
    if not db.delete_permit(pid, user['id']):
        return jsonify({'message': 'التصريح غير موجود'}), 404
    return jsonify({'message': 'تم الحذف'})


@permits_bp.get('/<pid>/qr')
def permit_qr(pid):
    _, err = require_auth()
    if err:
        return err
    p = db.get_permit(pid)
    if not p:
        return jsonify({'message': 'التصريح غير موجود'}), 404
    img = qrcode.make(p['permitNumber'])
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png',
                     download_name=f'{p["permitNumber"]}.png')


@permits_bp.get('/<pid>/pdf')
def permit_pdf(pid):
    _, err = require_auth()
    if err:
        return err
    p = db.get_permit(pid)
    if not p:
        return jsonify({'message': 'التصريح غير موجود'}), 404
    pdf_bytes = generate_permit_pdf(p)
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf',
                     as_attachment=True,
                     download_name=f'{p["permitNumber"]}.pdf')
