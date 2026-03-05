-- Migration: Add Academy Quizzes and Certificates
-- Created: 2026-03-02
-- Description: Adds tables for quizzes, questions, options, user answers, and certificate tracking.

-- Academy Questions Table
CREATE TABLE IF NOT EXISTS academy_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES academy_courses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'MULTIPLE_CHOICE' CHECK (question_type IN ('MULTIPLE_CHOICE', 'TEXT')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academy Question Options Table (For Multiple Choice)
CREATE TABLE IF NOT EXISTS academy_question_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES academy_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academy Quiz Attempts Table
CREATE TABLE IF NOT EXISTS academy_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES academy_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
  course_id UUID REFERENCES academy_courses(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score_percentage INTEGER DEFAULT 0,
  is_passed BOOLEAN DEFAULT false,
  needs_grading BOOLEAN DEFAULT false, -- Set to true if there are TEXT questions
  instructor_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academy User Answers Table
CREATE TABLE IF NOT EXISTS academy_user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID REFERENCES academy_quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES academy_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES academy_question_options(id) ON DELETE SET NULL,
  text_answer TEXT, -- For TEXT questions
  is_correct BOOLEAN, -- Can be null initially for TEXT questions until graded
  score_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academy Certificates Table (Tracking generated certificates)
CREATE TABLE IF NOT EXISTS academy_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES academy_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
  course_id UUID REFERENCES academy_courses(id) ON DELETE CASCADE,
  certificate_url VARCHAR(500),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validation_code VARCHAR(100) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_academy_questions_course ON academy_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_options_question ON academy_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_academy_quiz_attempts_enrollment ON academy_quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_academy_quiz_attempts_user ON academy_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_user_answers_attempt ON academy_user_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_academy_certificates_user ON academy_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_certificates_enrollment ON academy_certificates(enrollment_id);

-- Add updated_at triggers
CREATE TRIGGER update_academy_questions_updated_at BEFORE UPDATE ON academy_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academy_quiz_attempts_updated_at BEFORE UPDATE ON academy_quiz_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE academy_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Questions & Options: Everyone enrolled can read, editors can manage
CREATE POLICY "Enrolled users can view questions" ON academy_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM academy_enrollments e WHERE e.course_id = academy_questions.course_id AND e.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM users_unified WHERE id = auth.uid() AND (role = 'ADMIN' OR (access_permissions->'features'->>'academy_editor')::boolean = true)
  )
);

CREATE POLICY "Academy editors can manage questions" ON academy_questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users_unified WHERE id = auth.uid() AND (role = 'ADMIN' OR (access_permissions->'features'->>'academy_editor')::boolean = true)
  )
);

CREATE POLICY "Enrolled users can view options" ON academy_question_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM academy_questions q 
    JOIN academy_enrollments e ON e.course_id = q.course_id 
    WHERE q.id = academy_question_options.question_id AND e.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM users_unified WHERE id = auth.uid() AND (role = 'ADMIN' OR (access_permissions->'features'->>'academy_editor')::boolean = true)
  )
);

CREATE POLICY "Academy editors can manage options" ON academy_question_options FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users_unified WHERE id = auth.uid() AND (role = 'ADMIN' OR (access_permissions->'features'->>'academy_editor')::boolean = true)
  )
);

-- Attempts & Answers: Users can manage their own, editors can view all
CREATE POLICY "Users can manage their own quiz attempts" ON academy_quiz_attempts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Academy editors can view and grade attempts" ON academy_quiz_attempts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users_unified WHERE id = auth.uid() AND (role = 'ADMIN' OR (access_permissions->'features'->>'academy_editor')::boolean = true)
  )
);

CREATE POLICY "Users can manage their own answers" ON academy_user_answers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM academy_quiz_attempts a WHERE a.id = academy_user_answers.attempt_id AND a.user_id = auth.uid()
  )
);
CREATE POLICY "Academy editors can view and grade answers" ON academy_user_answers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users_unified WHERE id = auth.uid() AND (role = 'ADMIN' OR (access_permissions->'features'->>'academy_editor')::boolean = true)
  )
);

-- Certificates: Users can view their own, editors can manage all
CREATE POLICY "Users can view their own certificates" ON academy_certificates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Academy editors can manage certificates" ON academy_certificates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users_unified WHERE id = auth.uid() AND (role = 'ADMIN' OR (access_permissions->'features'->>'academy_editor')::boolean = true)
  )
);
