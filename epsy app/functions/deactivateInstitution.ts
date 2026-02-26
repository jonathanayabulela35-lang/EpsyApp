import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required',
        error_code: 'AUTH_FORBIDDEN'
      }, { status: 403 });
    }

    const { institution_id } = await req.json();

    if (!institution_id) {
      return Response.json({ 
        error: 'Institution ID is required',
        error_code: 'MISSING_INSTITUTION_ID'
      }, { status: 400 });
    }

    // Find the institution
    const institutions = await base44.asServiceRole.entities.Institution.filter({ 
      institution_id 
    });
    
    if (institutions.length === 0) {
      return Response.json({ 
        error: 'Institution not found',
        error_code: 'INSTITUTION_NOT_FOUND'
      }, { status: 404 });
    }

    const institution = institutions[0];

    if (institution.status === 'deactivated') {
      return Response.json({ 
        error: 'Institution is already deactivated',
        error_code: 'ALREADY_DEACTIVATED'
      }, { status: 400 });
    }

    // Get all batches for this institution
    const batches = await base44.asServiceRole.entities.KeyBatch.filter({ 
      institution_id 
    });

    // Get all keys for this institution
    const keys = await base44.asServiceRole.entities.WisaKey.filter({ 
      institution_id 
    });

    // Count total keys being revoked
    const totalKeysCount = keys.length;

    // Revoke all keys - must include all required fields
    const keyPromises = keys.map(key => 
      base44.asServiceRole.entities.WisaKey.update(key.id, {
        wisa_key: key.wisa_key,
        last4: key.last4,
        institution_id: key.institution_id,
        batch_id: key.batch_id,
        allowed_domain: key.allowed_domain,
        status: 'revoked'
      })
    );

    // Deactivate all batches - must include all required fields
    // Handle legacy batches missing allowed_domain
    const batchPromises = batches.map(batch => 
      base44.asServiceRole.entities.KeyBatch.update(batch.id, {
        batch_id: batch.batch_id,
        institution_id: batch.institution_id,
        prefix: batch.prefix,
        allowed_domain: batch.allowed_domain || 'legacy.unknown',
        requested_count: batch.requested_count,
        generated_count: batch.generated_count || 0,
        status: 'deactivated',
        deactivated_at: new Date().toISOString()
      })
    );

    await Promise.all([...keyPromises, ...batchPromises]);

    // Deactivate institution
    await base44.asServiceRole.entities.Institution.update(institution.id, {
      status: 'deactivated',
      deactivated_at: new Date().toISOString(),
      unused_keys: 0,
      active_keys: 0,
      revoked_keys: (institution.revoked_keys || 0) + totalKeysCount
    });

    // Audit log
    await base44.asServiceRole.entities.KeyGenerationAudit.create({
      action: 'deactivate_institution',
      institution_id,
      count: keys.length,
      admin_email: user.email,
      details: {
        deactivated_batches: batches.length,
        deactivated_keys: keys.length
      }
    });

    return Response.json({
      success: true,
      institution_id,
      deactivated_batches: batches.length,
      deactivated_keys: keys.length
    });

  } catch (error) {
    console.error('Institution deactivation error:', error);
    return Response.json({ 
      error: error.message,
      error_code: 'DEACTIVATION_ERROR'
    }, { status: 500 });
  }
});