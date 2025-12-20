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
 */
opsApplicationsRoutes.get('/properties/:propertyId/applications', async (c: Context) => {
  try {
    const siteId = c.req.header('X-Site-Id');
    const propertyId = c.req.param('propertyId');

    if (!siteId) {
      return c.json({ error: 'Missing X-Site-Id header' }, 400);
    }

    const { getLeads } = await import('../lib/db/leads');

    const applications = await getLeads(c.env.DB, siteId, {
      propertyId,
      sortBy: c.req.query('sortBy') || 'ai_score',
      sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
      status: c.req.query('status') || undefined,
    });

    return c.json({
      success: true,
      data: applications,
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

export default opsApplicationsRoutes;
