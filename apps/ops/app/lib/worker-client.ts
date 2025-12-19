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

export async function fetchPropertiesWithApplicationCountsFromWorker(
  env: WorkerEnv,
  siteId: string,
  options?: {
    onlyAvailable?: boolean;
  }
): Promise<any[]> {
  const params = new URLSearchParams({
    withApplicationCounts: 'true',
  });

  if (options?.onlyAvailable) {
    params.set('onlyAvailable', 'true');
  }

  const url = `${env.WORKER_URL}/api/ops/properties?${params.toString()}`;
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

export async function archiveLeadToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/archive`;
  const response = await workerFetch(url, env, {
    method: 'POST',
  }, siteId);
  await parseResponse(response);
}

export async function restoreLeadToWorker(
  env: WorkerEnv,
  siteId: string,
  leadId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/restore`;
  const response = await workerFetch(url, env, {
    method: 'POST',
  }, siteId);
  await parseResponse(response);
}

// ==================== WORK ORDERS ====================

export async function fetchWorkOrdersFromWorker(
  env: WorkerEnv,
  siteId: string,
  options?: { status?: string; propertyId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/work-orders`;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.propertyId) params.set('propertyId', options.propertyId);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
  if (params.toString()) url += `?${params.toString()}`;

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
 * Create a new user
 */
export async function createUserToWorker(
  env: WorkerEnv,
  data: {
    email: string;
    name: string;
    password: string;
    role: string;
    siteId: string;
    isSuperAdmin?: boolean;
  }
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/users`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
 * Update user role
 */
export async function updateUserRoleToWorker(
  env: WorkerEnv,
  userId: string,
  role: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/role`;
  await workerFetch(url, env, {
    method: 'PUT',
    body: JSON.stringify({ role }),
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
  role?: string,
  grantedBy?: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/users/${userId}/site-access`;
  await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ siteId, role, grantedBy }),
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
  options?: { status?: string; propertyId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/tenants`;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.propertyId) params.set('propertyId', options.propertyId);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
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

/**
 * Delete tenant
 */
export async function deleteTenantToWorker(
  env: WorkerEnv,
  siteId: string,
  tenantId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/tenants/${tenantId}`;
  await workerFetch(url, env, {
    method: 'DELETE',
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
  userId: string,
  leadId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leads/${leadId}/ai-evaluation`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'X-User-Id': userId,
    },
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

// ==================== LEASE OPERATIONS ====================

/**
 * Fetch leases with optional filtering
 */
export async function fetchLeasesFromWorker(
  env: WorkerEnv,
  siteId: string,
  options?: {
    status?: string;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/leases`;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.propertyId) params.set('propertyId', options.propertyId);
  if (options?.unitId) params.set('unitId', options.unitId);
  if (options?.tenantId) params.set('tenantId', options.tenantId);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Fetch a single lease by ID
 */
export async function fetchLeaseByIdFromWorker(
  env: WorkerEnv,
  siteId: string,
  leaseId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leases/${leaseId}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create a new lease
 */
export async function createLeaseToWorker(
  env: WorkerEnv,
  siteId: string,
  data: {
    propertyId: string;
    unitId?: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    status?: string;
  }
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/leases`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Update a lease
 */
export async function updateLeaseToWorker(
  env: WorkerEnv,
  siteId: string,
  leaseId: string,
  data: Partial<{
    propertyId: string;
    unitId: string | null;
    tenantId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    status: string;
    signedAt: string | null;
  }>
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/leases/${leaseId}`;
  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
  }, siteId);
  await parseResponse(response);
}

/**
 * Delete a lease
 */
export async function deleteLeaseToWorker(
  env: WorkerEnv,
  siteId: string,
  leaseId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/leases/${leaseId}/delete`;
  const response = await workerFetch(url, env, {
    method: 'POST',
  }, siteId);
  await parseResponse(response);
}

/**
 * Fetch lease files
 */
export async function fetchLeaseFilesFromWorker(
  env: WorkerEnv,
  siteId: string,
  leaseId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/leases/${leaseId}/files`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Delete a lease file
 */
export async function deleteLeaseFileToWorker(
  env: WorkerEnv,
  siteId: string,
  leaseId: string,
  fileId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/leases/${leaseId}/files/${fileId}/delete`;
  const response = await workerFetch(url, env, {
    method: 'POST',
  }, siteId);
  await parseResponse(response);
}

// ==================== THEME CONFIGURATION ====================

export interface ThemePayload {
  siteId: string;
  themePreset: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandFaviconUrl: string | null;
  fontFamily: string | null;
  enableDarkMode: boolean;
  defaultMode: string;
  customColors: {
    primary: string | null;
    secondary: string | null;
    accent: string | null;
  } | null;
  updatedAt: string;
}

export async function fetchThemeFromWorker(
  env: WorkerEnv,
  siteId: string
): Promise<ThemePayload> {
  const url = `${env.WORKER_URL}/api/ops/theme`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

export async function saveThemeToWorker(
  env: WorkerEnv,
  siteId: string,
  data: {
    themePreset: string;
    brandName?: string | null;
    brandLogoUrl?: string | null;
    brandFaviconUrl?: string | null;
    customPrimaryHsl?: string | null;
    customSecondaryHsl?: string | null;
    customAccentHsl?: string | null;
    fontFamily?: string | null;
    enableDarkMode?: boolean;
    defaultMode?: string;
  }
): Promise<ThemePayload> {
  const url = `${env.WORKER_URL}/api/ops/theme`;
  const response = await workerFetch(
    url,
    env,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    siteId
  );
  return parseResponse(response);
}

// ==================== APPLICATION WORKFLOW ====================

/**
 * Get all applicants for an application
 */
export async function fetchApplicationApplicantsFromWorker(
  env: WorkerEnv,
  siteId: string,
  applicationId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/applicants`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}


/**
 * Get a single applicant by ID
 */
export async function fetchApplicantFromWorker(
  env: WorkerEnv,
  siteId: string,
  applicantId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/applicants/${applicantId}`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create a new applicant
 */
export async function createApplicantToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/applicants`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  }, siteId);
  return parseResponse(response);
}

/**
 * Update an applicant
 */
export async function updateApplicantToWorker(
  env: WorkerEnv,
  siteId: string,
  applicantId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/applicants/${applicantId}`;
  const response = await workerFetch(url, env, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Delete an applicant
 */
export async function deleteApplicantToWorker(
  env: WorkerEnv,
  siteId: string,
  applicantId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/applicants/${applicantId}`;
  await workerFetch(url, env, {
    method: 'DELETE',
  }, siteId);
}

/**
 * Get all documents for an application
 */
export async function fetchApplicationDocumentsFromWorker(
  env: WorkerEnv,
  siteId: string,
  applicationId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/documents`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get document statistics for an application
 */
export async function fetchApplicationDocumentStatsFromWorker(
  env: WorkerEnv,
  siteId: string,
  applicationId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/documents/stats`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get documents for a specific applicant
 */
export async function fetchApplicantDocumentsFromWorker(
  env: WorkerEnv,
  siteId: string,
  applicantId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/applicants/${applicantId}/documents`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create a document record
 */
export async function createApplicationDocumentToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/documents`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  }, siteId);
  return parseResponse(response);
}

/**
 * Update a document
 */
export async function updateDocumentToWorker(
  env: WorkerEnv,
  siteId: string,
  documentId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/documents/${documentId}`;
  const response = await workerFetch(url, env, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Verify a document
 */
export async function verifyDocumentToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  documentId: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/documents/${documentId}/verify`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  const response = await workerFetch(url, env, {
    method: 'POST',
    headers,
  }, siteId);
  return parseResponse(response);
}

/**
 * Reject a document
 */
export async function rejectDocumentToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  documentId: string,
  reason: string
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/documents/${documentId}/reject`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    headers,
  }, siteId);
  return parseResponse(response);
}

/**
 * Get stage transitions for an application
 */
export async function fetchApplicationTransitionsFromWorker(
  env: WorkerEnv,
  siteId: string,
  applicationId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/transitions`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create a stage transition
 */
export async function createStageTransitionToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/transitions`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  }, siteId);
  return parseResponse(response);
}

/**
 * Get internal notes for an application
 */
export async function fetchApplicationNotesFromWorker(
  env: WorkerEnv,
  siteId: string,
  applicationId: string,
  category?: string
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/notes`;
  if (category) {
    url += `?category=${encodeURIComponent(category)}`;
  }
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Create an internal note
 */
export async function createApplicationNoteToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/notes`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  const response = await workerFetch(url, env, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  }, siteId);
  return parseResponse(response);
}

/**
 * Update a note
 */
export async function updateNoteToWorker(
  env: WorkerEnv,
  siteId: string,
  noteId: string,
  data: any
): Promise<any> {
  const url = `${env.WORKER_URL}/api/ops/notes/${noteId}`;
  const response = await workerFetch(url, env, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, siteId);
  return parseResponse(response);
}

/**
 * Delete a note
 */
export async function deleteNoteToWorker(
  env: WorkerEnv,
  siteId: string,
  noteId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/notes/${noteId}`;
  await workerFetch(url, env, {
    method: 'DELETE',
  }, siteId);
}

/**
 * Get property applications with sorting/filtering
 */
export async function fetchPropertyApplicationsFromWorker(
  env: WorkerEnv,
  siteId: string,
  propertyId: string,
  options?: { status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<any[]> {
  let url = `${env.WORKER_URL}/api/ops/properties/${propertyId}/applications`;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Get shortlisted applications for a property
 */
export async function fetchPropertyShortlistFromWorker(
  env: WorkerEnv,
  siteId: string,
  propertyId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/properties/${propertyId}/shortlist`;
  const response = await workerFetch(url, env, {}, siteId);
  return parseResponse(response);
}

/**
 * Add application to shortlist
 */
export async function shortlistApplicationToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/shortlist`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  await workerFetch(url, env, {
    method: 'POST',
    headers,
  }, siteId);
}

/**
 * Remove application from shortlist
 */
export async function removeFromShortlistToWorker(
  env: WorkerEnv,
  siteId: string,
  applicationId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/shortlist`;
  await workerFetch(url, env, {
    method: 'DELETE',
  }, siteId);
}

/**
 * Approve an application (stub)
 */
export async function approveApplicationToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/approve`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  await workerFetch(url, env, {
    method: 'POST',
    headers,
  }, siteId);
}

/**
 * Reject an application (stub)
 */
export async function rejectApplicationToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string,
  reason?: string
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/reject`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  await workerFetch(url, env, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: reason || '' }),
  }, siteId);
}

/**
 * Send email to applicant (stub)
 */
export async function sendApplicationEmailToWorker(
  env: WorkerEnv,
  siteId: string,
  userId: string,
  applicationId: string,
  emailData: {
    subject: string;
    message: string;
    template?: string;
  }
): Promise<void> {
  const url = `${env.WORKER_URL}/api/ops/applications/${applicationId}/send-email`;
  const headers = new Headers();
  headers.set('X-User-Id', userId);

  await workerFetch(url, env, {
    method: 'POST',
    headers,
    body: JSON.stringify(emailData),
  }, siteId);
}
