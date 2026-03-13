CREATE TABLE IF NOT EXISTS micro_topics (

  id SERIAL PRIMARY KEY,

  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  target_exam TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT now(),

  UNIQUE(topic_name, target_exam)

);