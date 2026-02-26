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

    const { batch_id } = await req.json();

    if (!batch_id) {
      return Response.json({ 
        error: 'batch_id is required' 
      }, { status: 400 });
    }

    // Admin role bypass: query without RLS restrictions
    const allKeys = await base44.asServiceRole.entities.WisaKey.filter({ batch_id });

    return Response.json({
      success: true,
      keys: allKeys || []
    });

  } catch (error) {
    console.error('Get batch keys error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});