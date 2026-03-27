-- Bragg — 007 Onboarding Fields
-- Adds mandatory onboarding gate: display name, DOB (18+), terms acceptance

-- New columns on profiles
ALTER TABLE profiles
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN accepted_terms_at TIMESTAMPTZ,
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- For existing users: mark them as onboarded (they went through the old flow)
-- Remove this line if deploying to a fresh database with no existing users.
UPDATE profiles SET onboarding_completed = true WHERE created_at < now();

-- Update the auto-create profile trigger.
-- Since login no longer passes display_name in metadata,
-- always use email prefix as placeholder. Onboarding form updates it.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
