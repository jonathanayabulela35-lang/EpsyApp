import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { action = 'check' } = await req.json();

    if (action === 'check') {
      // Find all active keys linked to current user
      const activeKeys = await base44.asServiceRole.entities.WisaKey.filter({
        linked_user_id: user.id,
        status: 'active'
      });

      console.log(`[TEST] Checking user ${user.id} (${user.email})`, {
        activeKeysCount: activeKeys.length,
        keys: activeKeys.map(k => ({ id: k.id, last4: k.last4, status: k.status, linkedTo: k.linked_user_id }))
      });

      return Response.json({
        userId: user.id,
        email: user.email,
        activeKeysCount: activeKeys.length,
        activeKeys: activeKeys,
        message: activeKeys.length > 0 
          ? `User has ${activeKeys.length} active key(s)` 
          : 'User has NO active keys'
      });
    }

    if (action === 'clearKeys') {
      // Find and revoke all keys linked to current user
      const keysToRevoke = await base44.asServiceRole.entities.WisaKey.filter({
        linked_user_id: user.id
      });

      console.log(`[TEST] Clearing ${keysToRevoke.length} keys for user ${user.id}`);

      const revokedCount = await Promise.all(
        keysToRevoke.map(key =>
          base44.asServiceRole.entities.WisaKey.update(key.id, {
            wisa_key: key.wisa_key,
            last4: key.last4,
            institution_id: key.institution_id,
            batch_id: key.batch_id,
            allowed_domain: key.allowed_domain,
            status: 'revoked',
            linked_user_id: null,
            activated_at: key.activated_at
          })
        )
      );

      return Response.json({
        userId: user.id,
        email: user.email,
        keysRevoked: revokedCount.length,
        message: `Revoked ${revokedCount.length} key(s) for user`
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[TEST] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});