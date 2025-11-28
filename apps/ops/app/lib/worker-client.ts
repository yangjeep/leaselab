/**
 * Worker API Client for apps/ops
 *
 * Helper functions to call leaselab-worker API instead of direct D1/R2 access
 */

interface WorkerEnv {
  WORKER_URL: string;
  WORKER_INTERNAL_KEY?: string;
}

/**
 * Base fetch function for calling worker API
 */
async function workerFetch(
  url: string,
  env: WorkerEnv,
  options: RequestInit = {},
  siteId?: string
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Add internal auth if configured
  if (env.WORKER_INTERNAL_KEY) {
    headers.set('X-Internal-Key', env.WORKER_INTERNAL_KEY);
  }

  // Add site context
  if (siteId) {
    headers.set('X-Site-Id', siteId);
  }

  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
    throw new Error(`Worker API error: ${error.error || error.message || response.statusText}`);
  }

  return response;
}

/**
 * Parse JSON response from worker
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const json = await response.json() as any;

  if (!json.success) {
    throw new Error(json.error || json.message || 'Worker API error');
  }

  return json.data;
}

// ==================== PROPERTIES ====================

export async function fetchPropertiesFromWorker(
  env: WorkerEnv,
  siteId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/properties`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function fetchPropertyFromWorker(
  env: WorkerEnv,
  siteId: string,
  id: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/properties/${id}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function savePropertyToWorker(
  env: WorkerEnv,
  siteId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/properties`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

// ==================== UNITS ====================

export async function fetchUnitsFromWorker(
  env: WorkerEnv,
  siteId: string,
  propertyId?: string
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/units`;
  if (propertyId) {
    url += `?propertyId=${encodeURIComponent(propertyId)}`;
  }
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function fetchUnitFromWorker(
  env: WorkerEnv,
  siteId: string,
  id: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/units/${id}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function saveUnitToWorker(
  env: WorkerEnv,
  siteId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/units`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

// ==================== LEADS ====================

export async function fetchLeadsFromWorker(
  env: WorkerEnv,
  siteId: string,
  options?: { status?: string; propertyId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/leads`;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.propertyId) params.set('propertyId', options.propertyId);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function fetchLeadFromWorker(
  env: WorkerEnv,
  siteId: string,
  id: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${id}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function createLeadToWorker(
  env: WorkerEnv,
  siteId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

// ==================== WORK ORDERS ====================

export async function fetchWorkOrdersFromWorker(
  env: WorkerEnv,
  siteId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/work-orders`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function saveWorkOrderToWorker(
  env: WorkerEnv,
  siteId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/work-orders`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

// ==================== HELPER ====================

export function isWorkerConfigured(env: Partial<WorkerEnv>): boolean {
  return Boolean(env.WORKER_URL);
}

export function getWorkerUrl(env: Partial<WorkerEnv>): string {
  if (!env.WORKER_URL) {
    throw new Error('WORKER_URL environment variable is not configured');
  }
  return env.WORKER_URL;
}

// ==================== USERS ====================

/**
 * Get all users (super admin only)
 */
export async function fetchUsersFromWorker(
  env: WorkerEnv
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/users`;
  const response = await workerFetch(url, env, {});
  return parseResponse(response);
}

/**
 * Get user by ID
 */
export async function fetchUserFromWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get user by email (for login)
 */
export async function fetchUserByEmailFromWorker(
  env: WorkerEnv,
  siteId: string,
  email: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/users/email/${encodeURIComponent(email)}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Update user's last login timestamp
 */
export async function updateUserLastLoginToWorker(
  env: WorkerEnv,
  userId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/update-login`;
  await workerFetch(url, env, {
    method: 'POST',
  });
}

/**
 * Update user password
 */
export async function updateUserPasswordToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  passwordHash: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/password`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ passwordHash }),
  }, siteId);
}

/**
 * Update user profile
 */
export async function updateUserProfileToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  data: any
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/profile`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
}

/**
 * Toggle super admin status
 */
export async function setSuperAdminStatusToWorker(
  env: WorkerEnv,
  userId: string,
  isSuperAdmin: boolean
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/super-admin`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ isSuperAdmin }),
  });
}

/**
 * Get user's accessible sites
 */
export async function fetchUserSitesFromWorker(
  env: WorkerEnv,
  userId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/sites`;
  const response = await workerFetch(url, env, {});
  return parseResponse(response);
}

/**
 * Get user's accessible sites (alias for fetchUserSitesFromWorker)
 */
export async function fetchUserAccessibleSitesFromWorker(
  env: WorkerEnv,
  userId: string
): Promise<any[]> {
  return fetchUserSitesFromWorker(env, userId);
}

/**
 * Check if user has access to a specific site
 */
export async function fetchUserHasAccessToSiteFromWorker(
  env: WorkerEnv,
  userId: string,
  siteId: string
): Promise<boolean> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/sites/${siteId}`;
  const response = await workerFetch(url, env, {});
  const data: any = await parseResponse(response);
  return Boolean(data?.hasAccess || data?.data?.hasAccess);
}

/**
 * Grant site access to user
 */
export async function grantSiteAccessToWorker(
  env: WorkerEnv,
  userId: string,
  siteId: string,
  role?: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/site-access`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ siteId, role }),
  });
}

/**
 * Revoke site access from user
 */
export async function revokeSiteAccessToWorker(
  env: WorkerEnv,
  userId: string,
  siteId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/site-access/${siteId}/delete`;
  await workerFetch(url, env, {
    method: 'POST',
  });
}

// ==================== TENANTS ====================

/**
 * Get all tenants for a site
 */
export async function fetchTenantsFromWorker(
  env: WorkerEnv,
  siteId: string,
  options?: { status?: string; propertyId?: string }
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/tenants`;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.propertyId) params.set('propertyId', options.propertyId);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get tenant by ID
 */
export async function fetchTenantFromWorker(
  env: WorkerEnv,
  siteId: string,
  tenantId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/tenants/${tenantId}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Update tenant (e.g., status)
 */
export async function updateTenantToWorker(
  env: WorkerEnv,
  siteId: string,
  tenantId: string,
  data: any
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/tenants/${tenantId}`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
}

// ==================== IMAGES ====================

/**
 * Get images for a property or unit
 */
export async function fetchImagesFromWorker(
  env: WorkerEnv,
  siteId: string,
  entityType: 'property' | 'unit',
  entityId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/images?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get single image by ID
 */
export async function fetchImageFromWorker(
  env: WorkerEnv,
  siteId: string,
  imageId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/images/${imageId}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create image record
 */
export async function createImageToWorker(
  env: WorkerEnv,
  siteId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/images`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Update image record
 */
export async function updateImageToWorker(
  env: WorkerEnv,
  siteId: string,
  imageId: string,
  data: any
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/images/${imageId}`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
}

/**
 * Delete image
 */
export async function deleteImageToWorker(
  env: WorkerEnv,
  siteId: string,
  imageId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/images/${imageId}/delete`;
  await workerFetch(url, env, {
    method: 'POST',
  }, siteId);
}

/**
 * Set cover image
 */
export async function setCoverImageToWorker(
  env: WorkerEnv,
  siteId: string,
  imageId: string,
  entityType: 'property' | 'unit',
  entityId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/images/${imageId}/set-cover`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId }),
  }, siteId);
}

/**
 * Get image serve URL from worker
 */
export function getImageServeUrl(
  env: WorkerEnv,
  imageId: string
): string {
  return `${env.WORKER_URL}/api/ops/images/${imageId}/serve`;
}

/**
 * Upload image to worker
 */
export async function uploadImageToWorker(
  env: WorkerEnv,
  siteId: string,
  file: File,
  key: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/images/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const headers = new Headers();
  if (env.WORKER_INTERNAL_KEY) {
    headers.set('X-Internal-Key', env.WORKER_INTERNAL_KEY);
  }
  if (siteId) {
    headers.set('X-Site-Id', siteId);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
    throw new Error(`Worker API error: ${error.error || error.message || response.statusText}`);
  }

  return parseResponse(response);
}

/**
 * Reorder images
 */
export async function reorderImagesToWorker(
  env: WorkerEnv,
  siteId: string,
  imageIds: string[]
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/images/reorder`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ imageIds }),
  }, siteId);
}

// ==================== LEAD FILES ====================

/**
 * Get files for a lead
 */
export async function fetchLeadFilesFromWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/files`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Upload file for a lead
 */
export async function uploadLeadFileToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string,
  file: File,
  fileType: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/files`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);

  const headers = new Headers();
  if (env.WORKER_INTERNAL_KEY) {
    headers.set('X-Internal-Key', env.WORKER_INTERNAL_KEY);
  }
  if (siteId) {
    headers.set('X-Site-Id', siteId);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
    throw new Error(`Worker API error: ${error.error || error.message || response.statusText}`);
  }

  return parseResponse(response);
}

// ==================== AI EVALUATION ====================

/**
 * Run AI evaluation on a lead
 */
export async function runAIEvaluationToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/ai-evaluate`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Get AI evaluation for a lead
 */
export async function fetchAIEvaluationFromWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/ai-evaluation`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

// ==================== LEAD OPERATIONS ====================

/**
 * Get lead history
 */
export async function fetchLeadHistoryFromWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/history`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Update lead notes
 */
export async function updateLeadNotesToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string,
  landlordNote: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/notes`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ landlordNote }),
  }, siteId);
  return parseResponse(response);
}

/**
 * Update lead
 */
export async function updateLeadToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Record lead history event
 */
export async function recordLeadHistoryToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string,
  eventType: string,
  eventData: any
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/history`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ eventType, eventData }),
  }, siteId);
}

// ==================== PROPERTY OPERATIONS ====================

/**
 * Delete property
 */
export async function deletePropertyToWorker(
  env: WorkerEnv,
  siteId: string,
  propertyId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/properties/${propertyId}/delete`;
  await workerFetch(url, env, {
    method: 'POST',
  }, siteId);
}

/**
 * Get property with units
 */
export async function fetchPropertyWithUnitsFromWorker(
  env: WorkerEnv,
  siteId: string,
  propertyId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/properties/${propertyId}/with-units`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get property by slug
 */
export async function fetchPropertyBySlugFromWorker(
  env: WorkerEnv,
  siteId: string,
  slug: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/properties/slug/${encodeURIComponent(slug)}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

// ==================== UNIT OPERATIONS ====================

/**
 * Delete unit
 */
export async function deleteUnitToWorker(
  env: WorkerEnv,
  siteId: string,
  unitId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/units/${unitId}/delete`;
  await workerFetch(url, env, {
    method: 'POST',
  }, siteId);
}

/**
 * Get unit with details (property, images, tenants)
 */
export async function fetchUnitWithDetailsFromWorker(
  env: WorkerEnv,
  siteId: string,
  unitId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/units/${unitId}/with-details`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get unit history
 */
export async function fetchUnitHistoryFromWorker(
  env: WorkerEnv,
  siteId: string,
  unitId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/units/${unitId}/history`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create unit history event
 */
export async function createUnitHistoryToWorker(
  env: WorkerEnv,
  siteId: string,
  unitId: string,
  data: any
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/units/${unitId}/history`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
}

// ==================== WORK ORDER OPERATIONS ====================

/**
 * Get single work order
 */
export async function fetchWorkOrderFromWorker(
  env: WorkerEnv,
  siteId: string,
  workOrderId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/work-orders/${workOrderId}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Delete work order
 */
export async function deleteWorkOrderToWorker(
  env: WorkerEnv,
  siteId: string,
  workOrderId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/work-orders/${workOrderId}`;
  await workerFetch(url, env, {
    method: 'DELETE',
  }, siteId);
}

/**
 * Create lead file metadata
 */
export async function createLeadFileToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string,
  data: {
    fileType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    r2Key: string;
  }
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/files`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

// ==================== SITE API TOKENS ====================

/**
 * Fetch all site API tokens
 */
export async function fetchSiteApiTokensFromWorker(
  env: WorkerEnv,
  siteId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/site-api-tokens`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Fetch a single site API token by ID
 */
export async function fetchSiteApiTokenByIdFromWorker(
  env: WorkerEnv,
  siteId: string,
  tokenId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/site-api-tokens/${tokenId}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create a new site API token
 * Returns the full token (only time it's visible!)
 */
export async function createSiteApiTokenToWorker(
  env: WorkerEnv,
  siteId: string,
  data: {
    description: string;
    expiresAt?: string | null;
  }
): Promise<{ token: string; record: any }> {
  const url = `${env.WORKER_URL}/api/ops/site-api-tokens`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Update a site API token
 */
export async function updateSiteApiTokenToWorker(
  env: WorkerEnv,
  siteId: string,
  tokenId: string,
  data: {
    description?: string;
    isActive?: boolean;
  }
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/site-api-tokens/${tokenId}`;
  const response = await workerFetch(url, env, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, siteId);
  await parseResponse(response);
}

/**
 * Delete (revoke) a site API token
 */
export async function deleteSiteApiTokenToWorker(
  env: WorkerEnv,
  siteId: string,
  tokenId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/site-api-tokens/${tokenId}`;
  const response = await workerFetch(url, env, {
    method: 'DELETE',
  }, siteId);
  await parseResponse(response);
}
