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

    const { key_ids, batch_id, institution_id } = await req.json();

    let keysToDelete = [];

    // Get keys based on selection
    if (key_ids && Array.isArray(key_ids)) {
      // Delete specific keys by ID
      const allKeys = await base44.asServiceRole.entities.WisaKey.list();
      keysToDelete = allKeys.filter(k => 
        key_ids.includes(k.id) && k.status === 'revoked'
      );
    } else if (batch_id) {
      // Delete all revoked keys from a batch
      const allKeys = await base44.asServiceRole.entities.WisaKey.filter({ 
        batch_id,
        status: 'revoked'
      });
      keysToDelete = allKeys;
    } else if (institution_id) {
      // Delete all revoked keys from an institution
      const allKeys = await base44.asServiceRole.entities.WisaKey.filter({ 
        institution_id,
        status: 'revoked'
      });
      keysToDelete = allKeys;
    } else {
      return Response.json({ 
        error: 'Specify key_ids, batch_id, or institution_id',
        error_code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    if (keysToDelete.length === 0) {
      return Response.json({ 
        success: true,
        deleted_count: 0,
        message: 'No revoked keys found to delete'
      });
    }

    // Permanently delete keys
    const deletePromises = keysToDelete.map(key => 
      base44.asServiceRole.entities.WisaKey.delete(key.id)
    );

    await Promise.all(deletePromises);

    // Update institution stats
    const institutionUpdates = {};
    keysToDelete.forEach(key => {
      institutionUpdates[key.institution_id] = (institutionUpdates[key.institution_id] || 0) + 1;
    });

    for (const [inst_id, count] of Object.entries(institutionUpdates)) {
      const institutions = await base44.asServiceRole.entities.Institution.filter({ 
        institution_id: inst_id 
      });
      if (institutions.length > 0) {
        const institution = institutions[0];
        await base44.asServiceRole.entities.Institution.update(institution.id, {
          revoked_keys: Math.max(0, (institution.revoked_keys || 0) - count),
          total_keys: Math.max(0, (institution.total_keys || 0) - count)
        });
      }
    }

    // Audit log
    await base44.asServiceRole.entities.KeyGenerationAudit.create({
      action: 'delete',
      institution_id: institution_id || 'multiple',
      batch_id: batch_id || 'multiple',
      count: keysToDelete.length,
      admin_email: user.email,
      details: {
        deleted_count: keysToDelete.length,
        deleted_key_ids: keysToDelete.map(k => k.id)
      }
    });

    return Response.json({
      success: true,
      deleted_count: keysToDelete.length
    });

  } catch (error) {
    console.error('Delete keys error:', error);
    return Response.json({ 
      error: error.message,
      error_code: 'SERVER_ERROR'
    }, { status: 500 });
  }
});