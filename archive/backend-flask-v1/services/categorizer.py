"""
Smart Auto-Categorization Service

Uses keyword matching to automatically categorize civic issues
based on the text content of the title and description.
"""

# Category keywords mapping
CATEGORY_KEYWORDS = {
    'Garbage': [
        'garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 
        'dirty', 'smell', 'stink', 'bin', 'dustbin', 'debris',
        'refuse', 'junk', 'filth', 'mess', 'pollution', 'unhygienic'
    ],
    'Pothole': [
        'pothole', 'road', 'crack', 'hole', 'damage', 'broken road', 
        'uneven', 'bump', 'pit', 'crater', 'asphalt', 'pavement',
        'highway', 'street damage', 'road repair', 'surface damage'
    ],
    'Water Leakage': [
        'water', 'leak', 'pipe', 'burst', 'flooding', 'overflow', 
        'tap', 'supply', 'main', 'plumbing', 'seepage', 'drip',
        'wet', 'waterlogging', 'pipeline', 'water main'
    ],
    'Streetlight': [
        'light', 'lamp', 'dark', 'bulb', 'streetlight', 'not working', 
        'dim', 'broken light', 'no light', 'night', 'visibility',
        'illumination', 'pole light', 'street lamp', 'lighting'
    ],
    'Drainage': [
        'drain', 'sewer', 'blocked', 'clogged', 'overflow', 'gutter',
        'sewage', 'manhole', 'storm drain', 'water drain', 'channel',
        'culvert', 'runoff', 'drainage system', 'flood'
    ],
}

# Priority keywords
PRIORITY_KEYWORDS = {
    'high': [
        'urgent', 'dangerous', 'immediate', 'emergency', 'critical',
        'severe', 'hazard', 'accident', 'injury', 'risk', 'unsafe',
        'life-threatening', 'serious', 'major'
    ],
    'medium': [
        'broken', 'damaged', 'not working', 'problem', 'issue',
        'concern', 'affecting', 'need repair', 'moderate'
    ],
    'low': [
        'minor', 'small', 'slight', 'little', 'cosmetic',
        'improvement', 'suggestion', 'request'
    ]
}


def categorize_text(title: str, description: str) -> dict:
    """
    Analyze text and suggest a category based on keyword matching.
    
    Args:
        title: Issue title
        description: Issue description
        
    Returns:
        dict with suggested category, confidence score, and matched keywords
    """
    text = f"{title} {description}".lower()
    
    results = {}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        matched = []
        for keyword in keywords:
            if keyword in text:
                matched.append(keyword)
        
        if matched:
            # Calculate confidence based on number of matches
            confidence = min(len(matched) / 3, 1.0)  # Cap at 100%
            results[category] = {
                'confidence': round(confidence, 2),
                'matched_keywords': matched
            }
    
    if not results:
        return {
            'suggested_category': 'Other',
            'confidence': 0.5,
            'matched_keywords': [],
            'all_matches': {}
        }
    
    # Get the category with highest confidence
    best_category = max(results.items(), key=lambda x: x[1]['confidence'])
    
    return {
        'suggested_category': best_category[0],
        'confidence': best_category[1]['confidence'],
        'matched_keywords': best_category[1]['matched_keywords'],
        'all_matches': results
    }


def detect_priority(title: str, description: str) -> dict:
    """
    Detect priority level based on keyword analysis.
    
    Args:
        title: Issue title
        description: Issue description
        
    Returns:
        dict with priority level and matched keywords
    """
    text = f"{title} {description}".lower()
    
    # Check for high priority keywords first
    for priority in ['high', 'medium', 'low']:
        matched = []
        for keyword in PRIORITY_KEYWORDS[priority]:
            if keyword in text:
                matched.append(keyword)
        
        if matched:
            return {
                'priority': priority,
                'matched_keywords': matched,
                'confidence': min(len(matched) / 2, 1.0)
            }
    
    # Default to medium priority
    return {
        'priority': 'medium',
        'matched_keywords': [],
        'confidence': 0.5
    }


def analyze_issue(title: str, description: str) -> dict:
    """
    Complete analysis of an issue including category and priority.
    
    Args:
        title: Issue title
        description: Issue description
        
    Returns:
        dict with category and priority suggestions
    """
    category_result = categorize_text(title, description)
    priority_result = detect_priority(title, description)
    
    return {
        'category': category_result,
        'priority': priority_result
    }
