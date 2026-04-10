-- Migration: 294_staff_production_kpi_rpc
-- Description: RPC for per-staff production KPI aggregation (Phase 6: Manager Dashboard)
-- Date: 2026-04-09

-- CONTEXT: Manager dashboard needs per-staff production metrics aggregated
-- from production_schedule with date range filtering.
-- Returns: summary totals, per-staff breakdown, ritual summary.

CREATE OR REPLACE FUNCTION get_staff_production_kpi(
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_date_to DATE DEFAULT CURRENT_DATE,
  p_department TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'dateFrom', p_date_from,
    'dateTo', p_date_to,
    'summary', (
      SELECT jsonb_build_object(
        'totalTasks', COUNT(*)::int,
        'completedTasks', COUNT(*) FILTER (WHERE status = 'completed')::int,
        'completionRate', ROUND(
          CASE WHEN COUNT(*) > 0
            THEN COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100
            ELSE 0
          END, 1
        ),
        'totalProductionTasks', COUNT(*) FILTER (WHERE task_type = 'production')::int,
        'totalWriteOffTasks', COUNT(*) FILTER (WHERE task_type = 'write_off')::int,
        'totalTargetQty', COALESCE(SUM(target_quantity), 0)::numeric,
        'totalCompletedQty', COALESCE(SUM(completed_quantity) FILTER (WHERE status = 'completed'), 0)::numeric,
        'photosUploaded', COUNT(*) FILTER (WHERE photo_url IS NOT NULL)::int,
        'photoRate', ROUND(
          CASE WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
            THEN COUNT(*) FILTER (WHERE photo_url IS NOT NULL)::numeric
                 / COUNT(*) FILTER (WHERE status = 'completed')::numeric * 100
            ELSE 0
          END, 1
        ),
        'quickCompletions', COUNT(*) FILTER (WHERE is_quick_completion = true)::int,
        'avgDurationMinutes', ROUND(
          COALESCE(AVG(actual_duration_minutes) FILTER (WHERE actual_duration_minutes IS NOT NULL), 0), 1
        )
      )
      FROM production_schedule
      WHERE schedule_date BETWEEN p_date_from AND p_date_to
        AND (p_department IS NULL OR department = p_department)
    ),
    'staffMetrics', COALESCE((
      SELECT jsonb_agg(row_data ORDER BY (row_data->>'completedTasks')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'staffMemberId', staff_member_id,
          'staffMemberName', MAX(staff_member_name),
          'totalTasks', COUNT(*)::int,
          'completedTasks', COUNT(*) FILTER (WHERE status = 'completed')::int,
          'completionRate', ROUND(
            CASE WHEN COUNT(*) > 0
              THEN COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100
              ELSE 0
            END, 1
          ),
          'productionTasks', COUNT(*) FILTER (WHERE task_type = 'production' AND status = 'completed')::int,
          'writeOffTasks', COUNT(*) FILTER (WHERE task_type = 'write_off' AND status = 'completed')::int,
          'totalCompletedQty', COALESCE(SUM(completed_quantity) FILTER (WHERE status = 'completed'), 0)::numeric,
          'photosUploaded', COUNT(*) FILTER (WHERE photo_url IS NOT NULL)::int,
          'photoRate', ROUND(
            CASE WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
              THEN COUNT(*) FILTER (WHERE photo_url IS NOT NULL)::numeric
                   / COUNT(*) FILTER (WHERE status = 'completed')::numeric * 100
              ELSE 0
            END, 1
          ),
          'quickCompletions', COUNT(*) FILTER (WHERE is_quick_completion = true)::int,
          'avgDurationMinutes', ROUND(
            COALESCE(AVG(actual_duration_minutes) FILTER (WHERE actual_duration_minutes IS NOT NULL), 0), 1
          ),
          'activeDays', COUNT(DISTINCT schedule_date) FILTER (WHERE status = 'completed')::int
        ) as row_data
        FROM production_schedule
        WHERE schedule_date BETWEEN p_date_from AND p_date_to
          AND staff_member_id IS NOT NULL
          AND (p_department IS NULL OR department = p_department)
        GROUP BY staff_member_id
      ) sub
    ), '[]'::jsonb),
    'ritualSummary', (
      SELECT jsonb_build_object(
        'totalRituals', COUNT(*)::int,
        'avgDurationMinutes', ROUND(COALESCE(AVG(duration_minutes), 0), 1),
        'avgCompletionRate', ROUND(
          CASE WHEN COUNT(*) > 0
            THEN AVG(
              CASE WHEN total_tasks > 0
                THEN rc.completed_tasks::numeric / total_tasks::numeric * 100
                ELSE 0
              END
            )
            ELSE 0
          END, 1
        ),
        'byType', jsonb_build_object(
          'morning', COUNT(*) FILTER (WHERE ritual_type = 'morning')::int,
          'afternoon', COUNT(*) FILTER (WHERE ritual_type = 'afternoon')::int,
          'evening', COUNT(*) FILTER (WHERE ritual_type = 'evening')::int
        )
      )
      FROM ritual_completions rc
      WHERE rc.completed_at::date BETWEEN p_date_from AND p_date_to
        AND (p_department IS NULL OR rc.department = p_department)
    )
  ) INTO result;

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
