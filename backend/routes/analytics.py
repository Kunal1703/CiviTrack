"""
Analytics Routes - Dashboard statistics and trends
"""

from flask import Blueprint, jsonify
from database import execute_query
from services.hotspot import detect_hotspots, refresh_hotspots

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/api/analytics/summary', methods=['GET'])
def get_summary():
    """Get dashboard summary statistics."""
    
    # Total issues
    total_query = "SELECT COUNT(*) as count FROM issues"
    total = execute_query(total_query, fetch_one=True)
    
    # Issues by status
    status_query = """
        SELECT status, COUNT(*) as count 
        FROM issues 
        GROUP BY status
    """
    status_counts = execute_query(status_query, fetch_all=True)
    
    # Format status counts
    status_map = {'pending': 0, 'in_progress': 0, 'resolved': 0}
    for item in (status_counts or []):
        status_map[item['status']] = item['count']
    
    # Resolved today
    resolved_today_query = """
        SELECT COUNT(*) as count 
        FROM issues 
        WHERE status = 'resolved' 
          AND DATE(resolved_at) = CURDATE()
    """
    resolved_today = execute_query(resolved_today_query, fetch_one=True)
    
    # Issues reported today
    new_today_query = """
        SELECT COUNT(*) as count 
        FROM issues 
        WHERE DATE(created_at) = CURDATE()
    """
    new_today = execute_query(new_today_query, fetch_one=True)
    
    # Average resolution time (in hours)
    avg_resolution_query = """
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours
        FROM issues 
        WHERE status = 'resolved' AND resolved_at IS NOT NULL
    """
    avg_resolution = execute_query(avg_resolution_query, fetch_one=True)
    
    return jsonify({
        'total_issues': total['count'] if total else 0,
        'pending': status_map['pending'],
        'in_progress': status_map['in_progress'],
        'resolved': status_map['resolved'],
        'resolved_today': resolved_today['count'] if resolved_today else 0,
        'new_today': new_today['count'] if new_today else 0,
        'avg_resolution_hours': round(avg_resolution['avg_hours'] or 0, 1) if avg_resolution else 0
    })


@analytics_bp.route('/api/analytics/by-category', methods=['GET'])
def get_by_category():
    """Get issues grouped by category."""
    query = """
        SELECT 
            c.id,
            c.name,
            c.icon,
            COUNT(i.id) as count,
            SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN i.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN i.status = 'resolved' THEN 1 ELSE 0 END) as resolved
        FROM categories c
        LEFT JOIN issues i ON c.id = i.category_id
        GROUP BY c.id, c.name, c.icon
        ORDER BY count DESC
    """
    result = execute_query(query, fetch_all=True)
    return jsonify(result or [])


@analytics_bp.route('/api/analytics/by-status', methods=['GET'])
def get_by_status():
    """Get issues grouped by status."""
    query = """
        SELECT 
            status,
            COUNT(*) as count,
            SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
            SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
            SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
        FROM issues
        GROUP BY status
    """
    result = execute_query(query, fetch_all=True)
    return jsonify(result or [])


@analytics_bp.route('/api/analytics/by-priority', methods=['GET'])
def get_by_priority():
    """Get issues grouped by priority."""
    query = """
        SELECT 
            priority,
            COUNT(*) as count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
        FROM issues
        GROUP BY priority
        ORDER BY FIELD(priority, 'high', 'medium', 'low')
    """
    result = execute_query(query, fetch_all=True)
    return jsonify(result or [])


@analytics_bp.route('/api/analytics/trends', methods=['GET'])
def get_trends():
    """Get issue trends over the last 30 days."""
    query = """
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as reported,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
        FROM issues
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    """
    result = execute_query(query, fetch_all=True)
    
    # Convert date objects to strings for JSON serialization
    trends = []
    for item in (result or []):
        trends.append({
            'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None,
            'reported': item['reported'],
            'resolved': item['resolved']
        })
    
    return jsonify(trends)


@analytics_bp.route('/api/analytics/weekly', methods=['GET'])
def get_weekly():
    """Get weekly issue statistics."""
    query = """
        SELECT 
            YEARWEEK(created_at, 1) as year_week,
            MIN(DATE(created_at)) as week_start,
            COUNT(*) as reported,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
        FROM issues
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
        GROUP BY YEARWEEK(created_at, 1)
        ORDER BY year_week ASC
    """
    result = execute_query(query, fetch_all=True)
    
    weekly = []
    for item in (result or []):
        weekly.append({
            'week_start': item['week_start'].strftime('%Y-%m-%d') if item['week_start'] else None,
            'reported': item['reported'],
            'resolved': item['resolved']
        })
    
    return jsonify(weekly)


@analytics_bp.route('/api/analytics/hotspots', methods=['GET'])
def get_hotspots():
    """Get detected hotspot areas."""
    hotspots = detect_hotspots()
    return jsonify(hotspots)


@analytics_bp.route('/api/analytics/hotspots/refresh', methods=['POST'])
def recalculate_hotspots():
    """Recalculate and cache hotspots."""
    hotspots = refresh_hotspots()
    return jsonify({
        'message': 'Hotspots recalculated',
        'count': len(hotspots),
        'hotspots': hotspots
    })


@analytics_bp.route('/api/analytics/locations', methods=['GET'])
def get_issue_locations():
    """Get all issues with location data for map display."""
    query = """
        SELECT 
            i.id, i.title, i.status, i.priority,
            i.latitude, i.longitude, i.location_name,
            c.name as category_name, c.icon as category_icon
        FROM issues i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.latitude IS NOT NULL AND i.longitude IS NOT NULL
        ORDER BY i.created_at DESC
    """
    result = execute_query(query, fetch_all=True)
    return jsonify(result or [])
