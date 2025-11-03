-- Fix class_packages schema - make it generic (not tied to specific class)
-- The class is chosen at sale time, not when creating the package

-- Drop the foreign key constraint first
ALTER TABLE public.class_packages
  DROP CONSTRAINT IF EXISTS class_packages_class_id_fkey;

-- Remove the class_id column since packages are not tied to a specific class
ALTER TABLE public.class_packages
  DROP COLUMN IF EXISTS class_id;

-- Add comment to clarify the new design
COMMENT ON TABLE public.class_packages IS 'Generic class packages (e.g., "5 Classes", "10 Classes"). Classes are selected at sale time, not when creating the package.';
