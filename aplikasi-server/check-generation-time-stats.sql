-- ============================================================================
-- Query: Generation Time Statistics
-- ============================================================================
-- Melihat statistik waktu generate yang sudah tersimpan di database
-- ============================================================================

-- 1. Basic Statistics
SELECT 
  COUNT(*) as total_scenarios,
  COUNT(generation_time_ms) as scenarios_with_time,
  ROUND(AVG(generation_time_ms)::numeric, 2) as avg_time_ms,
  ROUND((AVG(generation_time_ms) / 1000)::numeric, 2) as avg_time_seconds,
  MIN(generation_time_ms) as min_time_ms,
  MAX(generation_time_ms) as max_time_ms,
  ROUND(STDDEV(generation_time_ms)::numeric, 2) as stddev_ms
FROM scenarios
WHERE generation_time_ms IS NOT NULL;

-- 2. Generation Time by Quality Level
SELECT 
  quality_level,
  COUNT(*) as count,
  ROUND(AVG(generation_time_ms)::numeric, 2) as avg_time_ms,
  ROUND((AVG(generation_time_ms) / 1000)::numeric, 2) as avg_time_seconds,
  MIN(generation_time_ms) as min_ms,
  MAX(generation_time_ms) as max_ms
FROM scenarios
WHERE generation_time_ms IS NOT NULL 
  AND quality_level IS NOT NULL
GROUP BY quality_level
ORDER BY 
  CASE quality_level
    WHEN 'excellent' THEN 1
    WHEN 'good' THEN 2
    WHEN 'acceptable' THEN 3
    WHEN 'poor' THEN 4
    WHEN 'very_poor' THEN 5
  END;

-- 3. Generation Time Distribution (buckets)
SELECT 
  CASE 
    WHEN generation_time_ms < 1000 THEN '< 1s'
    WHEN generation_time_ms < 3000 THEN '1-3s'
    WHEN generation_time_ms < 5000 THEN '3-5s'
    WHEN generation_time_ms < 10000 THEN '5-10s'
    WHEN generation_time_ms < 30000 THEN '10-30s'
    ELSE '> 30s'
  END as time_bucket,
  COUNT(*) as count,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 2) as percentage
FROM scenarios
WHERE generation_time_ms IS NOT NULL
GROUP BY time_bucket
ORDER BY 
  CASE time_bucket
    WHEN '< 1s' THEN 1
    WHEN '1-3s' THEN 2
    WHEN '3-5s' THEN 3
    WHEN '5-10s' THEN 4
    WHEN '10-30s' THEN 5
    WHEN '> 30s' THEN 6
  END;

-- 4. Recent Scenarios with Generation Time
SELECT 
  id,
  title,
  quality_level,
  meteor_score,
  generation_time_ms,
  ROUND((generation_time_ms / 1000.0)::numeric, 2) as time_seconds,
  created_at
FROM scenarios
WHERE generation_time_ms IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 5. Slowest Generations
SELECT 
  id,
  title,
  quality_level,
  meteor_score,
  generation_time_ms,
  ROUND((generation_time_ms / 1000.0)::numeric, 2) as time_seconds,
  LENGTH(user_story) as user_story_length,
  created_at
FROM scenarios
WHERE generation_time_ms IS NOT NULL
ORDER BY generation_time_ms DESC
LIMIT 10;

-- 6. Fastest Generations
SELECT 
  id,
  title,
  quality_level,
  meteor_score,
  generation_time_ms,
  ROUND((generation_time_ms / 1000.0)::numeric, 2) as time_seconds,
  LENGTH(user_story) as user_story_length,
  created_at
FROM scenarios
WHERE generation_time_ms IS NOT NULL
ORDER BY generation_time_ms ASC
LIMIT 10;

-- 7. Generation Time Trend (last 30 days)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as scenarios_count,
  ROUND(AVG(generation_time_ms)::numeric, 2) as avg_time_ms,
  ROUND((AVG(generation_time_ms) / 1000)::numeric, 2) as avg_time_seconds,
  MIN(generation_time_ms) as min_ms,
  MAX(generation_time_ms) as max_ms
FROM scenarios
WHERE generation_time_ms IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 8. Correlation: Generation Time vs Quality
SELECT 
  CORR(generation_time_ms, meteor_score) as correlation_time_quality,
  ROUND(AVG(CASE WHEN meteor_score > 0.7 THEN generation_time_ms END)::numeric, 2) as avg_time_high_quality,
  ROUND(AVG(CASE WHEN meteor_score <= 0.7 THEN generation_time_ms END)::numeric, 2) as avg_time_low_quality
FROM scenarios
WHERE generation_time_ms IS NOT NULL 
  AND meteor_score IS NOT NULL;

-- 9. User Story Length vs Generation Time
SELECT 
  CASE 
    WHEN LENGTH(user_story) < 100 THEN 'Short (< 100 chars)'
    WHEN LENGTH(user_story) < 300 THEN 'Medium (100-300 chars)'
    WHEN LENGTH(user_story) < 500 THEN 'Long (300-500 chars)'
    ELSE 'Very Long (> 500 chars)'
  END as story_length_category,
  COUNT(*) as count,
  ROUND(AVG(generation_time_ms)::numeric, 2) as avg_time_ms,
  ROUND((AVG(generation_time_ms) / 1000)::numeric, 2) as avg_time_seconds
FROM scenarios
WHERE generation_time_ms IS NOT NULL
GROUP BY story_length_category
ORDER BY 
  CASE story_length_category
    WHEN 'Short (< 100 chars)' THEN 1
    WHEN 'Medium (100-300 chars)' THEN 2
    WHEN 'Long (300-500 chars)' THEN 3
    WHEN 'Very Long (> 500 chars)' THEN 4
  END;

-- 10. Missing Generation Time (untuk audit)
SELECT 
  COUNT(*) as scenarios_without_time,
  ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM scenarios))::numeric, 2) as percentage_missing
FROM scenarios
WHERE generation_time_ms IS NULL;

-- ============================================================================
-- REFERENCE LIBRARY USAGE
-- ============================================================================

-- 11. Reference Library Usage Statistics
SELECT 
  COUNT(*) as total_scenarios,
  COUNT(CASE WHEN reference_library_ids IS NOT NULL AND array_length(reference_library_ids, 1) > 0 THEN 1 END) as with_references,
  COUNT(CASE WHEN reference_library_ids IS NULL OR array_length(reference_library_ids, 1) = 0 THEN 1 END) as without_references,
  ROUND(AVG(array_length(reference_library_ids, 1))::numeric, 2) as avg_references_per_scenario
FROM scenarios;

-- 12. Scenarios with Reference Library Info
SELECT 
  id,
  title,
  array_length(reference_library_ids, 1) as reference_count,
  quality_level,
  meteor_score,
  generation_time_ms,
  created_at
FROM scenarios
WHERE reference_library_ids IS NOT NULL 
  AND array_length(reference_library_ids, 1) > 0
ORDER BY created_at DESC
LIMIT 20;

-- 13. Most Used Reference Libraries
SELECT 
  unnest(reference_library_ids) as reference_id,
  COUNT(*) as usage_count,
  ROUND(AVG(meteor_score)::numeric, 4) as avg_quality_score
FROM scenarios
WHERE reference_library_ids IS NOT NULL 
  AND array_length(reference_library_ids, 1) > 0
GROUP BY unnest(reference_library_ids)
ORDER BY usage_count DESC
LIMIT 10;
