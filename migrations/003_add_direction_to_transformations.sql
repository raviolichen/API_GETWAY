-- Migration: Add direction field to transformation_rules
-- Date: 2025-11-24
-- Description: Add direction field to support both request and response transformations

-- Add direction column to transformation_rules
ALTER TABLE transformation_rules
ADD COLUMN direction TEXT
CHECK(direction IN ('request', 'response', 'both'))
DEFAULT 'response';

-- Update existing rules to 'response' (default behavior)
UPDATE transformation_rules
SET direction = 'response'
WHERE direction IS NULL;
