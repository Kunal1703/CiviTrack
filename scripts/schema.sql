-- CiviTrack Database Schema
-- Run this script to set up the MySQL database

-- Create database
CREATE DATABASE IF NOT EXISTS civitrack;
USE civitrack;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS hotspots;
DROP TABLE IF EXISTS issue_history;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- Users table (simple, for demo)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50)
);

-- Issues table (main table)
CREATE TABLE issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id INT,
    status ENUM('pending', 'in_progress', 'resolved') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    location_name VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url VARCHAR(500),
    reporter_name VARCHAR(100),
    reporter_email VARCHAR(100),
    auto_categorized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Issue history table (for tracking status changes)
CREATE TABLE issue_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    old_status ENUM('pending', 'in_progress', 'resolved'),
    new_status ENUM('pending', 'in_progress', 'resolved'),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

-- Hotspots table (for caching detected hotspots)
CREATE TABLE hotspots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    issue_count INT,
    radius_meters INT DEFAULT 500,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_category ON issues(category_id);
CREATE INDEX idx_issues_created ON issues(created_at);
CREATE INDEX idx_issues_location ON issues(latitude, longitude);
CREATE INDEX idx_history_issue ON issue_history(issue_id);

-- Insert seed data for categories
INSERT INTO categories (name, description, icon) VALUES
('Garbage', 'Waste management and cleanliness issues', 'trash-2'),
('Pothole', 'Road damage and potholes', 'circle-alert'),
('Water Leakage', 'Water supply and leakage problems', 'droplets'),
('Streetlight', 'Street lighting issues', 'lightbulb-off'),
('Drainage', 'Drainage and sewage problems', 'waves'),
('Other', 'Other civic issues', 'help-circle');

-- Insert sample admin user
INSERT INTO users (name, email, role) VALUES
('Admin', 'admin@civitrack.com', 'admin'),
('Demo User', 'user@civitrack.com', 'user');

-- Insert sample issues for demo
INSERT INTO issues (title, description, category_id, status, priority, location_name, latitude, longitude, reporter_name, reporter_email, auto_categorized) VALUES
('Large pothole on Main Street', 'There is a dangerous pothole near the traffic signal on Main Street. Multiple vehicles have been damaged.', 2, 'pending', 'high', 'Main Street, Downtown', 12.9716, 77.5946, 'John Doe', 'john@example.com', TRUE),
('Garbage overflow near Park', 'The garbage bins near Central Park are overflowing for the past 3 days. Bad smell and hygiene concern.', 1, 'in_progress', 'medium', 'Central Park, Sector 5', 12.9352, 77.6245, 'Jane Smith', 'jane@example.com', TRUE),
('Streetlight not working', 'The streetlight at the corner of 5th Avenue has not been working for a week. Safety concern at night.', 4, 'pending', 'medium', '5th Avenue, Block B', 12.9542, 77.6015, 'Mike Johnson', 'mike@example.com', FALSE),
('Water pipe leaking', 'Major water leakage from underground pipe. Water is flooding the street.', 3, 'resolved', 'high', 'Green Valley Road', 12.9156, 77.6101, 'Sarah Williams', 'sarah@example.com', TRUE),
('Blocked drainage causing flooding', 'The drainage near the school is completely blocked causing water logging during rain.', 5, 'pending', 'high', 'School Road, Sector 12', 12.9618, 77.5874, 'Robert Brown', 'robert@example.com', TRUE),
('Garbage pile near hospital', 'Huge garbage pile accumulated near the hospital entrance. Health hazard.', 1, 'in_progress', 'high', 'Hospital Road', 12.9482, 77.5789, 'Emily Davis', 'emily@example.com', FALSE),
('Multiple potholes on Highway', 'Several potholes on the highway causing traffic congestion and accidents.', 2, 'pending', 'high', 'Ring Road, Exit 5', 12.9285, 77.6321, 'David Wilson', 'david@example.com', TRUE),
('Dim streetlights in residential area', 'All streetlights in our residential area are very dim. Not safe for evening walks.', 4, 'in_progress', 'low', 'Sunrise Colony', 12.9712, 77.6182, 'Lisa Anderson', 'lisa@example.com', FALSE);

SELECT 'CiviTrack database setup complete!' AS message;
