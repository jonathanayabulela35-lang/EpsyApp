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

    const { batch_id } = await req.json();

    if (!batch_id) {
      return Response.json({ 
        error: 'Batch ID is required',
        error_code: 'MISSING_BATCH_ID'
      }, { status: 400 });
    }

    // Find the batch
    const batches = await base44.asServiceRole.entities.KeyBatch.filter({ batch_id });
    
    if (batches.length === 0) {
      return Response.json({ 
        error: 'Batch not found',
        error_code: 'BATCH_NOT_FOUND'
      }, { status: 404 });
    }

    const batch = batches[0];

    if (batch.status === 'deactivated') {
      return Response.json({ 
        error: 'Batch is already deactivated',
        error_code: 'ALREADY_DEACTIVATED'
      }, { status: 400 });
    }

    // Get all keys in this batch
    const keys = await base44.asServiceRole.entities.WisaKey.filter({ batch_id });

    // Count keys by status BEFORE revoking
    const unusedCount = keys.filter(k => k.status === 'unused').length;
    const activeCount = keys.filter(k => k.status === 'active').length;

    // Revoke all keys - must include all required fields
    const deactivationPromises = keys.map(key => 
      base44.asServiceRole.entities.WisaKey.update(key.id, {
        wisa_key: key.wisa_key,
        last4: key.last4,
        institution_id: key.institution_id,
        batch_id: key.batch_id,
        allowed_domain: key.allowed_domain,
        status: 'revoked'
      })
    );

    await Promise.all(deactivationPromises);

    // Update batch status - must include all required fields
    // Handle legacy batches missing allowed_domain
    await base44.asServiceRole.entities.KeyBatch.update(batch.id, {
      batch_id: batch.batch_id,
      institution_id: batch.institution_id,
      prefix: batch.prefix,
      allowed_domain: batch.allowed_domain || 'legacy.unknown',
      requested_count: batch.requested_count,
      generated_count: batch.generated_count || 0,
      status: 'deactivated',
      deactivated_at: new Date().toISOString()
    });

    // Update institution stats
    const institutions = await base44.asServiceRole.entities.Institution.filter({ 
      institution_id: batch.institution_id 
    });

    if (institutions.length > 0) {
      const institution = institutions[0];

      await base44.asServiceRole.entities.Institution.update(institution.id, {
        unused_keys: Math.max(0, (institution.unused_keys || 0) - unusedCount),
        active_keys: Math.max(0, (institution.active_keys || 0) - activeCount),
        revoked_keys: (institution.revoked_keys || 0) + keys.length
      });
    }

    // Audit log
    await base44.asServiceRole.entities.KeyGenerationAudit.create({
      action: 'deactivate_batch',
      batch_id,
      institution_id: batch.institution_id,
      count: keys.length,
      admin_email: user.email,
      details: {
        deactivated_keys: keys.length
      }
    });

    return Response.json({
      success: true,
      batch_id,
      deactivated_keys_count: keys.length
    });

  } catch (error) {
    console.error('Batch deactivation error:', error);
    return Response.json({ 
      error: error.message,
      error_code: 'DEACTIVATION_ERROR'
    }, { status: 500 });
  }
});