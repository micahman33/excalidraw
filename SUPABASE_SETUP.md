# Supabase Setup Guide

This guide will help you set up Supabase for the user accounts and canvas management features.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - Project name: `excalidraw-canvases` (or your preferred name)
   - Database password: (save this securely)
   - Region: Choose closest to your users
4. Click "Create new project"
5. Wait for project to be created (takes ~2 minutes)

## Step 2: Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Create Database Table

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Paste and run this SQL:

```sql
-- Create canvases table
CREATE TABLE IF NOT EXISTS canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_updated_at ON canvases(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvases_created_at ON canvases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvases_name ON canvases(name);

-- Enable Row Level Security
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own canvases
CREATE POLICY "Users can view own canvases"
  ON canvases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own canvases
CREATE POLICY "Users can insert own canvases"
  ON canvases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own canvases
CREATE POLICY "Users can update own canvases"
  ON canvases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own canvases
CREATE POLICY "Users can delete own canvases"
  ON canvases FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_canvases_updated_at
  BEFORE UPDATE ON canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" to execute the SQL

## Step 4: Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click "Create bucket"
3. Name: `thumbnails`
4. **Public bucket**: ✅ Enable (so thumbnails can be accessed via URL)
5. Click "Create bucket"

### Set Storage Policies

1. Click on the `thumbnails` bucket
2. Go to **Policies** tab
3. Click "New Policy"
4. Select "For full customization" → "Create a policy from scratch"
5. Create these policies:

**Policy 1: Allow authenticated users to upload**
- Policy name: `Allow authenticated uploads`
- Allowed operation: `INSERT`
- Policy definition:
```sql
(bucket_id = 'thumbnails'::text) AND (auth.role() = 'authenticated'::text)
```

**Policy 2: Allow public reads**
- Policy name: `Allow public reads`
- Allowed operation: `SELECT`
- Policy definition:
```sql
bucket_id = 'thumbnails'::text
```

**Policy 3: Allow users to update their own files**
- Policy name: `Allow users to update own files`
- Allowed operation: `UPDATE`
- Policy definition:
```sql
(bucket_id = 'thumbnails'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

**Policy 4: Allow users to delete their own files**
- Policy name: `Allow users to delete own files`
- Allowed operation: `DELETE`
- Policy definition:
```sql
(bucket_id = 'thumbnails'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

## Step 5: Configure Environment Variables

Add these to your build environment or `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**For production build:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key-here \
yarn build
```

## Step 6: Configure CORS (if needed)

If you're deploying to a custom domain:

1. Go to **Settings** → **API** in Supabase
2. Under "CORS Configuration", add your domain(s)
3. Or use wildcard `*` for development (not recommended for production)

## Verification

After setup, you should be able to:
1. Sign up for an account in the app
2. Create a canvas
3. See it appear in "My Canvases"
4. See thumbnail images

## Troubleshooting

### "Supabase not configured" error
- Check that environment variables are set correctly
- Verify they're available at build time (not just runtime)

### "Failed to save canvas" error
- Check browser console for detailed error
- Verify RLS policies are created correctly
- Check that user is authenticated

### Thumbnails not showing
- Verify storage bucket is public
- Check storage policies allow SELECT
- Verify file paths in database match storage structure

### Authentication not working
- Check Supabase project is active
- Verify API keys are correct
- Check browser console for auth errors

## Free Tier Limits

- **Database**: 500MB (sufficient for thousands of canvases)
- **Storage**: 1GB (sufficient for ~5000 thumbnails)
- **Bandwidth**: 5GB/month
- **API Requests**: Unlimited

If you exceed limits, consider upgrading to Pro tier ($25/month).

