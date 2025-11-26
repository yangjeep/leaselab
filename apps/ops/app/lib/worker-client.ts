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
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Worker API error: ${error.error || error.message || response.statusText}`);
  }

  return response;
}

/**
 * Parse JSON response from worker
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const json = await response.json();

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
  siteId: string
): Promise<any[]> {
  const url = `${env.WORKER_URL}/api/ops/leads`;
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

/**
 * Check if worker is configured
 */
export function isWorkerConfigured(env: Partial<WorkerEnv>): boolean {
  return Boolean(env.WORKER_URL);
}

/**
 * Get worker URL or throw error
 */
export function getWorkerUrl(env: Partial<WorkerEnv>): string {
  if (!env.WORKER_URL) {
    throw new Error('WORKER_URL environment variable is not configured');
  }
  return env.WORKER_URL;
}
