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

    const { key_ids } = await req.json();

    if (!key_ids || !Array.isArray(key_ids) || key_ids.length === 0) {
      return Response.json({ 
        error: 'key_ids array is required',
        error_code: 'MISSING_KEY_IDS'
      }, { status: 400 });
    }

    // Get all keys
    const allKeys = await base44.asServiceRole.entities.WisaKey.list();
    const keysToRevoke = allKeys.filter(k => key_ids.includes(k.id));

    if (keysToRevoke.length === 0) {
      return Response.json({ 
        error: 'No keys found',
        error_code: 'KEYS_NOT_FOUND'
      }, { status: 404 });
    }

    // Count by status before revoking
    const statusCounts = {};
    keysToRevoke.forEach(key => {
      statusCounts[key.status] = (statusCounts[key.status] || 0) + 1;
    });

    // Revoke all keys
    const revokePromises = keysToRevoke.map(key => 
      base44.asServiceRole.entities.WisaKey.update(key.id, {
        wisa_key: key.wisa_key,
        last4: key.last4,
        institution_id: key.institution_id,
        batch_id: key.batch_id,
        allowed_domain: key.allowed_domain,
        status: 'revoked',
        linked_user_id: key.linked_user_id,
        activated_at: key.activated_at
      })
    );

    await Promise.all(revokePromises);

    // Update institution stats
    const institutionUpdates = {};
    keysToRevoke.forEach(key => {
      if (!institutionUpdates[key.institution_id]) {
        institutionUpdates[key.institution_id] = {
          unused_delta: 0,
          active_delta: 0,
          revoked_delta: 0
        };
      }
      if (key.status === 'unused') institutionUpdates[key.institution_id].unused_delta++;
      if (key.status === 'active') institutionUpdates[key.institution_id].active_delta++;
      institutionUpdates[key.institution_id].revoked_delta++;
    });

    for (const [inst_id, deltas] of Object.entries(institutionUpdates)) {
      const institutions = await base44.asServiceRole.entities.Institution.filter({ 
        institution_id: inst_id 
      });
      if (institutions.length > 0) {
        const institution = institutions[0];
        await base44.asServiceRole.entities.Institution.update(institution.id, {
          unused_keys: Math.max(0, (institution.unused_keys || 0) - deltas.unused_delta),
          active_keys: Math.max(0, (institution.active_keys || 0) - deltas.active_delta),
          revoked_keys: (institution.revoked_keys || 0) + deltas.revoked_delta
        });
      }
    }

    // Audit log
    await base44.asServiceRole.entities.KeyGenerationAudit.create({
      action: 'bulk_revoke',
      institution_id: 'multiple',
      batch_id: 'bulk',
      count: keysToRevoke.length,
      admin_email: user.email,
      details: {
        revoked_count: keysToRevoke.length,
        status_before: statusCounts
      }
    });

    return Response.json({
      success: true,
      revoked_count: keysToRevoke.length,
      status_counts: statusCounts
    });

  } catch (error) {
    console.error('Bulk revoke error:', error);
    return Response.json({ 
      error: error.message,
      error_code: 'SERVER_ERROR'
    }, { status: 500 });
  }
});