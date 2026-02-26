import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const { institution_id } = await req.json();

    if (!institution_id) {
      return Response.json({ 
        error: 'institution_id is required' 
      }, { status: 400 });
    }

    // Find the institution
    const institutions = await base44.asServiceRole.entities.Institution.filter({
      institution_id
    });

    if (institutions.length === 0) {
      return Response.json({ 
        error: 'Institution not found' 
      }, { status: 404 });
    }

    const institution = institutions[0];

    // Delete all keys for this institution
    const keys = await base44.asServiceRole.entities.WisaKey.filter({
      institution_id
    });
    
    await Promise.all(keys.map(key => 
      base44.asServiceRole.entities.WisaKey.delete(key.id)
    ));

    // Delete all batches for this institution
    const batches = await base44.asServiceRole.entities.KeyBatch.filter({
      institution_id
    });
    
    await Promise.all(batches.map(batch => 
      base44.asServiceRole.entities.KeyBatch.delete(batch.id)
    ));

    // Delete the institution itself
    await base44.asServiceRole.entities.Institution.delete(institution.id);

    // Create audit log
    await base44.asServiceRole.entities.KeyGenerationAudit.create({
      action: 'delete',
      institution_id,
      count: keys.length,
      admin_email: user.email,
      details: {
        deleted_keys: keys.length,
        deleted_batches: batches.length,
        institution_name: institution.name
      }
    });

    return Response.json({
      success: true,
      institution_id,
      deleted_keys: keys.length,
      deleted_batches: batches.length
    });

  } catch (error) {
    console.error('Delete institution error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});