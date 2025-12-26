/**
 * Application Progress Workflow API Routes (/api/ops/applications/*)
 *
 * Handles:
 * - Multi-applicant management
 * - Document management with verification
 * - Stage transitions with audit trails
 * - Internal notes
 * - Property-centric application views
 * - Shortlist management
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  getApplicantsByApplicationId,
  getApplicantById,
  getPrimaryApplicant,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  getApplicantCount,
  getApplicantByInviteToken,
} from '../lib/db/application-applicants';
import {
  getDocumentsByApplicationId,
  getDocumentsByApplicantId,
  getDocumentById,
  createDocument,
  updateDocument,
  verifyDocument,
  rejectDocument,
  deleteDocument,
  getDocumentStats,
  getDocumentStatsByApplicant,
} from '../lib/db/application-documents';
import {
  getTransitionsByApplicationId,
  getTransitionById,
  getLatestTransition,
  createTransition,
  getBypassTransitions,
  getTransitionStats,
} from '../lib/db/application-stage-transitions';
import {
  getNotesByApplicationId,
  getNotesByApplicantId,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getNotesByCategory,
  getHighPriorityNotes,
  getNoteStats,
} from '../lib/db/application-internal-notes';
import { updateLead, getLeadById, recordLeadHistory } from '../lib/db/leads';

import type { CloudflareEnv } from '../../../shared/config';

type Bindings = CloudflareEnv;

const opsApplicationsRoutes = new Hono<{ Bindings: Bindings }>();

// ==================== APPLICANTS ====================

/**
 * GET /api/ops/applications/:applicationId/applicants
 * Get all applicants for an application
 */
opsApplicationsRoutes.get('/applications/:applicationId/applicants', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const applicants = await getApplicantsByApplicationId(c.env.DB, applicationId);

    return c.json({
      success: true,
      data: applicants,
    });
  } catch (error) {
    console.error('Error fetching applicants:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/applicants/:applicantId
 * Get a single applicant by ID
 */
opsApplicationsRoutes.get('/applicants/:applicantId', async (c: Context) => {
  try {
    const applicantId = c.req.param('applicantId');
    const applicant = await getApplicantById(c.env.DB, applicantId);

    if (!applicant) {
      return c.json({ error: 'Applicant not found' }, 404);
    }

    return c.json({
      success: true,
      data: applicant,
    });
  } catch (error) {
    console.error('Error fetching applicant:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/applicants
 * Create a new applicant for an application
 */
opsApplicationsRoutes.post('/applications/:applicationId/applicants', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');
    const body = await c.req.json();

    // Validate required fields
    if (!body.applicantType || !body.firstName || !body.lastName || !body.email) {
      return c.json({
        error: 'Validation error',
        message: 'Missing required fields: applicantType, firstName, lastName, email',
      }, 400);
    }

    // Create applicant
    const applicant = await createApplicant(c.env.DB, {
      ...body,
      applicationId,
      createdBy: userId || null,
    });

    // TODO: If sendInvite=true, send invite email with token

    return c.json({
      success: true,
      data: applicant,
    }, 201);
  } catch (error) {
    console.error('Error creating applicant:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PATCH /api/ops/applicants/:applicantId
 * Update an applicant
 */
opsApplicationsRoutes.patch('/applicants/:applicantId', async (c: Context) => {
  try {
    const applicantId = c.req.param('applicantId');
    const body = await c.req.json();

    const updated = await updateApplicant(c.env.DB, applicantId, body);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating applicant:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * DELETE /api/ops/applicants/:applicantId
 * Delete an applicant
 */
opsApplicationsRoutes.delete('/applicants/:applicantId', async (c: Context) => {
  try {
    const applicantId = c.req.param('applicantId');
    await deleteApplicant(c.env.DB, applicantId);

    return c.json({
      success: true,
      message: 'Applicant deleted',
    });
  } catch (error) {
    console.error('Error deleting applicant:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== DOCUMENTS ====================

/**
 * GET /api/ops/applications/:applicationId/documents
 * Get all documents for an application
 */
opsApplicationsRoutes.get('/applications/:applicationId/documents', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const documents = await getDocumentsByApplicationId(c.env.DB, applicationId);

    return c.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/applications/:applicationId/documents/stats
 * Get document statistics for an application
 */
opsApplicationsRoutes.get('/applications/:applicationId/documents/stats', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const stats = await getDocumentStats(c.env.DB, applicationId);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/applicants/:applicantId/documents
 * Get all documents for a specific applicant
 */
opsApplicationsRoutes.get('/applicants/:applicantId/documents', async (c: Context) => {
  try {
    const applicantId = c.req.param('applicantId');
    const documents = await getDocumentsByApplicantId(c.env.DB, applicantId);

    return c.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching applicant documents:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/documents
 * Create a new document record
 */
opsApplicationsRoutes.post('/applications/:applicationId/documents', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');
    const body = await c.req.json();

    // Validate required fields
    if (!body.documentType || !body.fileName || !body.storageKey) {
      return c.json({
        error: 'Validation error',
        message: 'Missing required fields: documentType, fileName, storageKey',
      }, 400);
    }

    const document = await createDocument(c.env.DB, {
      ...body,
      applicationId,
      uploadedBy: userId || null,
    });

    return c.json({
      success: true,
      data: document,
    }, 201);
  } catch (error) {
    console.error('Error creating document:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PATCH /api/ops/documents/:documentId
 * Update a document's metadata
 */
opsApplicationsRoutes.patch('/documents/:documentId', async (c: Context) => {
  try {
    const documentId = c.req.param('documentId');
    const body = await c.req.json();

    const updated = await updateDocument(c.env.DB, documentId, body);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/documents/:documentId/verify
 * Mark a document as verified
 */
opsApplicationsRoutes.post('/documents/:documentId/verify', async (c: Context) => {
  try {
    const documentId = c.req.param('documentId');
    const userId = c.req.header('X-User-Id');

    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 400);
    }

    const verified = await verifyDocument(c.env.DB, documentId, userId);

    return c.json({
      success: true,
      data: verified,
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/documents/:documentId/reject
 * Reject a document
 */
opsApplicationsRoutes.post('/documents/:documentId/reject', async (c: Context) => {
  try {
    const documentId = c.req.param('documentId');
    const userId = c.req.header('X-User-Id');
    const body = await c.req.json();

    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 400);
    }

    if (!body.reason) {
      return c.json({ error: 'Rejection reason is required' }, 400);
    }

    const rejected = await rejectDocument(c.env.DB, documentId, body.reason, userId);

    return c.json({
      success: true,
      data: rejected,
    });
  } catch (error) {
    console.error('Error rejecting document:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== STAGE TRANSITIONS ====================

/**
 * GET /api/ops/applications/:applicationId/transitions
 * Get all stage transitions for an application
 */
opsApplicationsRoutes.get('/applications/:applicationId/transitions', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const transitions = await getTransitionsByApplicationId(c.env.DB, applicationId);

    return c.json({
      success: true,
      data: transitions,
    });
  } catch (error) {
    console.error('Error fetching transitions:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/transitions
 * Create a stage transition (and update lead status)
 */
opsApplicationsRoutes.post('/applications/:applicationId/transitions', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');
    const body = await c.req.json();

    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 400);
    }

    if (!body.toStage) {
      return c.json({ error: 'Missing required field: toStage' }, 400);
    }

    // Get current lead to determine fromStage
    const lead = await getLeadById(c.env.DB, siteId, applicationId);
    if (!lead) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Create transition record
    const transition = await createTransition(c.env.DB, {
      applicationId,
      fromStage: lead.status,
      toStage: body.toStage,
      transitionType: 'manual',
      confirmationAcknowledged: true,
      bypassReason: body.bypassReason || null,
      bypassCategory: body.bypassCategory || null,
      checklistSnapshot: body.checklistSnapshot || null,
      internalNotes: body.internalNotes || null,
      transitionedBy: userId,
    });

    // Update lead status
    await updateLead(c.env.DB, siteId, applicationId, {
      status: body.toStage,
    });

    return c.json({
      success: true,
      data: transition,
    }, 201);
  } catch (error) {
    console.error('Error creating transition:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== INTERNAL NOTES ====================

/**
 * GET /api/ops/applications/:applicationId/notes
 * Get all notes for an application
 */
opsApplicationsRoutes.get('/applications/:applicationId/notes', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const category = c.req.query('category');

    const notes = await getNotesByApplicationId(c.env.DB, applicationId, {
      category: category || undefined,
    });

    return c.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/notes
 * Create a new internal note
 */
opsApplicationsRoutes.post('/applications/:applicationId/notes', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');
    const body = await c.req.json();

    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 400);
    }

    if (!body.noteText) {
      return c.json({ error: 'Missing required field: noteText' }, 400);
    }

    const note = await createNote(c.env.DB, {
      ...body,
      applicationId,
      createdBy: userId,
    });

    return c.json({
      success: true,
      data: note,
    }, 201);
  } catch (error) {
    console.error('Error creating note:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * PATCH /api/ops/notes/:noteId
 * Update a note
 */
opsApplicationsRoutes.patch('/notes/:noteId', async (c: Context) => {
  try {
    const noteId = c.req.param('noteId');
    const body = await c.req.json();

    const updated = await updateNote(c.env.DB, noteId, body);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating note:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * DELETE /api/ops/notes/:noteId
 * Delete a note
 */
opsApplicationsRoutes.delete('/notes/:noteId', async (c: Context) => {
  try {
    const noteId = c.req.param('noteId');
    await deleteNote(c.env.DB, noteId);

    return c.json({
      success: true,
      message: 'Note deleted',
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== PROPERTY-CENTRIC VIEWS ====================

/**
 * GET /api/ops/properties/:propertyId/applications
 * Get all applications for a property with sorting/filtering
 *
 * Query parameters:
 * - groupBy: 'unit' | 'property' (default: 'property') - Group applications by unit or return flat list
 * - sortBy: 'ai_score' | 'created_at' | 'updated_at' (default: 'ai_score')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 * - status: Filter by application status
 */
opsApplicationsRoutes.get('/properties/:propertyId/applications', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    const propertyId = c.req.param('propertyId');

    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    const groupBy = c.req.query('groupBy') || 'property';
    const sortBy = c.req.query('sortBy') || 'ai_score';
    const sortOrder = (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc';
    const status = c.req.query('status') || undefined;

    // Use grouped view if requested
    if (groupBy === 'unit') {
      const { getLeadsGroupedByUnit } = await import('../lib/db/leads');

      const groupedApplications = await getLeadsGroupedByUnit(c.env.DB, siteId, {
        propertyId,
        sortBy,
        sortOrder,
        status,
      });

      return c.json({
        success: true,
        data: groupedApplications,
        groupedBy: 'unit',
      });
    }

    // Default: flat list view
    const { getLeads } = await import('../lib/db/leads');

    const applications = await getLeads(c.env.DB, siteId, {
      propertyId,
      sortBy,
      sortOrder,
      status,
    });

    return c.json({
      success: true,
      data: applications,
      groupedBy: 'property',
    });
  } catch (error) {
    console.error('Error fetching property applications:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/ops/properties/:propertyId/shortlist
 * Get shortlisted applications for a property
 */
opsApplicationsRoutes.get('/properties/:propertyId/shortlist', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    const propertyId = c.req.param('propertyId');

    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    // Query shortlisted leads for this property
    const { getLeads } = await import('../lib/db/leads');
    const applications = await getLeads(c.env.DB, siteId, {
      propertyId,
      sortBy: 'household_ai_score',
      sortOrder: 'desc',
    });

    // Filter to only shortlisted applications (where shortlisted_at is not null)
    // Note: We'll need to extend the Lead type to include these fields
    // For now, return all and let the frontend filter
    return c.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('Error fetching shortlist:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/shortlist
 * Add an application to the shortlist
 */
opsApplicationsRoutes.post('/applications/:applicationId/shortlist', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');

    if (!siteId || !userId) {
      return c.json({ error: 'Missing required headers' }, 400);
    }

    const now = new Date().toISOString();

    // Update lead with shortlist info
    await updateLead(c.env.DB, siteId, applicationId, {
      shortlistedAt: now,
      shortlistedBy: userId,
    } as any); // Type assertion needed until we extend Lead interface

    return c.json({
      success: true,
      message: 'Application shortlisted',
    });
  } catch (error) {
    console.error('Error shortlisting application:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * DELETE /api/ops/applications/:applicationId/shortlist
 * Remove an application from the shortlist
 */
opsApplicationsRoutes.delete('/applications/:applicationId/shortlist', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    const applicationId = c.req.param('applicationId');

    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    // Clear shortlist fields
    await updateLead(c.env.DB, siteId, applicationId, {
      shortlistedAt: null,
      shortlistedBy: null,
    } as any);

    return c.json({
      success: true,
      message: 'Application removed from shortlist',
    });
  } catch (error) {
    console.error('Error removing from shortlist:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ==================== APPLICATION ACTIONS ====================

/**
 * POST /api/ops/applications/:applicationId/approve
 * Approve an application
 */
opsApplicationsRoutes.post('/applications/:applicationId/approve', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');

    const lead = await getLeadById(c.env.DB, siteId, applicationId);
    if (!lead) {
      return c.json({ error: 'Not found', message: 'Application not found' }, 404);
    }

    await updateLead(c.env.DB, siteId, applicationId, { status: 'approved' });
    await recordLeadHistory(c.env.DB, siteId, applicationId, 'application_approved', {
      previousStatus: lead.status,
      approvedBy: userId ?? null,
    });

    return c.json({
      success: true,
      message: 'Application approved',
    });
  } catch (error) {
    console.error('Error approving application:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/reject
 * Reject an application
 */
opsApplicationsRoutes.post('/applications/:applicationId/reject', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');
    const body = await c.req.json();
    const reason = typeof body?.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim()
      : 'No reason provided';

    const lead = await getLeadById(c.env.DB, siteId, applicationId);
    if (!lead) {
      return c.json({ error: 'Not found', message: 'Application not found' }, 404);
    }

    await updateLead(c.env.DB, siteId, applicationId, { status: 'rejected' });
    await recordLeadHistory(c.env.DB, siteId, applicationId, 'application_rejected', {
      previousStatus: lead.status,
      rejectedBy: userId ?? null,
      reason,
    });

    return c.json({
      success: true,
      message: 'Application rejected',
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/revive
 * Revive a rejected application back to a reviewable state
 */
opsApplicationsRoutes.post('/applications/:applicationId/revive', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');

    const lead = await getLeadById(c.env.DB, siteId, applicationId);
    if (!lead) {
      return c.json({ error: 'Not found', message: 'Application not found' }, 404);
    }

    await updateLead(c.env.DB, siteId, applicationId, { status: 'new' });
    await recordLeadHistory(c.env.DB, siteId, applicationId, 'application_revived', {
      previousStatus: lead.status,
      revivedBy: userId ?? null,
    });

    return c.json({
      success: true,
      message: 'Application revived',
    });
  } catch (error) {
    console.error('Error reviving application:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/send-email
 * Send email to applicant (stub)
 */
opsApplicationsRoutes.post('/applications/:applicationId/send-email', async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId');
    const userId = c.req.header('X-User-Id');
    const body = await c.req.json();
    const { subject, message, template } = body;

    console.log(`[STUB] Sending email for application ${applicationId} by user ${userId}`);
    console.log(`Subject: ${subject}, Template: ${template}`);

    // TODO: Implement actual email sending logic
    // - Load applicant email addresses
    // - Render email template with application data
    // - Send via email service (e.g., SendGrid, AWS SES)
    // - Log email sent in application history

    return c.json({
      success: true,
      message: 'Email sent (stub)',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/bulk
 * Perform bulk operations on multiple applications
 */
opsApplicationsRoutes.post('/applications/bulk', async (c: Context) => {
  try {
    const siteId = c.get('siteId');
    const userId = c.get('userId');

    if (!siteId || !userId) {
      return c.json({ error: 'Missing siteId or userId' }, 401);
    }

    const body = await c.req.json();
    const { application_ids, action, params = {} } = body;

    // Validation
    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      return c.json({ error: 'Invalid application_ids: must be non-empty array' }, 400);
    }

    if (application_ids.length > 50) {
      return c.json({ error: 'Maximum 50 applications per bulk action' }, 400);
    }

    const validActions = ['reject', 'move_to_stage', 'archive', 'send_email'];
    if (!validActions.includes(action)) {
      return c.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
    }

    // Verify all applications exist and belong to the same unit
    const { getLeads } = await import('../lib/db/leads');
    const applications = await getLeads(c.env.DB, siteId, { limit: 1000 });

    const selectedApps = applications.filter((app: any) => application_ids.includes(app.id));

    if (selectedApps.length !== application_ids.length) {
      return c.json({ error: 'Some applications not found' }, 404);
    }

    const unitIds = new Set(selectedApps.map((app: any) => app.unitId).filter(Boolean));
    if (unitIds.size > 1) {
      return c.json({
        error: 'All applications must belong to the same unit',
        details: 'Multi-select across units is not supported'
      }, 400);
    }

    // Create bulk action record
    const { createBulkAction, updateBulkActionResults } = await import('../lib/db/bulk-actions');
    const bulkActionId = await createBulkAction(
      c.env.DB,
      userId,
      action,
      application_ids.length,
      params
    );

    // Execute bulk action
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    const { updateLead } = await import('../lib/db/leads');
    const { logAuditEntry } = await import('../lib/db/bulk-actions');

    for (const appId of application_ids) {
      try {
        switch (action) {
          case 'reject':
            await updateLead(c.env.DB, siteId, appId, {
              status: 'rejected',
            });
            await logAuditEntry(c.env.DB, {
              entityType: 'application',
              entityId: appId,
              action: 'reject',
              performedBy: userId,
              bulkActionId,
              changes: {
                status: 'rejected',
                reason: params.reason || 'Bulk rejection',
                rejected_at: new Date().toISOString(),
                rejected_by: userId,
              },
            });
            results.push({ application_id: appId, status: 'success' });
            successCount++;
            break;

          case 'move_to_stage':
            if (!params.stage) {
              throw new Error('Stage parameter required for move_to_stage action');
            }
            await updateLead(c.env.DB, siteId, appId, { status: params.stage });
            await logAuditEntry(c.env.DB, {
              entityType: 'application',
              entityId: appId,
              action: 'move_to_stage',
              performedBy: userId,
              bulkActionId,
              changes: { status: params.stage },
            });
            results.push({ application_id: appId, status: 'success' });
            successCount++;
            break;

          case 'archive':
            await updateLead(c.env.DB, siteId, appId, { isActive: false });
            await logAuditEntry(c.env.DB, {
              entityType: 'application',
              entityId: appId,
              action: 'archive',
              performedBy: userId,
              bulkActionId,
              changes: { is_active: false },
            });
            results.push({ application_id: appId, status: 'success' });
            successCount++;
            break;

          case 'send_email':
            // TODO: Integrate with email system (Feature #1 from 202601-next-batch)
            console.log(`[STUB] Sending email to application ${appId}`);
            await logAuditEntry(c.env.DB, {
              entityType: 'application',
              entityId: appId,
              action: 'send_email',
              performedBy: userId,
              bulkActionId,
              changes: { email_template: params.template_id },
            });
            results.push({ application_id: appId, status: 'success' });
            successCount++;
            break;
        }
      } catch (error) {
        console.error(`Error processing application ${appId}:`, error);
        results.push({
          application_id: appId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }
    }

    // Update bulk action results
    await updateBulkActionResults(c.env.DB, bulkActionId, successCount, failureCount);

    return c.json({
      bulk_action_id: bulkActionId,
      success_count: successCount,
      failure_count: failureCount,
      results,
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/ops/applications/:applicationId/proceed-to-lease
 * Initiate lease creation from approved application
 */
opsApplicationsRoutes.post('/applications/:applicationId/proceed-to-lease', async (c: Context) => {
  try {
    const siteId = c.get('siteId');
    const userId = c.get('userId');
    const applicationId = c.req.param('applicationId');

    if (!siteId || !userId) {
      return c.json({ error: 'Missing siteId or userId' }, 401);
    }

    const body = await c.req.json();
    const { lease_start_date, lease_term_months } = body;

    // Validation
    if (!lease_start_date || !lease_term_months) {
      return c.json({ error: 'lease_start_date and lease_term_months required' }, 400);
    }

    // Verify application exists and is suitable for lease
    const { getLeadById } = await import('../lib/db/leads');
    const application = await getLeadById(c.env.DB, siteId, applicationId);

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Check if application is shortlisted (AI evaluated with good score/label)
    const isShortlisted =
      application.status === 'ai_evaluated' &&
      (application.aiLabel === 'A' || application.aiLabel === 'B' || (application.aiScore && application.aiScore >= 70));

    if (!isShortlisted) {
      return c.json({
        error: 'Application must be shortlisted',
        details: 'Only applications with AI grade A/B or score ≥70 can proceed to lease'
      }, 400);
    }

    // Check unit assignment and availability
    if (!application.unitId) {
      return c.json({ error: 'Application must have a unit assigned' }, 400);
    }

    const { getUnitById } = await import('../lib/db/units');
    const unit = await getUnitById(c.env.DB, siteId, application.unitId);

    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404);
    }

    if (unit.status !== 'available') {
      return c.json({
        error: 'Unit is not available',
        details: `Unit status: ${unit.status}. Only available units can be leased.`
      }, 400);
    }

    // Create tenant record from application data
    const { createTenant } = await import('../lib/db/tenants');
    const tenant = await createTenant(c.env.DB, siteId, {
      leadId: applicationId,
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phone: application.phone || '',
      emergencyContact: undefined,
      emergencyPhone: undefined,
      status: 'moving_in', // Tenant approved, in process of finalizing lease
    });

    // Create lease record with draft status
    // Note: This creates a "lease in progress" that needs to complete onboarding checklist
    const { createLease } = await import('../lib/db/leases');
    const lease = await createLease(c.env.DB, siteId, {
      propertyId: application.propertyId,
      unitId: application.unitId,
      tenantId: tenant.id,
      status: 'draft', // Draft until lease documents are uploaded
      startDate: lease_start_date,
      endDate: calculateLeaseEndDate(lease_start_date, lease_term_months),
      monthlyRent: unit.rentAmount,
      securityDeposit: unit.depositAmount || unit.rentAmount, // Use deposit or default to 1 month rent
    });
    const leaseId = lease.id;

    // Set onboarding status to in_progress via direct DB update
    // (updateLease doesn't support onboarding_status yet, so we use direct SQL)
    await c.env.DB
      .prepare('UPDATE leases SET onboarding_status = ? WHERE id = ?')
      .bind('in_progress', leaseId)
      .run();

    // Create onboarding checklist for the new lease
    const { createLeaseChecklist, DEFAULT_CHECKLIST_STEPS } = await import('../lib/db/lease-onboarding');
    await createLeaseChecklist(c.env.DB, leaseId, DEFAULT_CHECKLIST_STEPS);

    // Update application status to approved
    const { updateLead } = await import('../lib/db/leads');
    await updateLead(c.env.DB, siteId, applicationId, {
      status: 'approved',
    });

    // Log audit entry with approval metadata
    const { logAuditEntry } = await import('../lib/db/bulk-actions');
    await logAuditEntry(c.env.DB, {
      entityType: 'application',
      entityId: applicationId,
      action: 'proceed_to_lease',
      performedBy: userId,
      changes: {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
        lease_id: leaseId,
        lease_start_date,
        lease_term_months,
      },
    });

    return c.json({
      lease_id: leaseId,
      redirect_url: `/admin/leases/in-progress`,
      message: 'Lease created successfully. Complete the onboarding checklist to activate.',
    });
  } catch (error) {
    console.error('Error proceeding to lease:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Helper function to calculate lease end date
function calculateLeaseEndDate(startDate: string, termMonths: number): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + termMonths);
  return end.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

export default opsApplicationsRoutes;
