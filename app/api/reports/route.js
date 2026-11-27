import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind');
    const db = getDb();

    let query = 'SELECT * FROM reports';
    const params = [];

    if (kind && (kind === 'lost' || kind === 'found')) {
      query += ' WHERE kind = ?';
      params.push(kind);
    }

    query += ' ORDER BY created_at DESC, id DESC';

    const reports = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { kind, title, description, location } = body;

    // Validation
    const errors = {};
    if (!kind || !['lost', 'found'].includes(kind)) {
      errors.kind = 'Please select either "lost" or "found".';
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.title = 'Title is required.';
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      errors.description = 'Description is required.';
    }
    if (!location || typeof location !== 'string' || !location.trim()) {
      errors.location = 'Location is required.';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO reports (kind, title, description, location, status) 
       VALUES (?, ?, ?, ?, 'open')`
    );

    const result = stmt.run(
      kind,
      title.trim(),
      description.trim(),
      location.trim()
    );

    const newReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ success: false, error: 'Failed to create report' }, { status: 500 });
  }
}
