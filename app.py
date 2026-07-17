"""Flask application factory."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from config import Config
from database import init_db
from routes.auth import auth_bp
from routes.permits import permits_bp
from routes.workers import workers_bp
from routes.companies import companies_bp
from routes.users import users_bp
from routes.dashboard import dashboard_bp
from routes.logs import logs_bp
from routes.search import search_bp
from routes.web import web_bp


def create_app() -> Flask:
    app = Flask(__name__,
                template_folder='templates',
                static_folder='static')
    app.config.from_object(Config)
    CORS(app)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    with app.app_context():
        init_db()

    # ── API blueprints ──────────────────────────────────────────────────
    app.register_blueprint(auth_bp,      url_prefix='/api/auth')
    app.register_blueprint(permits_bp,   url_prefix='/api/permits')
    app.register_blueprint(workers_bp,   url_prefix='/api/workers')
    app.register_blueprint(companies_bp, url_prefix='/api/companies')
    app.register_blueprint(users_bp,     url_prefix='/api/users')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(logs_bp,      url_prefix='/api/logs')
    app.register_blueprint(search_bp,    url_prefix='/api/search')

    # ── Web UI ──────────────────────────────────────────────────────────
    app.register_blueprint(web_bp)

    @app.route('/api/health')
    def health():
        from flask import jsonify
        return jsonify({'status': 'ok'}), 200

    return app
