import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feature } = await req.json();

    // Pro users have unlimited access
    if (user.plan === 'pro') {
      return Response.json({
        allowed: true,
        isPro: true,
        remaining: null
      });
    }

    // Free plan limits
    const limits = {
      chat_material_uploads: 3, // per day
      module_material_uploads: 5, // per week
      examples_analogies: 5, // per day
      activities: 5 // per week
    };

    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];

    // Get or create usage tracking record
    let usage = await base44.entities.UsageTracking.filter({ 
      date: today,
      created_by: user.email 
    });
    
    if (usage.length === 0) {
      usage = [await base44.entities.UsageTracking.create({
        date: today,
        week_start: weekStart,
        chat_material_uploads: 0,
        module_material_uploads: 0,
        examples_analogies_count: 0,
        activities_generated: 0
      })];
    } else {
      usage = usage;
      // Reset weekly counters if week changed
      if (usage[0].week_start !== weekStart) {
        await base44.entities.UsageTracking.update(usage[0].id, {
          week_start: weekStart,
          module_material_uploads: 0,
          activities_generated: 0
        });
        usage[0].module_material_uploads = 0;
        usage[0].activities_generated = 0;
      }
    }

    const current = usage[0];

    // Check limits based on feature
    let allowed = true;
    let remaining = 0;
    let limit = 0;

    switch (feature) {
      case 'chat_material_uploads':
        limit = limits.chat_material_uploads;
        remaining = limit - (current.chat_material_uploads || 0);
        allowed = remaining > 0;
        break;
      
      case 'module_material_uploads':
        limit = limits.module_material_uploads;
        remaining = limit - (current.module_material_uploads || 0);
        allowed = remaining > 0;
        break;
      
      case 'examples_analogies':
        limit = limits.examples_analogies;
        remaining = limit - (current.examples_analogies_count || 0);
        allowed = remaining > 0;
        break;
      
      case 'activities':
        limit = limits.activities;
        remaining = limit - (current.activities_generated || 0);
        allowed = remaining > 0;
        break;
      
      default:
        return Response.json({ error: 'Invalid feature' }, { status: 400 });
    }

    return Response.json({
      allowed,
      isPro: false,
      remaining,
      limit,
      usageId: current.id
    });

  } catch (error) {
    console.error('Error checking usage limit:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}