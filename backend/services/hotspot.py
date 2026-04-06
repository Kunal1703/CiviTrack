"""
Hotspot Detection Service

Identifies geographic areas with high concentration of civic issues
using the Haversine formula for distance calculation.
"""

import math
from datetime import datetime, timedelta
from database import execute_query

# Configuration
HOTSPOT_RADIUS_METERS = 500  # Group issues within 500m
MIN_ISSUES_FOR_HOTSPOT = 3   # Minimum issues to be considered a hotspot
HOTSPOT_DAYS_WINDOW = 30     # Consider issues from last 30 days


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    
    Returns distance in meters.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth's radius in meters
    r = 6371000
    
    return c * r


def get_recent_issues_with_location():
    """Get issues from the last N days that have location data."""
    cutoff_date = datetime.now() - timedelta(days=HOTSPOT_DAYS_WINDOW)
    
    query = """
        SELECT id, title, latitude, longitude, location_name, status, created_at
        FROM issues
        WHERE latitude IS NOT NULL 
          AND longitude IS NOT NULL
          AND created_at >= %s
        ORDER BY created_at DESC
    """
    
    return execute_query(query, (cutoff_date,), fetch_all=True) or []


def detect_hotspots():
    """
    Detect hotspot areas based on issue concentration.
    
    Algorithm:
    1. Get all recent issues with location data
    2. For each issue, count nearby issues within radius
    3. Group overlapping clusters
    4. Return areas with >= MIN_ISSUES_FOR_HOTSPOT issues
    
    Returns:
        List of hotspot dictionaries
    """
    issues = get_recent_issues_with_location()
    
    if not issues:
        return []
    
    # Track which issues are assigned to hotspots
    assigned = set()
    hotspots = []
    
    for issue in issues:
        if issue['id'] in assigned:
            continue
            
        # Find all issues within radius
        nearby = []
        for other in issues:
            if other['id'] == issue['id']:
                continue
                
            distance = haversine_distance(
                float(issue['latitude']), float(issue['longitude']),
                float(other['latitude']), float(other['longitude'])
            )
            
            if distance <= HOTSPOT_RADIUS_METERS:
                nearby.append(other)
        
        # Check if this forms a hotspot
        cluster = [issue] + nearby
        if len(cluster) >= MIN_ISSUES_FOR_HOTSPOT:
            # Calculate centroid
            avg_lat = sum(float(i['latitude']) for i in cluster) / len(cluster)
            avg_lon = sum(float(i['longitude']) for i in cluster) / len(cluster)
            
            # Use the most common location name or generate one
            location_names = [i['location_name'] for i in cluster if i['location_name']]
            location_name = max(set(location_names), key=location_names.count) if location_names else f"Hotspot Area ({avg_lat:.4f}, {avg_lon:.4f})"
            
            hotspot = {
                'latitude': round(avg_lat, 8),
                'longitude': round(avg_lon, 8),
                'location_name': location_name,
                'issue_count': len(cluster),
                'issue_ids': [i['id'] for i in cluster],
                'radius_meters': HOTSPOT_RADIUS_METERS
            }
            
            hotspots.append(hotspot)
            
            # Mark issues as assigned
            for i in cluster:
                assigned.add(i['id'])
    
    # Sort by issue count descending
    hotspots.sort(key=lambda x: x['issue_count'], reverse=True)
    
    return hotspots


def save_hotspots(hotspots: list):
    """Save detected hotspots to database for caching."""
    # Clear old hotspots
    execute_query("DELETE FROM hotspots")
    
    # Insert new hotspots
    for hotspot in hotspots:
        query = """
            INSERT INTO hotspots (location_name, latitude, longitude, issue_count, radius_meters)
            VALUES (%s, %s, %s, %s, %s)
        """
        execute_query(query, (
            hotspot['location_name'],
            hotspot['latitude'],
            hotspot['longitude'],
            hotspot['issue_count'],
            hotspot['radius_meters']
        ))


def get_cached_hotspots():
    """Get previously calculated hotspots from database."""
    query = """
        SELECT id, location_name, latitude, longitude, issue_count, radius_meters, last_calculated
        FROM hotspots
        ORDER BY issue_count DESC
    """
    return execute_query(query, fetch_all=True) or []


def refresh_hotspots():
    """Recalculate hotspots and save to database."""
    hotspots = detect_hotspots()
    save_hotspots(hotspots)
    return hotspots
