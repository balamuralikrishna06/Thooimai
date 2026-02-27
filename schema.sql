-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
-- Represents authenticated users. We link this to Firebase using firebase_uid.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'citizen',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: reports
-- Stores waste reports submitted by citizens.
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Reported',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key linking to the users table via firebase_uid
  CONSTRAINT fk_user
    FOREIGN KEY(firebase_uid) 
    REFERENCES users(firebase_uid)
    ON DELETE CASCADE
);

-- Supabase RLS (Row Level Security) - Optional but recommended
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
