/*
  # Create Chat History System

  1. New Tables
    - `chat_sessions`
      - `id` (uuid, primary key) - Unique identifier for each chat session
      - `user_id` (text) - User identifier (browser fingerprint or user ID)
      - `title` (text) - Auto-generated title based on first message
      - `mode` (text) - AI mode (general, beauty, writing, code)
      - `created_at` (timestamptz) - Session creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `chat_messages`
      - `id` (uuid, primary key) - Unique identifier for each message
      - `session_id` (uuid, foreign key) - References chat_sessions
      - `content` (text) - Message content
      - `is_user` (boolean) - Whether message is from user
      - `message_type` (text) - Type: text, image, audio, video, document
      - `file_name` (text, nullable) - Original filename for attachments
      - `created_at` (timestamptz) - Message timestamp
      - `metadata` (jsonb, nullable) - Additional message data

  2. Security
    - Enable RLS on both tables
    - Policies for anonymous users based on user_id
    - Public read/write for demo purposes (can be restricted later)

  3. Indexes
    - Index on session_id for fast message retrieval
    - Index on user_id for session lookup
    - Index on created_at for chronological sorting
*/

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  mode text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_user boolean NOT NULL DEFAULT false,
  message_type text NOT NULL DEFAULT 'text',
  file_name text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_sessions (allow all for demo)
CREATE POLICY "Allow all access to chat_sessions"
  ON chat_sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create policies for chat_messages (allow all for demo)
CREATE POLICY "Allow all access to chat_messages"
  ON chat_messages
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();