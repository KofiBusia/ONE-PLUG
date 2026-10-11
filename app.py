"""OnePlug Africa: Flask entry point.

Local:   python app.py
Render:  gunicorn app:app   (see render.yaml)
"""
import os

import click
from flask import Flask, jsonify, request
from sqlalchemy.exc import IntegrityError, ProgrammingError

from config import Config
from models import db
from routes import api_bp, pages_bp
from seed import seed_database


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
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

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
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
