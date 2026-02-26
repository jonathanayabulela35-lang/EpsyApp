import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return Response.json({ error: 'Username and PIN required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const pin_hash = createHash('sha256').update(pin).digest('hex');

    // Find credential
    const credentials = await base44.asServiceRole.entities.StudentCredential.filter({ 
      username: username 
    });

    if (!credentials || credentials.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const credential = credentials[0];

    // Verify PIN
    if (credential.pin_hash !== pin_hash) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if disabled
    if (credential.status === 'disabled') {
      return Response.json({ error: 'Account disabled' }, { status: 403 });
    }

    // Get school info
    const schools = await base44.asServiceRole.entities.School.filter({ 
      id: credential.school_id 
    });
    
    if (!schools || schools.length === 0 || schools[0].status !== 'active') {
      return Response.json({ error: 'School access not active' }, { status: 403 });
    }

    const school = schools[0];

    // First login - create user account
    if (credential.status === 'unused') {
      // Create user profile (this would typically create an actual user account)
      // For now, update credential and return success
      await base44.asServiceRole.entities.StudentCredential.update(credential.id, {
        status: 'active',
        last_login_at: new Date().toISOString()
      });

      return Response.json({ 
        success: true,
        first_login: true,
        username: username,
        school_name: school.name,
        grade: credential.grade
      });
    }

    // Regular login - update last login
    await base44.asServiceRole.entities.StudentCredential.update(credential.id, {
      last_login_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      first_login: false,
      username: username,
      school_name: school.name,
      grade: credential.grade
    });

  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
});