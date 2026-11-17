-- ============================================================
-- SmartLIB JAIN - Auth Trigger Migration
-- Run this in the Supabase Dashboard > SQL Editor
-- Project: pvflczsevhyfewopxoyv (SmartLIBJain's)
-- ============================================================
-- This creates the trigger that auto-creates users/profiles rows
-- when a new user signs up via Supabase Auth.
-- ============================================================

-- Step 1: Create the handler function (already done via MCP, but included for completeness)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  _full_name TEXT;
  _student_id TEXT;
  _department TEXT;
  _academic_year TEXT;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  _student_id := NEW.raw_user_meta_data->>'student_id';
  _department := NEW.raw_user_meta_data->>'department';
  _academic_year := NEW.raw_user_meta_data->>'academic_year';

  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (NEW.id, NEW.email, _full_name, 'student', 'pending')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, student_id, department, academic_year)
  VALUES (NEW.id, _student_id, _department, _academic_year)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 2: Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Create a storage bucket for academic resources (optional)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true)
-- ON CONFLICT DO NOTHING;

