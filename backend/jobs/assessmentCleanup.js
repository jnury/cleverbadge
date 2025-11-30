import { sql, dbSchema } from '../db/index.js';

// Assessment timeout in hours
const ASSESSMENT_TIMEOUT_HOURS = 2;

// Cleanup interval in milliseconds (5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Mark expired assessments as ABANDONED
 * An assessment is expired if it was started more than 2 hours ago and not completed
 */
async function markExpiredAssessments() {
  try {
    const result = await sql`
      UPDATE ${sql(dbSchema)}.assessments
      SET status = 'ABANDONED'
      WHERE status = 'STARTED'
        AND started_at < NOW() - INTERVAL '${sql.unsafe(ASSESSMENT_TIMEOUT_HOURS)} hours'
      RETURNING id, candidate_name, started_at
    `;

    if (result.length > 0) {
      console.log(`[Assessment Cleanup] Marked ${result.length} expired assessment(s) as ABANDONED`);
    }

    return result.length;
  } catch (error) {
    console.error('[Assessment Cleanup] Error marking expired assessments:', error.message);
    return 0;
  }
}

/**
 * Start the assessment cleanup job
 * Runs every 5 minutes to mark expired assessments as ABANDONED
 */
export function startAssessmentCleanupJob() {
  console.log(`⏰ Assessment cleanup job started (runs every ${CLEANUP_INTERVAL_MS / 60000} minutes)`);

  // Run immediately on startup
  markExpiredAssessments();

  // Then run every 5 minutes
  setInterval(markExpiredAssessments, CLEANUP_INTERVAL_MS);
}
