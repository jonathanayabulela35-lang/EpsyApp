import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { wisa_key } = await req.json();

    if (!wisa_key) {
      return Response.json({ 
        success: false, 
        error: 'Wisa Key is required',
        error_code: 'MISSING_KEY'
      }, { status: 400 });
    }

    const normalizedKey = wisa_key.trim().toUpperCase();
    const base44 = createClientFromRequest(req);

    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'User not authenticated',
        error_code: 'NOT_AUTHENTICATED'
      }, { status: 401 });
    }

    // Find key by plaintext match
    const matchingKeys = await base44.asServiceRole.entities.WisaKey.filter({ 
      wisa_key: normalizedKey 
    });

    if (matchingKeys.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid Wisa Key',
        error_code: 'KEY_NOT_FOUND'
      }, { status: 404 });
    }

    const matchedKey = matchingKeys[0];

    // Validate user domain matches key's allowed_domain
    const userEmailDomain = user.email.split('@')[1]?.toLowerCase();
    const keyAllowedDomain = matchedKey.allowed_domain?.toLowerCase();
    
    if (!keyAllowedDomain) {
      return Response.json({ 
        success: false, 
        error: 'This Wisa Key does not have a configured domain.',
        error_code: 'NO_DOMAIN_CONFIGURED'
      }, { status: 500 });
    }
    
    if (userEmailDomain !== keyAllowedDomain) {
      return Response.json({ 
        success: false, 
        error: `This Wisa Key is only valid for ${keyAllowedDomain} email addresses. Your domain (${userEmailDomain}) does not match.`,
        error_code: 'DOMAIN_MISMATCH'
      }, { status: 403 });
    }

    // Check if revoked
    if (matchedKey.status === 'revoked') {
      return Response.json({ 
        success: false, 
        error: 'This Wisa Key has been revoked. Please contact your institution.',
        error_code: 'KEY_REVOKED'
      }, { status: 403 });
    }

    // If unused, activate it and lock to current user
    if (matchedKey.status === 'unused') {
      // Set user type to institutional
      await base44.asServiceRole.entities.User.update(user.id, {
        user_type: 'institutional'
      });

      // Activate and LOCK key to this user permanently
      // CRITICAL: Store raw user.id only (never User# reference format)
      // Include ALL required fields to ensure proper persistence
      try {
        console.log('Attempting to activate key:', {
          key_id: matchedKey.id,
          user_id: user.id,
          user_email: user.email,
          before_status: matchedKey.status,
          before_linked_user_id: matchedKey.linked_user_id
        });

        // Store linked_user_id as raw user ID string
        await base44.asServiceRole.entities.WisaKey.update(matchedKey.id, {
          wisa_key: matchedKey.wisa_key,
          last4: matchedKey.last4,
          institution_id: matchedKey.institution_id,
          batch_id: matchedKey.batch_id,
          allowed_domain: matchedKey.allowed_domain,
          status: 'active',
          linked_user_id: user.id,
          activated_at: new Date().toISOString()
        });

        // Read back to confirm persistence
        const updatedKeys = await base44.asServiceRole.entities.WisaKey.filter({ 
          id: matchedKey.id 
        });
        
        if (updatedKeys.length === 0) {
          throw new Error('Key not found after update');
        }

        const updatedKey = updatedKeys[0];
        console.log('Key updated successfully:', {
          key_id: updatedKey.id,
          after_status: updatedKey.status,
          after_linked_user_id: updatedKey.linked_user_id,
          activated_at: updatedKey.activated_at
        });

        if (updatedKey.status !== 'active' || updatedKey.linked_user_id !== user.id) {
          throw new Error(`Update did not persist correctly. Status: ${updatedKey.status}, Linked User: ${updatedKey.linked_user_id}`);
        }

        return Response.json({
          success: true,
          message: 'Wisa Key activated successfully',
          allowed_domain: matchedKey.allowed_domain
        });
      } catch (updateError) {
        console.error('Failed to update key:', updateError);
        return Response.json({
          success: false,
          error: 'Failed to activate key: ' + updateError.message,
          error_code: 'UPDATE_FAILED'
        }, { status: 500 });
      }
    }

    // If already active, enforce key locking (prevent reuse)
    if (matchedKey.status === 'active') {
      if (matchedKey.linked_user_id === user.id) {
        return Response.json({
          success: true,
          message: 'License already active',
          allowed_domain: matchedKey.allowed_domain
        });
      } else {
        // Key is LOCKED to another user - strictly block
        return Response.json({ 
          success: false, 
          error: 'This key has already been activated. Each Wisa Key can only be used once.',
          error_code: 'KEY_LOCKED'
        }, { status: 403 });
      }
    }

    return Response.json({ 
      success: false, 
      error: 'Unexpected key status',
      error_code: 'INVALID_STATUS'
    }, { status: 500 });

  } catch (error) {
    console.error('Activation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      error_code: 'SERVER_ERROR'
    }, { status: 500 });
  }
});