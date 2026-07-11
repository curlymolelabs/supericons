-- SQLite JSON1 analysis used for the detailed rows in
-- supericons-query-agent-pack (2).json. Bind :query_export_json to the full
-- JSON document, then run the statements below in order.

CREATE TEMP TABLE query_rows AS
SELECT value AS row
FROM json_each(json_extract(:query_export_json, '$.agent_pack.queries'));

-- Headline counts for the detailed, bounded rows.
SELECT
  COUNT(*) AS query_rows,
  SUM(CAST(json_extract(row, '$.attempt_count') AS INTEGER)) AS attempts,
  SUM(CAST(json_extract(row, '$.zero_attempt_count') AS INTEGER)) AS zero_attempts,
  SUM(CAST(json_extract(row, '$.low_attempt_count') AS INTEGER)) AS low_attempts,
  SUM(CAST(json_extract(row, '$.successful_attempt_count') AS INTEGER)) AS successful_attempts
FROM query_rows;

-- Zero-result attempt rate by requested library setting.
SELECT
  COALESCE(NULLIF(json_extract(row, '$.library_filter'), ''), '(none)') AS library,
  SUM(CAST(json_extract(row, '$.attempt_count') AS INTEGER)) AS attempts,
  SUM(CAST(json_extract(row, '$.zero_attempt_count') AS INTEGER)) AS zero_attempts,
  1.0 * SUM(CAST(json_extract(row, '$.zero_attempt_count') AS INTEGER))
    / NULLIF(SUM(CAST(json_extract(row, '$.attempt_count') AS INTEGER)), 0) AS zero_attempt_rate,
  SUM(CAST(json_extract(row, '$.successful_attempt_count') AS INTEGER)) AS successful_attempts
FROM query_rows
GROUP BY library
ORDER BY zero_attempt_rate DESC, attempts DESC;

-- Outcome rate by the recorded MCP tool. A row may list multiple tools, so
-- this expands the exported tool arrays before aggregation.
SELECT
  tools.value AS tool,
  SUM(CAST(json_extract(query_rows.row, '$.attempt_count') AS INTEGER)) AS attempts,
  SUM(CAST(json_extract(query_rows.row, '$.zero_attempt_count') AS INTEGER)) AS zero_attempts,
  1.0 * SUM(CAST(json_extract(query_rows.row, '$.zero_attempt_count') AS INTEGER))
    / NULLIF(SUM(CAST(json_extract(query_rows.row, '$.attempt_count') AS INTEGER)), 0) AS zero_attempt_rate,
  SUM(CAST(json_extract(query_rows.row, '$.successful_attempt_count') AS INTEGER)) AS successful_attempts
FROM query_rows
JOIN json_each(json_extract(query_rows.row, '$.tools')) AS tools
GROUP BY tool
ORDER BY zero_attempt_rate DESC, attempts DESC;

-- Repeated query plus library pairs for review prioritization.
SELECT
  json_extract(row, '$.query') AS query,
  json_extract(row, '$.library_filter') AS library,
  CAST(json_extract(row, '$.attempt_count') AS INTEGER) AS attempts,
  CAST(json_extract(row, '$.zero_attempt_count') AS INTEGER) AS zero_attempts,
  CAST(json_extract(row, '$.successful_attempt_count') AS INTEGER) AS successful_attempts,
  json_extract(row, '$.average_result_count') AS average_result_count
FROM query_rows
WHERE CAST(json_extract(row, '$.zero_attempt_count') AS INTEGER) > 0
ORDER BY zero_attempts DESC, attempts DESC, query;
