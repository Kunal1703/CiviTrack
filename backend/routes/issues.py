"""
Issue Routes - CRUD operations for civic issues
"""

from flask import Blueprint, request, jsonify
from database import execute_query
from services.categorizer import analyze_issue

issues_bp = Blueprint('issues', __name__)


@issues_bp.route('/api/issues', methods=['GET'])
def get_issues():
    """Get all issues with optional filters."""
    # Get query parameters
    status = request.args.get('status')
    category_id = request.args.get('category_id')
    priority = request.args.get('priority')
    search = request.args.get('search')
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'DESC')
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Build query
    query = """
        SELECT i.*, c.name as category_name, c.icon as category_icon
        FROM issues i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE 1=1
    """
    params = []
    
    if status:
        query += " AND i.status = %s"
        params.append(status)
    
    if category_id:
        query += " AND i.category_id = %s"
        params.append(category_id)
    
    if priority:
        query += " AND i.priority = %s"
        params.append(priority)
    
    if search:
        query += " AND (i.title LIKE %s OR i.description LIKE %s OR i.location_name LIKE %s)"
        search_term = f"%{search}%"
        params.extend([search_term, search_term, search_term])
    
    # Validate sort column
    valid_sort_columns = ['created_at', 'updated_at', 'priority', 'status', 'title']
    if sort_by not in valid_sort_columns:
        sort_by = 'created_at'
    
    sort_order = 'DESC' if sort_order.upper() == 'DESC' else 'ASC'
    query += f" ORDER BY i.{sort_by} {sort_order}"
    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    
    issues = execute_query(query, tuple(params), fetch_all=True)
    
    # Get total count for pagination
    count_query = """
        SELECT COUNT(*) as total FROM issues i WHERE 1=1
    """
    count_params = []
    
    if status:
        count_query += " AND i.status = %s"
        count_params.append(status)
    if category_id:
        count_query += " AND i.category_id = %s"
        count_params.append(category_id)
    if priority:
        count_query += " AND i.priority = %s"
        count_params.append(priority)
    if search:
        count_query += " AND (i.title LIKE %s OR i.description LIKE %s OR i.location_name LIKE %s)"
        search_term = f"%{search}%"
        count_params.extend([search_term, search_term, search_term])
    
    total = execute_query(count_query, tuple(count_params), fetch_one=True)
    
    return jsonify({
        'issues': issues or [],
        'total': total['total'] if total else 0,
        'limit': limit,
        'offset': offset
    })


@issues_bp.route('/api/issues/<int:issue_id>', methods=['GET'])
def get_issue(issue_id):
    """Get a single issue by ID."""
    query = """
        SELECT i.*, c.name as category_name, c.icon as category_icon
        FROM issues i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.id = %s
    """
    issue = execute_query(query, (issue_id,), fetch_one=True)
    
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404
    
    # Get issue history
    history_query = """
        SELECT * FROM issue_history
        WHERE issue_id = %s
        ORDER BY changed_at DESC
    """
    history = execute_query(history_query, (issue_id,), fetch_all=True)
    issue['history'] = history or []
    
    return jsonify(issue)


@issues_bp.route('/api/issues', methods=['POST'])
def create_issue():
    """Create a new issue."""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('title') or not data.get('description'):
        return jsonify({'error': 'Title and description are required'}), 400
    
    # Auto-categorize if no category provided
    category_id = data.get('category_id')
    auto_categorized = False
    priority = data.get('priority', 'medium')
    
    if not category_id:
        analysis = analyze_issue(data['title'], data['description'])
        suggested_category = analysis['category']['suggested_category']
        
        # Get category ID from name
        cat_query = "SELECT id FROM categories WHERE name = %s"
        cat_result = execute_query(cat_query, (suggested_category,), fetch_one=True)
        if cat_result:
            category_id = cat_result['id']
            auto_categorized = True
        
        # Also use suggested priority if not provided
        if not data.get('priority'):
            priority = analysis['priority']['priority']
    
    # Insert the issue
    query = """
        INSERT INTO issues (
            title, description, category_id, status, priority,
            location_name, latitude, longitude, image_url,
            reporter_name, reporter_email, auto_categorized
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    params = (
        data['title'],
        data['description'],
        category_id,
        'pending',
        priority,
        data.get('location_name'),
        data.get('latitude'),
        data.get('longitude'),
        data.get('image_url'),
        data.get('reporter_name'),
        data.get('reporter_email'),
        auto_categorized
    )
    
    issue_id = execute_query(query, params)
    
    if not issue_id:
        return jsonify({'error': 'Failed to create issue'}), 500
    
    # Get the created issue
    return get_issue(issue_id)


@issues_bp.route('/api/issues/<int:issue_id>', methods=['PUT'])
def update_issue(issue_id):
    """Update an existing issue."""
    data = request.get_json()
    
    # Check if issue exists
    existing = execute_query("SELECT * FROM issues WHERE id = %s", (issue_id,), fetch_one=True)
    if not existing:
        return jsonify({'error': 'Issue not found'}), 404
    
    # Build update query dynamically
    updates = []
    params = []
    
    allowed_fields = ['title', 'description', 'category_id', 'priority', 
                      'location_name', 'latitude', 'longitude', 'image_url']
    
    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = %s")
            params.append(data[field])
    
    if not updates:
        return jsonify({'error': 'No valid fields to update'}), 400
    
    query = f"UPDATE issues SET {', '.join(updates)} WHERE id = %s"
    params.append(issue_id)
    
    execute_query(query, tuple(params))
    
    return get_issue(issue_id)


@issues_bp.route('/api/issues/<int:issue_id>/status', methods=['PUT'])
def update_issue_status(issue_id):
    """Update issue status and track history."""
    data = request.get_json()
    new_status = data.get('status')
    changed_by = data.get('changed_by', 'Admin')
    
    if new_status not in ['pending', 'in_progress', 'resolved']:
        return jsonify({'error': 'Invalid status'}), 400
    
    # Get current status
    existing = execute_query("SELECT status FROM issues WHERE id = %s", (issue_id,), fetch_one=True)
    if not existing:
        return jsonify({'error': 'Issue not found'}), 404
    
    old_status = existing['status']
    
    # Update status
    if new_status == 'resolved':
        query = "UPDATE issues SET status = %s, resolved_at = CURRENT_TIMESTAMP WHERE id = %s"
    else:
        query = "UPDATE issues SET status = %s, resolved_at = NULL WHERE id = %s"
    
    execute_query(query, (new_status, issue_id))
    
    # Record history
    history_query = """
        INSERT INTO issue_history (issue_id, old_status, new_status, changed_by)
        VALUES (%s, %s, %s, %s)
    """
    execute_query(history_query, (issue_id, old_status, new_status, changed_by))
    
    return get_issue(issue_id)


@issues_bp.route('/api/issues/<int:issue_id>', methods=['DELETE'])
def delete_issue(issue_id):
    """Delete an issue."""
    # Check if exists
    existing = execute_query("SELECT id FROM issues WHERE id = %s", (issue_id,), fetch_one=True)
    if not existing:
        return jsonify({'error': 'Issue not found'}), 404
    
    execute_query("DELETE FROM issues WHERE id = %s", (issue_id,))
    
    return jsonify({'message': 'Issue deleted successfully'})


@issues_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories."""
    query = "SELECT * FROM categories ORDER BY name"
    categories = execute_query(query, fetch_all=True)
    return jsonify(categories or [])
