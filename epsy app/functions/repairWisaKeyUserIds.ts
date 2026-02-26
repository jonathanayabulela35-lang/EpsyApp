import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required'
      }, { status: 403 });
    }

    console.log('Starting Wisa Key user ID repair...');

    // Fetch all Wisa Keys and all Users
    const allKeys = await base44.asServiceRole.entities.WisaKey.list();
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    console.log(`Found ${allKeys.length} total keys, ${allUsers.length} total users`);

    const repaired = [];
    const skipped = [];
    const invalidStateFixed = [];

    for (const key of allKeys) {
      // Case 1: User# format - needs user lookup
      if (key.linked_user_id && key.linked_user_id.startsWith('User#')) {
        const suffix = key.linked_user_id.replace('User#', '');
        
        // Find users whose ID ends with this suffix
        const matchingUsers = allUsers.filter(u => u.id.endsWith(suffix));
        
        if (matchingUsers.length === 1) {
          const matchedUser = matchingUsers[0];
          console.log(`Repairing key ${key.id}: ${key.linked_user_id} -> ${matchedUser.id}`);
          
          try {
            await base44.asServiceRole.entities.WisaKey.update(key.id, {
              linked_user_id: matchedUser.id
            });
            
            repaired.push({
              key_id: key.id,
              last4: key.last4,
              old_format: key.linked_user_id,
              new_format: matchedUser.id,
              matched_user_email: matchedUser.email
            });
          } catch (error) {
            skipped.push({
              key_id: key.id,
              last4: key.last4,
              linked_user_id: key.linked_user_id,
              reason: 'Update failed: ' + error.message
            });
          }
        } else if (matchingUsers.length === 0) {
          skipped.push({
            key_id: key.id,
            last4: key.last4,
            linked_user_id: key.linked_user_id,
            reason: 'No user found with ID suffix ' + suffix
          });
        } else {
          skipped.push({
            key_id: key.id,
            last4: key.last4,
            linked_user_id: key.linked_user_id,
            reason: `Multiple users (${matchingUsers.length}) found with ID suffix ${suffix}`
          });
        }
      }
      // Case 2: Missing/invalid linked_user_id ("-" or null)
      else if ((!key.linked_user_id || key.linked_user_id === '-') && key.status === 'active') {
        console.log(`Invalid state: Active key ${key.id} with no valid user link, resetting to unused`);
        
        try {
          await base44.asServiceRole.entities.WisaKey.update(key.id, {
            status: 'unused',
            linked_user_id: null,
            activated_at: null
          });
          
          invalidStateFixed.push({
            key_id: key.id,
            last4: key.last4,
            old_status: 'active',
            new_status: 'unused',
            reason: 'Active key with no valid user link'
          });
        } catch (error) {
          skipped.push({
            key_id: key.id,
            last4: key.last4,
            linked_user_id: key.linked_user_id,
            reason: 'Failed to reset invalid state: ' + error.message
          });
        }
      }
    }

    console.log(`Repair complete: ${repaired.length} repaired, ${invalidStateFixed.length} invalid states fixed, ${skipped.length} skipped`);

    return Response.json({
      success: true,
      total_keys: allKeys.length,
      repaired_count: repaired.length,
      invalid_state_fixed_count: invalidStateFixed.length,
      skipped_count: skipped.length,
      repaired_keys: repaired,
      invalid_state_fixed: invalidStateFixed,
      skipped_keys: skipped
    });

  } catch (error) {
    console.error('Repair function error:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});