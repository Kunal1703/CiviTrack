# CiviTrack - Smart Civic Issue Reporting System

A full-stack web application for citizens to report civic issues (potholes, garbage, streetlights, etc.) with AI-powered auto-categorization, hotspot detection, and analytics dashboards for municipal administrators.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [Smart Detection Layer](#smart-detection-layer)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Screenshots](#screenshots)

---

## Overview

CiviTrack is a comprehensive civic issue management platform that bridges the gap between citizens and municipal authorities. Citizens can easily report issues they encounter in their locality, while administrators can track, manage, and analyze these reports to improve city infrastructure and services.

### Problem Statement

Urban areas face numerous civic issues daily - from potholes and broken streetlights to garbage accumulation and water leakage. Traditional complaint systems are:
- Slow and paper-based
- Lack transparency for citizens
- Difficult to analyze for patterns
- Unable to identify problem hotspots

### Solution

CiviTrack provides:
- Easy digital issue reporting with location tagging
- AI-powered automatic categorization
- Real-time status tracking for citizens
- Analytics dashboard for administrators
- Hotspot detection to identify problem areas

---

## Features

### For Citizens
- **Report Issues**: Submit civic complaints with title, description, location, and optional image
- **Auto-Categorization**: AI automatically categorizes issues based on description keywords
- **Location Picker**: Interactive map to pinpoint exact issue location
- **Track Status**: Monitor the progress of reported issues (Pending → In Progress → Resolved)
- **Browse Issues**: View all reported issues with filtering and search

### For Administrators
- **Admin Dashboard**: Manage all issues with status updates
- **Analytics Dashboard**: Visual insights with charts and statistics
- **Hotspot Detection**: Identify areas with clustered issues
- **Priority Management**: Set and manage issue priorities

### Smart Features
- **Keyword-Based Auto-Categorization**: Analyzes issue text to suggest appropriate category
- **Priority Detection**: Automatically suggests priority based on urgency keywords
- **Geospatial Hotspot Detection**: Uses Haversine formula to cluster nearby issues

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui | UI component library |
| Recharts | Data visualization (charts) |
| Leaflet | Interactive maps |
| SWR | Data fetching and caching |
| React Hook Form | Form handling |
| Zod | Schema validation |

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.x | Backend language |
| Flask | Web framework |
| Flask-CORS | Cross-origin resource sharing |
| PyMySQL | MySQL database connector |

### Database
| Technology | Purpose |
|------------|---------|
| MySQL 8.0 | Relational database |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Next.js Frontend                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │  │
│  │  │  Home   │ │ Report  │ │ Issues  │ │ Admin/Analytics │ │  │
│  │  │  Page   │ │  Page   │ │  List   │ │   Dashboards    │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Flask Backend                         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │   Issues    │ │  Analytics  │ │   Smart Detection   │ │  │
│  │  │   Routes    │ │   Routes    │ │       Routes        │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  │                          │                                │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │              SMART DETECTION LAYER                  │ │  │
│  │  │  ┌─────────────────┐  ┌──────────────────────────┐ │ │  │
│  │  │  │  Categorizer    │  │   Hotspot Detector       │ │ │  │
│  │  │  │  (Keyword NLP)  │  │   (Haversine Clustering) │ │ │  │
│  │  │  └─────────────────┘  └──────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ PyMySQL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    MySQL Database                         │  │
│  │  ┌─────────┐ ┌────────────┐ ┌────────┐ ┌──────────────┐  │  │
│  │  │  users  │ │ categories │ │ issues │ │ issue_history│  │  │
│  │  └─────────┘ └────────────┘ └────────┘ └──────────────┘  │  │
│  │                      ┌──────────┐                         │  │
│  │                      │ hotspots │                         │  │
│  │                      └──────────┘                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Issue Submission Flow**:
   ```
   User fills form → Frontend validates → API POST /issues 
   → Smart Categorization → Database INSERT → Response
   ```

2. **Analytics Flow**:
   ```
   Admin opens dashboard → API GET /analytics/* 
   → Database aggregation queries → JSON response → Charts render
   ```

3. **Hotspot Detection Flow**:
   ```
   API GET /smart/hotspots → Fetch all open issues 
   → Haversine clustering algorithm → Return hotspot data
   ```

---

## Database Design

### Entity Relationship Diagram (ERD)

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   users     │       │  categories  │       │   issues    │
├─────────────┤       ├──────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)      │       │ id (PK)     │
│ name        │       │ name         │       │ title       │
│ email (UQ)  │       │ description  │       │ description │
│ password    │       │ icon         │       │ category_id │──┐
│ role        │       │ color        │       │ user_id     │──┼─┐
│ created_at  │       │ created_at   │       │ status      │  │ │
└─────────────┘       └──────────────┘       │ priority    │  │ │
      │                      │               │ latitude    │  │ │
      │                      │               │ longitude   │  │ │
      │                      │               │ address     │  │ │
      │                      │               │ image_url   │  │ │
      │                      │               │ created_at  │  │ │
      │                      │               │ updated_at  │  │ │
      │                      │               └─────────────┘  │ │
      │                      │                      │         │ │
      │                      └──────────────────────┼─────────┘ │
      │                                             │           │
      └─────────────────────────────────────────────┼───────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────┐
                                          │  issue_history  │
                                          ├─────────────────┤
                                          │ id (PK)         │
                                          │ issue_id (FK)   │
                                          │ old_status      │
                                          │ new_status      │
                                          │ changed_by      │
                                          │ notes           │
                                          │ created_at      │
                                          └─────────────────┘

┌─────────────┐
│  hotspots   │
├─────────────┤
│ id (PK)     │
│ center_lat  │
│ center_lng  │
│ radius      │
│ issue_count │
│ category_id │
│ detected_at │
│ is_active   │
└─────────────┘
```

### Table Descriptions

| Table | Purpose |
|-------|---------|
| `users` | Stores citizen and admin accounts with authentication data |
| `categories` | Predefined issue categories (Roads, Sanitation, etc.) |
| `issues` | Core table storing all reported civic issues |
| `issue_history` | Audit trail tracking status changes |
| `hotspots` | Cached results of hotspot detection algorithm |

### SQL Schema

The complete schema is available in `/scripts/schema.sql`. Key features:
- ENUM types for status and priority
- Foreign key constraints with CASCADE delete
- Indexes on frequently queried columns
- Default timestamps with auto-update

---

## Smart Detection Layer

### 1. Auto-Categorization Algorithm

The categorizer uses keyword matching with weighted scoring:

```python
CATEGORY_KEYWORDS = {
    "roads": {
        "keywords": ["pothole", "road", "crack", "pavement", "asphalt"],
        "weight": 1.0
    },
    "sanitation": {
        "keywords": ["garbage", "trash", "waste", "dump", "smell"],
        "weight": 1.0
    },
    # ... more categories
}

def categorize(text):
    scores = {}
    words = text.lower().split()
    
    for category, data in CATEGORY_KEYWORDS.items():
        score = sum(
            data["weight"] 
            for keyword in data["keywords"] 
            if keyword in words
        )
        scores[category] = score
    
    return max(scores, key=scores.get)
```

**How it works:**
1. Extract words from issue title and description
2. Match against keyword dictionaries for each category
3. Calculate weighted score for each category
4. Return category with highest score
5. If no match, default to "Other"

### 2. Priority Detection

Automatically assigns priority based on urgency keywords:

| Priority | Keywords |
|----------|----------|
| Urgent | emergency, dangerous, hazard, accident, collapse |
| High | broken, flooding, blocked, sewage, fire |
| Medium | damaged, leaking, overflow, fallen |
| Low | minor, small, slight, cosmetic |

### 3. Hotspot Detection Algorithm

Uses the **Haversine formula** to calculate distances between issue locations:

```python
def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    R = 6371  # Earth's radius in kilometers
    
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c  # Distance in kilometers
```

**Clustering Algorithm:**
1. Fetch all unresolved issues with coordinates
2. For each issue, find all issues within 500m radius
3. If cluster size >= 3 issues, mark as potential hotspot
4. Calculate cluster centroid (average lat/lng)
5. Merge overlapping clusters
6. Return hotspots sorted by issue count

---

## Installation

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.8+
- MySQL 8.0+

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/civitrack.git
cd civitrack
```

### Step 2: Frontend Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The frontend will be available at `http://localhost:3000`

### Step 3: Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE civitrack;

# Use the database
USE civitrack;

# Run the schema script
source scripts/schema.sql;
```

### Step 4: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure database connection
# Edit backend/config.py with your MySQL credentials

# Run the Flask server
python app.py
```

The backend API will be available at `http://localhost:5000`

### Step 5: Configure Frontend API URL

Edit `/lib/api.ts` and set the `API_BASE_URL`:

```typescript
const API_BASE_URL = "http://localhost:5000/api";
```

---

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Issues Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issues` | Get all issues (with filters) |
| GET | `/issues/:id` | Get single issue by ID |
| POST | `/issues` | Create new issue |
| PUT | `/issues/:id` | Update issue |
| DELETE | `/issues/:id` | Delete issue |
| PATCH | `/issues/:id/status` | Update issue status |

#### GET /issues

Query Parameters:
- `status` - Filter by status (pending, in_progress, resolved, rejected)
- `category` - Filter by category ID
- `priority` - Filter by priority (low, medium, high, urgent)
- `search` - Search in title and description
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

Response:
```json
{
  "issues": [
    {
      "id": 1,
      "title": "Large pothole on Main Street",
      "description": "Dangerous pothole causing accidents",
      "category_id": 1,
      "category_name": "Roads & Infrastructure",
      "status": "pending",
      "priority": "high",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "address": "123 Main Street",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pages": 5
}
```

#### POST /issues

Request Body:
```json
{
  "title": "Broken streetlight",
  "description": "Streetlight not working for 3 days",
  "category_id": 3,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "address": "456 Oak Avenue",
  "priority": "medium",
  "user_id": 1
}
```

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/summary` | Get overview statistics |
| GET | `/analytics/by-category` | Issues grouped by category |
| GET | `/analytics/by-status` | Issues grouped by status |
| GET | `/analytics/trends` | Issue trends over time |
| GET | `/analytics/resolution-time` | Average resolution times |

#### GET /analytics/summary

Response:
```json
{
  "total_issues": 150,
  "pending": 45,
  "in_progress": 30,
  "resolved": 70,
  "rejected": 5,
  "avg_resolution_hours": 48.5,
  "issues_this_week": 12,
  "issues_this_month": 45
}
```

### Smart Detection Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/smart/categorize` | Auto-categorize issue text |
| POST | `/smart/priority` | Detect priority from text |
| GET | `/smart/hotspots` | Get detected hotspots |
| POST | `/smart/hotspots/detect` | Run hotspot detection |

#### POST /smart/categorize

Request:
```json
{
  "title": "Large pothole causing accidents",
  "description": "There is a dangerous pothole on the road"
}
```

Response:
```json
{
  "category_id": 1,
  "category_name": "Roads & Infrastructure",
  "confidence": 0.85,
  "keywords_matched": ["pothole", "road", "dangerous"]
}
```

---

## Project Structure

```
civitrack/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with navbar
│   ├── page.tsx                  # Home page
│   ├── report/
│   │   └── page.tsx              # Report issue page
│   ├── issues/
│   │   ├── page.tsx              # Issues list page
│   │   └── [id]/
│   │       └── page.tsx          # Issue detail page
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard
│   └── dashboard/
│       └── page.tsx              # Analytics dashboard
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── navbar.tsx                # Navigation bar
│   ├── issue-card.tsx            # Issue card component
│   ├── issue-form.tsx            # Issue submission form
│   ├── issue-map.tsx             # Leaflet map component
│   ├── status-badge.tsx          # Status/priority badges
│   ├── stats-card.tsx            # Statistics card
│   ├── category-chart.tsx        # Category bar chart
│   ├── trend-chart.tsx           # Trend line chart
│   └── hotspot-map.tsx           # Hotspot visualization
│
├── lib/                          # Utility libraries
│   ├── api.ts                    # API client functions
│   ├── types.ts                  # TypeScript type definitions
│   ├── mock-data.ts              # Mock data for development
│   └── utils.ts                  # Utility functions
│
├── backend/                      # Flask backend
│   ├── app.py                    # Main Flask application
│   ├── config.py                 # Configuration settings
│   ├── database.py               # Database connection helper
│   ├── requirements.txt          # Python dependencies
│   ├── routes/
│   │   ├── issues.py             # Issue CRUD routes
│   │   ├── analytics.py          # Analytics routes
│   │   └── smart.py              # Smart detection routes
│   └── services/
│       ├── categorizer.py        # Auto-categorization service
│       └── hotspot.py            # Hotspot detection service
│
├── scripts/
│   └── schema.sql                # MySQL database schema
│
├── public/                       # Static assets
├── package.json                  # Node.js dependencies
└── README.md                     # This file
```

---

## Usage Guide

### For Citizens

1. **Report an Issue**
   - Click "Report Issue" in the navigation
   - Fill in the title and description
   - The system will auto-suggest a category based on your description
   - Click on the map to set the exact location
   - Submit the form

2. **Track Your Issue**
   - Go to "Browse Issues" to see all issues
   - Use filters to find your reported issue
   - Click on an issue to see its current status and history

### For Administrators

1. **Manage Issues**
   - Go to "Admin" in the navigation
   - View all issues in a table format
   - Update status: Pending → In Progress → Resolved
   - Change priority if needed

2. **View Analytics**
   - Go to "Dashboard" in the navigation
   - See overview statistics (total issues, resolution rate, etc.)
   - View issues by category (bar chart)
   - Analyze trends over time (line chart)
   - Identify hotspots on the map

---

## Screenshots

### Home Page
The landing page introduces CiviTrack with key statistics and recent issues.

### Report Issue Form
Citizens can report issues with auto-categorization and interactive map.

### Issues List
Browse and filter all reported issues with search functionality.

### Admin Dashboard
Administrators can manage issues and update their status.

### Analytics Dashboard
Visual insights with charts showing category distribution, trends, and hotspots.

---

## Technologies Explained

### Why Next.js?
- Server-side rendering for better SEO
- App Router for modern routing patterns
- Built-in API routes (though we use Flask)
- Excellent developer experience

### Why Flask?
- Lightweight and flexible Python framework
- Easy to integrate with MySQL
- Simple REST API development
- Good for demonstration purposes

### Why MySQL?
- Industry-standard relational database
- Strong data integrity with foreign keys
- Excellent for structured civic data
- Easy to query and analyze

### Why Leaflet?
- Free and open-source mapping library
- No API key required for basic usage
- Great for displaying markers and polygons
- Lightweight compared to Google Maps

### Why Recharts?
- Built specifically for React
- Declarative chart components
- Responsive and customizable
- Good documentation

---

## Future Enhancements

1. **User Authentication**: JWT-based login/register system
2. **Image Upload**: Allow citizens to attach photos of issues
3. **Email Notifications**: Notify users when status changes
4. **Mobile App**: React Native companion app
5. **ML Categorization**: Train a model for better accuracy
6. **Real-time Updates**: WebSocket for live status changes
7. **Assigned Officials**: Track which department handles each issue
8. **SLA Tracking**: Monitor response time compliance

---

## License

This project is created for educational purposes as part of a college assignment.

---

## Contributors

- Your Name - Full Stack Development

---

## Acknowledgments

- shadcn/ui for the beautiful component library
- Leaflet for the mapping functionality
- Recharts for data visualization
- The open-source community
