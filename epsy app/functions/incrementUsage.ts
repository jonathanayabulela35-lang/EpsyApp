import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feature, usageId } = await req.json();

    // Pro users don't track usage
    if (user.plan === 'pro') {
      return Response.json({ success: true, isPro: true });
    }

    if (!usageId) {
      return Response.json({ error: 'usageId required' }, { status: 400 });
    }

    // Increment the appropriate counter
    const fieldMap = {
      chat_material_uploads: 'chat_material_uploads',
      module_material_uploads: 'module_material_uploads',
      examples_analogies: 'examples_analogies_count',
      activities: 'activities_generated'
    };

    const field = fieldMap[feature];
    if (!field) {
      return Response.json({ error: 'Invalid feature' }, { status: 400 });
    }

    // Get current usage
    const usage = await base44.entities.UsageTracking.filter({ id: usageId });
    if (usage.length === 0) {
      return Response.json({ error: 'Usage record not found' }, { status: 404 });
    }

    const current = usage[0];
    const newValue = (current[field] || 0) + 1;

    await base44.entities.UsageTracking.update(usageId, {
      [field]: newValue
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error incrementing usage:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});