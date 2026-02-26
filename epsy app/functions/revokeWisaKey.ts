import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required',
        error_code: 'AUTH_FORBIDDEN'
      }, { status: 403 });
    }

    const { key_id, generate_replacement } = await req.json();

    if (!key_id) {
      return Response.json({ 
        error: 'key_id is required',
        error_code: 'MISSING_KEY_ID'
      }, { status: 400 });
    }

    // Get the key
    const keys = await base44.asServiceRole.entities.WisaKey.filter({ id: key_id });
    if (keys.length === 0) {
      return Response.json({ 
        error: 'Key not found',
        error_code: 'KEY_NOT_FOUND'
      }, { status: 404 });
    }

    const key = keys[0];
    const previousStatus = key.status;

    // Revoke the key - must include all required fields
    await base44.asServiceRole.entities.WisaKey.update(key_id, {
      wisa_key: key.wisa_key,
      last4: key.last4,
      institution_id: key.institution_id,
      batch_id: key.batch_id,
      allowed_domain: key.allowed_domain,
      status: 'revoked'
    });

    // Update institution stats based on previous status
    try {
      const institutions = await base44.asServiceRole.entities.Institution.filter({ 
        institution_id: key.institution_id 
      });
      if (institutions.length > 0) {
        const institution = institutions[0];
        const updates = {
          revoked_keys: (institution.revoked_keys || 0) + 1
        };
        
        if (previousStatus === 'unused') {
          updates.unused_keys = Math.max(0, (institution.unused_keys || 0) - 1);
        } else if (previousStatus === 'active') {
          updates.active_keys = Math.max(0, (institution.active_keys || 0) - 1);
        }
        
        await base44.asServiceRole.entities.Institution.update(institution.id, updates);
      }
    } catch (statsError) {
      console.error('Failed to update institution stats:', statsError);
      // Non-fatal, continue
    }

    // Log the revocation
    try {
      await base44.asServiceRole.entities.KeyGenerationAudit.create({
        action: 'revoke',
        batch_id: key.batch_id,
        institution_id: key.institution_id,
        count: 1,
        admin_email: user.email,
        details: {
          revoked_key_id: key_id,
          was_active: key.status === 'active',
          linked_user_id: key.linked_user_id
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Non-fatal, continue
    }

    // If requested, generate replacement key
    let replacementKey = null;
    let replacementBatchId = null;
    
    if (generate_replacement) {
      try {
        const result = await base44.asServiceRole.functions.invoke('generateWisaKeys', {
          institution_prefix: key.institution_id,
          institution_name: key.institution_id, // Use ID as name fallback
          count: 1
        });
        
        if (result.data?.keys?.[0]) {
          replacementKey = result.data.keys[0];
          replacementBatchId = result.data.batch_id;
        }

        // Log replacement
        await base44.asServiceRole.entities.KeyGenerationAudit.create({
          action: 'replace',
          batch_id: replacementBatchId,
          institution_id: key.institution_id,
          count: 1,
          admin_email: user.email,
          details: {
            replaced_key_id: key_id,
            new_key_last4: replacementKey ? replacementKey.slice(-4) : null
          }
        });
      } catch (replaceError) {
        console.error('Failed to generate replacement:', replaceError);
        return Response.json({
          success: true,
          revoked_key_id: key_id,
          replacement_error: 'Failed to generate replacement key',
          error_code: 'REPLACEMENT_FAILED'
        });
      }
    }

    return Response.json({
      success: true,
      revoked_key_id: key_id,
      replacement_key: replacementKey,
      replacement_batch_id: replacementBatchId
    });

  } catch (error) {
    console.error('Revoke key error:', error);
    return Response.json({ 
      error: error.message,
      error_code: 'SERVER_ERROR'
    }, { status: 500 });
  }
});