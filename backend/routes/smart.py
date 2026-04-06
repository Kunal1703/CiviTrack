"""
Smart Detection Routes - AI-powered categorization and analysis
"""

from flask import Blueprint, request, jsonify
from services.categorizer import categorize_text, detect_priority, analyze_issue

smart_bp = Blueprint('smart', __name__)


@smart_bp.route('/api/smart/categorize', methods=['POST'])
def categorize():
    """
    Auto-categorize text based on keywords.
    
    Request body:
        {
            "title": "Issue title",
            "description": "Issue description"
        }
    
    Response:
        {
            "suggested_category": "Garbage",
            "confidence": 0.85,
            "matched_keywords": ["garbage", "trash"],
            "all_matches": { ... }
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body required'}), 400
    
    title = data.get('title', '')
    description = data.get('description', '')
    
    if not title and not description:
        return jsonify({'error': 'Title or description required'}), 400
    
    result = categorize_text(title, description)
    return jsonify(result)


@smart_bp.route('/api/smart/priority', methods=['POST'])
def priority():
    """
    Detect priority level based on text analysis.
    
    Request body:
        {
            "title": "Issue title",
            "description": "Issue description"
        }
    
    Response:
        {
            "priority": "high",
            "matched_keywords": ["urgent", "dangerous"],
            "confidence": 0.9
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body required'}), 400
    
    title = data.get('title', '')
    description = data.get('description', '')
    
    if not title and not description:
        return jsonify({'error': 'Title or description required'}), 400
    
    result = detect_priority(title, description)
    return jsonify(result)


@smart_bp.route('/api/smart/analyze', methods=['POST'])
def analyze():
    """
    Complete analysis of issue text including category and priority.
    
    Request body:
        {
            "title": "Issue title",
            "description": "Issue description"
        }
    
    Response:
        {
            "category": {
                "suggested_category": "Pothole",
                "confidence": 0.9,
                "matched_keywords": ["pothole", "road"]
            },
            "priority": {
                "priority": "high",
                "matched_keywords": ["dangerous"],
                "confidence": 0.8
            }
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body required'}), 400
    
    title = data.get('title', '')
    description = data.get('description', '')
    
    if not title and not description:
        return jsonify({'error': 'Title or description required'}), 400
    
    result = analyze_issue(title, description)
    return jsonify(result)
