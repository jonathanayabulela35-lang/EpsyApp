import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        authenticated: false, 
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Check user_type from data object (new format)
    const userType = user.data?.user_type || user.user_type;
    console.log('[LICENSE CHECK] User data:', { userId: user.id, email: user.email, userDataType: user.data?.user_type, userTypeField: user.user_type, resolvedUserType: userType, role: user.role });
    
    // Admin and individual users always have access
    if (user.role === 'admin' || userType === 'individual') {
      console.log('[LICENSE CHECK] Admin or individual user - GRANTING ACCESS');
      return Response.json({
        authenticated: true,
        user_type: userType,
        has_active_license: true,
        reason: user.role === 'admin' ? 'Admin user' : 'Individual user'
      });
    }

    // For institutional users, check for active Wisa Key with Institution and Batch validation
    if (userType === 'institutional') {
      console.log('[LICENSE CHECK] Institutional user - checking for active keys...');
      try {
        const userDomain = user.email.split('@')[1];
        
        // Query ALL keys linked to this user
        const allLinkedKeys = await base44.asServiceRole.entities.WisaKey.filter({
          linked_user_id: user.id
        });

        console.log('[LICENSE CHECK] All keys linked to user:', {
          userId: user.id,
          email: user.email,
          userDomain,
          totalKeysFound: allLinkedKeys.length,
          keys: allLinkedKeys.map(k => ({
            id: k.id,
            last4: k.last4,
            status: k.status,
            allowed_domain: k.allowed_domain,
            institution_id: k.institution_id,
            batch_id: k.batch_id
          }))
        });

        // Filter for active keys with matching domain
        const activeValidKeys = allLinkedKeys.filter(k => 
          k.status === 'active' && k.allowed_domain === userDomain
        );

        console.log('[LICENSE CHECK] Active keys after initial filtering:', {
          activeCount: activeValidKeys.length,
          keys: activeValidKeys.map(k => ({
            id: k.id,
            last4: k.last4,
            status: k.status,
            institution_id: k.institution_id,
            batch_id: k.batch_id
          }))
        });

        // Now check Institution and Batch status for each active key
        const fullyValidKeys = [];
        for (const key of activeValidKeys) {
          // Check Institution status
          const institutions = await base44.asServiceRole.entities.Institution.filter({
            institution_id: key.institution_id
          });
          const institution = institutions[0];
          
          // Check Batch status
          const batches = await base44.asServiceRole.entities.KeyBatch.filter({
            batch_id: key.batch_id
          });
          const batch = batches[0];
          
          const institutionActive = institution?.status === 'active';
          const batchActive = batch?.status !== 'deactivated';
          
          console.log('[LICENSE CHECK] Validating key:', {
            keyId: key.id,
            last4: key.last4,
            institutionId: key.institution_id,
            institutionStatus: institution?.status,
            institutionActive,
            batchId: key.batch_id,
            batchStatus: batch?.status,
            batchActive,
            isFullyValid: institutionActive && batchActive
          });
          
          if (institutionActive && batchActive) {
            fullyValidKeys.push(key);
          }
        }

        const hasActiveLicense = fullyValidKeys.length > 0;
        
        console.log('[LICENSE CHECK] Final license decision:', {
          hasActiveLicense,
          validKeysCount: fullyValidKeys.length,
          reason: hasActiveLicense 
            ? 'Valid active key with active institution and batch' 
            : 'No valid keys (all revoked, or institution/batch deactivated)'
        });

        return Response.json({
          authenticated: true,
          user_type: 'institutional',
          has_active_license: hasActiveLicense,
          active_key_count: fullyValidKeys.length,
          active_keys_found: fullyValidKeys.length,
          keys: hasActiveLicense ? fullyValidKeys.map(k => ({
            id: k.id,
            last4: k.last4,
            institution_id: k.institution_id,
            status: k.status
          })) : []
        });
      } catch (keyErr) {
        console.error('[LICENSE CHECK] Error checking active keys:', keyErr);
        return Response.json({
          authenticated: true,
          user_type: 'institutional',
          has_active_license: false,
          error: 'Could not verify license: ' + keyErr.message
        });
      }
    }

    // User type not set yet (new institutional user)
    return Response.json({
      authenticated: true,
      user_type: user.user_type || 'unknown',
      has_active_license: false,
      reason: 'No user type or license set'
    });

  } catch (error) {
    console.error('License check error:', error);
    return Response.json({ 
      authenticated: false,
      error: error.message
    }, { status: 500 });
  }
});