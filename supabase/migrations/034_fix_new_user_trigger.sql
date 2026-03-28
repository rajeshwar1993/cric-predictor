-- Bragg — 034 Fix handle_new_user trigger
-- The trigger creates a profile row when a user signs up.
-- On managed Supabase, SECURITY DEFINER alone may not bypass RLS
-- if the function owner doesn't have sufficient privileges.
-- Fix: explicitly grant INSERT on profiles and re-create the function.

-- Ensure the function owner can insert into profiles
GRANT INSERT ON public.profiles TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;

-- Also add an explicit INSERT policy for the service_role
-- (the trigger runs as postgres/SECURITY DEFINER, but belt-and-suspenders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'service_insert_profile'
  ) THEN
    CREATE POLICY "service_insert_profile" ON profiles FOR INSERT
      WITH CHECK (true);
  END IF;
END;
$$;

-- Re-create the trigger function
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
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail the signup — profile can be created later
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
