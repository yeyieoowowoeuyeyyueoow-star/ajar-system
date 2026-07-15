"""Flask application factory."""
import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from .config import Config
from .routes.auth     import auth_bp
from .routes.permits  import permits_bp
from .routes.workers  import workers_bp
from .routes.companies import companies_bp
from .routes.users    import users_bp
from .routes.dashboard import dashboard_bp
from .routes.logs     import logs_bp
from .routes.search   import search_bp


PUBLIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    CORS(app)

    # ── API blueprints ────────────────────────────────────────────────
    app.register_blueprint(auth_bp,      url_prefix='/api/auth')
    app.register_blueprint(permits_bp,   url_prefix='/api/permits')
    app.register_blueprint(workers_bp,   url_prefix='/api/workers')
    app.register_blueprint(companies_bp, url_prefix='/api/companies')
    app.register_blueprint(users_bp,     url_prefix='/api/users')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(logs_bp,      url_prefix='/api/logs')
    app.register_blueprint(search_bp,    url_prefix='/api/search')

    # ── Static frontend ───────────────────────────────────────────────
    @app.route('/assets/<path:filename>')
    def assets(filename):
        return send_from_directory(os.path.join(PUBLIC_DIR, 'assets'), filename)

    @app.route('/favicon.svg')
    def favicon():
        return send_from_directory(PUBLIC_DIR, 'favicon.svg')

    @app.route('/robots.txt')
    def robots():
        return send_from_directory(PUBLIC_DIR, 'robots.txt')

    # SPA catch-all – every non-API route serves index.html
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def spa(path):
        if path.startswith('api/'):
            return jsonify({'message': 'Not found'}), 404
        return send_from_directory(PUBLIC_DIR, 'index.html')

    return app
