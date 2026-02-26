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
        success: true,
        message: 'Batch not found (may already be deleted)'
      });
    }

    const batch = batches[0];

    // Get all keys in this batch
    const keys = await base44.asServiceRole.entities.WisaKey.filter({ batch_id });

    // Delete all keys
    await Promise.all(keys.map(key => 
      base44.asServiceRole.entities.WisaKey.delete(key.id)
    ));

    // Delete the batch
    await base44.asServiceRole.entities.KeyBatch.delete(batch.id);

    // Update institution stats
    const institutions = await base44.asServiceRole.entities.Institution.filter({ 
      institution_id: batch.institution_id 
    });

    if (institutions.length > 0) {
      const institution = institutions[0];
      await base44.asServiceRole.entities.Institution.update(institution.id, {
        total_keys: Math.max(0, (institution.total_keys || 0) - keys.length),
        revoked_keys: Math.max(0, (institution.revoked_keys || 0) - keys.length)
      });
    }

    return Response.json({
      success: true,
      deleted_keys_count: keys.length
    });

  } catch (error) {
    console.error('Batch deletion error:', error);
    return Response.json({ 
      error: error.message,
      error_code: 'DELETION_ERROR'
    }, { status: 500 });
  }
});