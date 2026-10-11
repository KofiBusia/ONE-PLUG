"""OnePlug Africa: Flask entry point.

Local:   python app.py
Render:  gunicorn app:app   (see render.yaml)
"""
import os

import click
from flask import Flask, jsonify, request
from sqlalchemy.exc import IntegrityError, ProgrammingError

from config import Config
from extensions import limiter
from models import db
from routes import api_bp, pages_bp
from seed import seed_database


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    limiter.init_app(app)
    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)

    with app.app_context():
        # Several gunicorn workers can boot at once; the loser of the race just rolls back
        try:
            db.create_all()
            if app.config.get("AUTO_SEED"):
                seed_database()
        except (IntegrityError, ProgrammingError):
            db.session.rollback()

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify(error="Not found"), 404
        return e

    @app.errorhandler(413)
    def too_large(e):
        return jsonify(error="Upload is too large. Use smaller photos."), 413

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify(error="Too many requests. Wait a moment and try again."), 429

    # Google Maps JavaScript API needs: script-src for the loader + its own gstatic scripts,
    # style-src 'unsafe-inline' (Maps sets inline style="" on the DOM elements it draws --
    # this is Google's own documented CSP requirement, there's no way around it), and img-src
    # for map tiles, icons and (if Street View is ever added) panorama photos.
    CSP = (
        "default-src 'self'; "
        "script-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com "
        "https://*.googleapis.com https://*.ggpht.com https://streetviewpixels-pa.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' https://maps.googleapis.com https://*.googleapis.com; "
        "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    )

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        if resp.content_type and resp.content_type.startswith("text/html"):
            resp.headers.setdefault("Content-Security-Policy", CSP)
        return resp

    @app.cli.command("seed-db")
    @click.option("--reset", is_flag=True, help="Drop all tables and reload the demo data.")
    def seed_db_command(reset):
        """Load demo countries, networks and stations."""
        n = seed_database(reset=reset)
        click.echo(f"Seeded {n} stations." if n else "Database already has stations. Use --reset to reload.")

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
