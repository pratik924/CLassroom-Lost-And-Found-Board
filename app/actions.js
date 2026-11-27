'use server';

import getDb from '@/lib/db';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to mark a lost or found report as resolved by ID.
 * Validates the ID and returns the updated status.
 */
export async function resolveReportAction(id) {
  try {
    const reportId = parseInt(id, 10);
    if (!reportId || isNaN(reportId) || reportId <= 0) {
      return { success: false, error: 'Invalid report ID provided.' };
    }

    const db = getDb();
    const existing = db.prepare('SELECT id, status FROM reports WHERE id = ?').get(reportId);
    if (!existing) {
      return { success: false, error: 'Report not found.' };
    }

    if (existing.status === 'resolved') {
      return { success: true, message: 'Report is already resolved.' };
    }

    const stmt = db.prepare('UPDATE reports SET status = ? WHERE id = ?');
    stmt.run('resolved', reportId);

    revalidatePath('/');
    return { success: true, reportId };
  } catch (error) {
    console.error('Failed to resolve report:', error);
    return { success: false, error: 'Failed to update report in database.' };
  }
}
