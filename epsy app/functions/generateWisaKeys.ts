import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Hash function using Deno's native crypto API
async function hashKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Rate limiting store (in-memory for simplicity, use Redis in production)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function log(level, message, details = {}) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}]`, message, details);
}

function checkRateLimit(adminEmail) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(adminEmail) || [];
  
  // Filter out old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    log('warn', 'Rate limit exceeded', { adminEmail, requestCount: recentRequests.length });
    return { allowed: false, retryAfter: Math.ceil((recentRequests[0] + RATE_LIMIT_WINDOW - now) / 1000) };
  }
  
  recentRequests.push(now);
  rateLimitStore.set(adminEmail, recentRequests);
  return { allowed: true };
}

// Generate cryptographically strong random alphanumeric string
function generateRandomSegment(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let result = '';
  const array = new Uint8Array(length * 2); // Extra entropy
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    // Use modulo on larger entropy pool for better randomness
    result += chars[array[i * 2] % chars.length];
  }
  return result;
}

// Generate system credentials for a Wisa Key
function generateInternalCredentials(keyId, institutionPrefix) {
  // Generate deterministic but unpredictable email and password
  const randomSuffix = generateRandomSegment(8);
  const internalEmail = `wisa_${keyId}_${randomSuffix}@internal.wisa`;
  
  // Password: strong alphanumeric with length 20
  const passwordChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  for (let i = 0; i < 20; i++) {
    password += passwordChars[array[i] % passwordChars.length];
  }
  
  return {
    internal_email: internalEmail,
    internal_password: password
  };
}

// Calculate checksum digit
function calculateChecksum(code) {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char >= '0' && char <= '9') {
      sum += parseInt(char);
    } else if (char >= 'A' && char <= 'Z') {
      sum += char.charCodeAt(0) - 55;
    }
  }
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return chars[sum % chars.length];
}

// Generate formatted Wisa Key: PREFIX-XXXX-XXXX-C
function generateWisaKey(institutionPrefix) {
  const segment1 = generateRandomSegment(4);
  const segment2 = generateRandomSegment(4);
  const baseCode = `${institutionPrefix}-${segment1}-${segment2}`;
  const checksum = calculateChecksum(baseCode.replace(/-/g, ''));
  return `${baseCode}-${checksum}`;
}

// Validate prefix format
function validatePrefix(prefix) {
  if (!prefix || prefix.length < 2 || prefix.length > 10) {
    return { valid: false, error: 'Prefix must be 2-10 characters' };
  }
  if (!/^[A-Z0-9]+$/.test(prefix)) {
    return { valid: false, error: 'Prefix must contain only uppercase letters and numbers' };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  const requestPayload = {};
  let currentOperation = 'initialization';
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      log('warn', 'Unauthorized access attempt', { user: user?.email });
      return Response.json({ 
        error: 'Forbidden: Admin access required',
        error_code: 'AUTH_FORBIDDEN'
      }, { status: 403 });
    }

    log('info', 'Key generation request started', { admin: user.email });

    // Rate limiting
    const rateLimitCheck = checkRateLimit(user.email);
    if (!rateLimitCheck.allowed) {
      log('warn', 'Rate limit hit', { admin: user.email });
      return Response.json({ 
        error: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds.`,
        error_code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }

    currentOperation = 'parse_request';
    const payload = await req.json();
    const { institution_prefix, institution_name, count, confirm_name_mismatch, allowed_domain } = payload;
    
    // Store for debug
    Object.assign(requestPayload, {
      institution_prefix,
      institution_name,
      count,
      confirm_name_mismatch,
      allowed_domain,
      admin_email: user.email
    });

    // Validate inputs
    currentOperation = 'validate_inputs';
    if (!institution_prefix) {
      log('error', 'Validation failed: missing prefix', requestPayload);
      return Response.json({ 
        error: 'Institution prefix is required',
        error_code: 'VALIDATION_MISSING_PREFIX'
      }, { status: 400 });
    }

    const prefixValidation = validatePrefix(institution_prefix.toUpperCase());
    if (!prefixValidation.valid) {
      log('error', 'Validation failed: invalid prefix', { ...requestPayload, validationError: prefixValidation.error });
      return Response.json({ 
        error: prefixValidation.error,
        error_code: 'VALIDATION_INVALID_PREFIX'
      }, { status: 400 });
    }

    if (!institution_name || institution_name.trim().length === 0) {
      log('error', 'Validation failed: missing name', requestPayload);
      return Response.json({ 
        error: 'Institution name is required',
        error_code: 'VALIDATION_MISSING_NAME'
      }, { status: 400 });
    }

    if (!count || count < 1 || count > 10000) {
      log('error', 'Validation failed: invalid count', { ...requestPayload, count });
      return Response.json({ 
        error: 'Count must be between 1 and 10,000',
        error_code: 'VALIDATION_INVALID_COUNT'
      }, { status: 400 });
    }

    if (!allowed_domain || allowed_domain.trim().length === 0) {
      log('error', 'Validation failed: missing allowed_domain', requestPayload);
      return Response.json({ 
        error: 'Allowed domain is required',
        error_code: 'VALIDATION_MISSING_DOMAIN'
      }, { status: 400 });
    }

    const normalizedPrefix = institution_prefix.toUpperCase();
    log('info', 'Input validation passed', { ...requestPayload, normalizedPrefix });

    // Check if institution exists (upsert pattern)
    currentOperation = 'query_institution';
    log('info', 'Querying institution', { institution_id: normalizedPrefix });
    
    let existingInstitutions;
    try {
      existingInstitutions = await base44.asServiceRole.entities.Institution.filter({ 
        institution_id: normalizedPrefix 
      });
    } catch (error) {
      log('error', 'Failed to query institution', { 
        operation: currentOperation,
        institution_id: normalizedPrefix,
        error: error.message,
        stack: error.stack
      });
      return Response.json({ 
        error: 'Database query failed',
        error_code: 'DB_QUERY_INSTITUTION_FAILED',
        details: {
          operation: currentOperation,
          db_error: error.message,
          request: requestPayload
        }
      }, { status: 500 });
    }

    let institution;

    if (existingInstitutions.length > 0) {
      institution = existingInstitutions[0];
      log('info', 'Institution exists', { institution_id: normalizedPrefix, name: institution.name });
      
      // Check for name mismatch
      if (institution.name !== institution_name && !confirm_name_mismatch) {
        log('warn', 'Name mismatch detected', { 
          existing: institution.name, 
          provided: institution_name 
        });
        return Response.json({ 
          error: 'NAME_MISMATCH',
          error_code: 'NAME_MISMATCH',
          existing_name: institution.name,
          provided_name: institution_name,
          message: 'Institution prefix exists with different name. Confirm to proceed.'
        }, { status: 409 });
      }
      
      // Update name if confirmed (upsert pattern)
      if (confirm_name_mismatch && institution.name !== institution_name) {
        currentOperation = 'update_institution_name';
        log('info', 'Updating institution name', { from: institution.name, to: institution_name });
        try {
          await base44.asServiceRole.entities.Institution.update(institution.id, {
            name: institution_name
          });
          institution.name = institution_name;
        } catch (error) {
          log('error', 'Failed to update institution name', {
            operation: currentOperation,
            institution_id: institution.id,
            error: error.message
          });
          return Response.json({ 
            error: 'Failed to update institution name',
            error_code: 'DB_UPDATE_INSTITUTION_FAILED',
            details: {
              operation: currentOperation,
              db_error: error.message,
              request: requestPayload
            }
          }, { status: 500 });
        }
      }
    } else {
      // Create new institution (upsert pattern)
      currentOperation = 'create_institution';
      log('info', 'Creating new institution', { institution_id: normalizedPrefix, name: institution_name });
      try {
        institution = await base44.asServiceRole.entities.Institution.create({
          institution_id: normalizedPrefix,
          name: institution_name,
          total_keys: 0,
          unused_keys: 0,
          active_keys: 0,
          revoked_keys: 0
        });
        log('info', 'Institution created', { id: institution.id });
      } catch (error) {
        log('error', 'Failed to create institution', {
          operation: currentOperation,
          institution_id: normalizedPrefix,
          error: error.message,
          stack: error.stack
        });
        return Response.json({ 
          error: 'Failed to create institution',
          error_code: 'DB_CREATE_INSTITUTION_FAILED',
          details: {
            operation: currentOperation,
            db_error: error.message,
            request: requestPayload
          }
        }, { status: 500 });
      }
    }

    // Create batch record
    currentOperation = 'create_batch';
    const batchId = `BATCH-${normalizedPrefix}-${Date.now()}`;
    log('info', 'Creating batch record', { batchId, count });
    
    let batch;
    try {
      batch = await base44.asServiceRole.entities.KeyBatch.create({
        batch_id: batchId,
        institution_id: normalizedPrefix,
        prefix: normalizedPrefix,
        allowed_domain: allowed_domain.toLowerCase().trim(),
        requested_count: count,
        generated_count: 0,
        status: 'pending'
      });
      log('info', 'Batch created', { batchId, batch_id_db: batch.id });
    } catch (error) {
      log('error', 'Failed to create batch', {
        operation: currentOperation,
        batchId,
        error: error.message,
        stack: error.stack
      });
      return Response.json({ 
        error: 'Failed to create batch record',
        error_code: 'DB_CREATE_BATCH_FAILED',
        details: {
          operation: currentOperation,
          db_error: error.message,
          request: requestPayload
        }
      }, { status: 500 });
    }

    const generatedKeys = [];
    const keysToCreate = [];
    let successCount = 0;

    try {
      // Generate keys with strong randomness
      currentOperation = 'generate_keys';
      log('info', 'Generating keys', { count });
      
      for (let i = 0; i < count; i++) {
        const plainKey = generateWisaKey(normalizedPrefix);
        const last4 = plainKey.slice(-4);
        
        keysToCreate.push({
          wisa_key: plainKey,
          last4: last4,
          institution_id: normalizedPrefix,
          batch_id: batchId,
          allowed_domain: allowed_domain.toLowerCase().trim(),
          status: 'unused'
        });

        generatedKeys.push(plainKey);
      }
      log('info', 'Keys generated in memory', { count: generatedKeys.length });

      // Bulk create keys (transactional)
      currentOperation = 'bulk_insert_keys';
      log('info', 'About to bulk insert keys', { 
        count: keysToCreate.length,
        sampleKeyData: keysToCreate[0]
      });
      
      try {
        log('info', 'Starting key creation', { keyCount: keysToCreate.length });
        
        // Create keys individually (bulkCreate doesn't persist properly)
        const createdKeys = [];
        for (let i = 0; i < keysToCreate.length; i++) {
          try {
            const created = await base44.asServiceRole.entities.WisaKey.create(keysToCreate[i]);
            createdKeys.push(created);
            log('debug', `Created key ${i + 1}/${keysToCreate.length}`, { id: created.id, batch_id: created.batch_id });
          } catch (err) {
            log('error', `Failed to create key ${i + 1}`, { error: err.message });
            throw err;
          }
        }
        
        successCount = createdKeys.length;
        log('info', 'All keys created successfully', { count: successCount });
      } catch (error) {
        log('error', 'Failed to create keys', {
          operation: currentOperation,
          batchId,
          keyCount: keysToCreate.length,
          error: error.message,
          stack: error.stack
        });
        
        // Update batch with failure
        try {
          await base44.asServiceRole.entities.KeyBatch.update(batch.id, {
            batch_id: batch.batch_id,
            institution_id: batch.institution_id,
            prefix: batch.prefix,
            allowed_domain: batch.allowed_domain,
            requested_count: batch.requested_count,
            status: 'failed',
            generated_count: 0,
            error_message: error.message
          });
        } catch (updateErr) {
          log('error', 'Failed to update batch status', { error: updateErr.message });
        }
        
        return Response.json({ 
          error: 'Failed to create keys: ' + error.message,
          error_code: 'KEY_CREATION_FAILED',
          details: {
            operation: currentOperation,
            db_error: error.message,
            keys_attempted: keysToCreate.length
          }
        }, { status: 500 });
      }

      // Update batch status
      currentOperation = 'update_batch_status';
      log('info', 'Updating batch status to complete', { batchId });
      try {
        await base44.asServiceRole.entities.KeyBatch.update(batch.id, {
          batch_id: batch.batch_id,
          institution_id: batch.institution_id,
          prefix: batch.prefix,
          allowed_domain: batch.allowed_domain,
          requested_count: batch.requested_count,
          status: 'complete',
          generated_count: successCount
        });
      } catch (error) {
        log('error', 'Failed to update batch status', {
          operation: currentOperation,
          batchId,
          error: error.message
        });
        // Non-fatal, continue
      }

      // Update institution stats
      currentOperation = 'update_institution_stats';
      log('info', 'Updating institution stats', { institution_id: institution.id });
      try {
        await base44.asServiceRole.entities.Institution.update(institution.id, {
          total_keys: (institution.total_keys || 0) + successCount,
          unused_keys: (institution.unused_keys || 0) + successCount,
          last_generated_at: new Date().toISOString(),
          last_batch_id: batchId
        });
      } catch (error) {
        log('error', 'Failed to update institution stats', {
          operation: currentOperation,
          institution_id: institution.id,
          error: error.message
        });
        // Non-fatal, continue
      }

      // Audit log
      currentOperation = 'create_audit_log';
      log('info', 'Creating audit log', { batchId, admin: user.email });
      try {
        await base44.asServiceRole.entities.KeyGenerationAudit.create({
          action: 'generate',
          batch_id: batchId,
          institution_id: normalizedPrefix,
          count: successCount,
          admin_email: user.email,
          details: {
            institution_name: institution_name,
            requested_count: count
          }
        });
      } catch (error) {
        log('error', 'Failed to create audit log', {
          operation: currentOperation,
          error: error.message
        });
        // Non-fatal, continue
      }

      log('info', 'Key generation completed successfully', {
        batchId,
        institution: normalizedPrefix,
        keysGenerated: successCount
      });

      return Response.json({
        success: true,
        batch_id: batchId,
        institution_id: normalizedPrefix,
        institution_name: institution_name,
        requested_count: count,
        generated_count: successCount,
        keys: generatedKeys
      });

    } catch (error) {
      log('error', 'Unexpected error during key generation', {
        operation: currentOperation,
        batchId,
        error: error.message,
        stack: error.stack
      });
      
      // Update batch with failure
      try {
        await base44.asServiceRole.entities.KeyBatch.update(batch.id, {
          batch_id: batch.batch_id,
          institution_id: batch.institution_id,
          prefix: batch.prefix,
          allowed_domain: batch.allowed_domain,
          requested_count: batch.requested_count,
          status: successCount > 0 ? 'partial' : 'failed',
          generated_count: successCount,
          error_message: error.message
        });
      } catch (updateError) {
        log('error', 'Failed to update batch with error status', { error: updateError.message });
      }

      return Response.json({ 
        error: error.message || 'Unexpected error during key generation',
        error_code: 'GENERATION_ERROR',
        details: {
          operation: currentOperation,
          db_error: error.message,
          keys_generated: successCount,
          request: requestPayload
        }
      }, { status: 500 });
    }

  } catch (error) {
    log('error', 'Fatal error in key generation handler', {
      operation: currentOperation,
      error: error.message,
      stack: error.stack,
      request: requestPayload
    });
    
    return Response.json({ 
      error: error.message || 'Key generation failed',
      error_code: 'FATAL_ERROR',
      details: {
        operation: currentOperation,
        db_error: error.message,
        request: requestPayload
      }
    }, { status: 500 });
  }
});