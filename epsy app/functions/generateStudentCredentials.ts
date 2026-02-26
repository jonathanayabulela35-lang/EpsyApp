import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'school_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { school_id, count, grade } = await req.json();

    if (!school_id || !count || count < 1 || count > 100) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get school details
    const schools = await base44.asServiceRole.entities.School.filter({ id: school_id });
    if (!schools || schools.length === 0) {
      return Response.json({ error: 'School not found' }, { status: 404 });
    }

    const school = schools[0];

    // Check seat limit
    if (school.seats_generated + count > school.seat_limit) {
      return Response.json({ 
        error: 'Seat limit exceeded',
        seats_available: school.seat_limit - school.seats_generated
      }, { status: 400 });
    }

    // Generate credentials
    const credentials = [];
    for (let i = 0; i < count; i++) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const username = `EPSY-${school.school_code}-${randomDigits}`;
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const pin_hash = createHash('sha256').update(pin).digest('hex');

      const credential = await base44.asServiceRole.entities.StudentCredential.create({
        school_id: school_id,
        username: username,
        pin_hash: pin_hash,
        status: 'unused',
        grade: grade || null
      });

      credentials.push({
        id: credential.id,
        username: username,
        pin: pin,
        status: 'unused',
        grade: grade || null,
        created_date: credential.created_date
      });
    }

    // Update school seat count
    await base44.asServiceRole.entities.School.update(school_id, {
      seats_generated: school.seats_generated + count
    });

    return Response.json({ 
      success: true,
      credentials: credentials,
      seats_remaining: school.seat_limit - (school.seats_generated + count)
    });

  } catch (error) {
    console.error('Error generating credentials:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});