"""
CiviTrack Backend - Flask REST API

A comprehensive backend for the civic issue detection and management system.
Provides endpoints for issue CRUD, analytics, and smart detection features.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import route blueprints
from routes.issues import issues_bp
from routes.analytics import analytics_bp
from routes.smart import smart_bp

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for frontend communication
CORS(app, origins=Config.CORS_ORIGINS)

# Register blueprints
app.register_blueprint(issues_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(smart_bp)


@app.route('/')
def index():
    """API root endpoint - health check."""
    return jsonify({
        'name': 'CiviTrack API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'issues': '/api/issues',
            'categories': '/api/categories',
            'analytics': '/api/analytics/*',
            'smart': '/api/smart/*'
        }
    })


@app.route('/api/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy'})


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("CiviTrack API Server")
    print("=" * 50)
    print(f"Running on http://localhost:5000")
    print(f"Debug mode: {Config.DEBUG}")
    print(f"CORS origins: {Config.CORS_ORIGINS}")
    print("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=Config.DEBUG
    )
