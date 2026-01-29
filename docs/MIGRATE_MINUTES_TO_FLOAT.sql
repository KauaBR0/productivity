-- Migration: Change minutes column to numeric (float) for precision
-- Run this in Supabase SQL Editor

ALTER TABLE public.focus_sessions 
ALTER COLUMN minutes TYPE numeric(10, 2);
