# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

As this is an actively developed project, we recommend always using the latest version from the main branch.

## Reporting a Vulnerability

We take the security of LeaseLab seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do Not** Open a Public Issue

Please **do not** create a public GitHub issue for security vulnerabilities, as this could put users at risk.

### 2. Report Privately

Contact the maintainer directly through one of these channels:
- **Email**: [To be configured - contact repository maintainer]
- **GitHub Security Advisories**: Use the "Security" tab in this repository
- **Email**: [To be configured]

### 3. Include Detailed Information

When reporting a vulnerability, please include:
- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity assessment
- Suggested fix (if available)
- Your contact information for follow-up questions
- Any proof-of-concept code (in a secure, non-executable format)

### 4. Response Timeline

- **Initial Response**: We aim to acknowledge your report within **48 hours**
- **Status Updates**: We'll provide updates on the investigation within **7 days**
- **Resolution**: We'll work to patch confirmed vulnerabilities promptly and coordinate responsible disclosure
- **Public Disclosure**: After a fix is released, we'll coordinate disclosure timing with you

### 5. Recognition

We believe in recognizing security researchers who help keep our project secure. With your permission, we'll:
- Credit you in security advisories
- Add you to our security acknowledgments
- Work with you on disclosure timing

## Security Architecture

### Multi-Tenancy Security (CRITICAL)

LeaseLab is a multi-tenant application where each site's data must be completely isolated:

- **ALL database operations MUST filter by `site_id`**
- Database functions must accept `siteId` as the second parameter
- SQL queries must include `WHERE site_id = ?` clause
- JOIN queries must filter ALL joined tables by `site_id`
- See: `.cursor/skills/multi-tenancy-guidelines.md`

**Security Impact**: Failure to filter by `site_id` can lead to data leaks between tenants, which is a critical security vulnerability.

### Authentication & Authorization

- **Password Hashing**: All passwords use PBKDF2-SHA256 with 100,000 iterations
- **Token Hashing**: API tokens are hashed using PBKDF2-SHA256 before storage
- **Session Management**: Sessions are stored in D1 database with expiration
- **Bearer Token Authentication**: Worker API uses Bearer token authentication
- See: `.cursor/skills/security-guidelines.md`

### Data Access Patterns

- **Frontend Isolation**: Remix apps (ops/site) NEVER access D1 database directly
- **API-Only Access**: All data access from frontend goes through HTTP API calls to worker
- **Worker Authentication**: All worker API routes require Bearer token authentication
- **Site Isolation**: Each API request is authenticated and scoped to a specific site

## Environment Variables & Secrets

### Critical Secrets (NEVER Commit)

**Never commit** the following to version control:

- `.env.local` - Local environment configuration
- `.env.production` - Production environment configuration
- `.dev.vars` - Cloudflare Workers local development variables
- `wrangler.toml` with secrets (use `wrangler secret put` instead)
- Any files containing API keys, credentials, or secrets

### Required Environment Variables

#### Cloudflare Workers (apps/worker)

- `DB` - D1 Database binding (configured in wrangler.toml)
- `PUBLIC_BUCKET` - R2 public bucket binding (for property images)
- `PRIVATE_BUCKET` - R2 private bucket binding (for sensitive documents)
- `OPENAI_API_KEY` - OpenAI API key for AI evaluations
- `SESSION_SECRET` - Session encryption key (32+ bytes, random)
- `SITE_API_TOKEN_SALT` - Salt for API token hashing (shared constant)

#### Remix Apps (apps/ops, apps/site)

- `WORKER_URL` - URL of the worker API endpoint
- `SESSION_SECRET` - Session encryption key (must match worker)

### Secret Management Best Practices

1. **Use Cloudflare Secrets**: Store secrets using `wrangler secret put <KEY>`
2. **Never Hardcode**: Never hardcode secrets in source code
3. **Rotate Regularly**: Rotate secrets periodically (especially after team member changes)
4. **Least Privilege**: Use service accounts with minimal required permissions
5. **Separate Environments**: Use different secrets for dev/staging/production

## Security Considerations

### Database Security

- **Parameterized Queries**: All SQL queries use parameterized statements to prevent SQL injection
- **Multi-Tenant Isolation**: All queries filter by `site_id` to prevent cross-tenant data access
- **Soft Deletes**: Prefer soft deletes (`is_active = 0`) over hard deletes for audit trails
- **Foreign Key Constraints**: Database schema uses foreign keys with CASCADE for data integrity

### API Security

- **Bearer Token Authentication**: All worker API routes require valid Bearer tokens
- **Token Hashing**: API tokens are hashed before storage (cannot be recovered)
- **HTTPS Only**: All API communication must use HTTPS
- **CORS Configuration**: CORS is configured to allow only trusted origins
- **Rate Limiting**: Consider implementing rate limiting for public endpoints

### File Storage Security

- **Public vs Private Buckets**: 
  - Public bucket: Property images, public assets
  - Private bucket: Applications, leases, ID documents, sensitive files
- **Signed URLs**: Private files are accessed via temporary signed URLs with expiration
- **File Validation**: Validate file types and sizes before upload
- **Content-Type Headers**: Set appropriate Content-Type headers for file responses

### Frontend Security

- **No Direct DB Access**: Remix apps never access D1 database directly
- **API-Only Pattern**: All data access via authenticated HTTP API calls
- **Session Security**: Sessions use secure, httpOnly cookies
- **CSRF Protection**: Remix provides built-in CSRF protection
- **Input Validation**: All user inputs are validated using Zod schemas

### Third-Party Integrations

This application integrates with:
- **OpenAI API**: For AI-powered lead evaluations
- **Cloudflare Services**: D1 (database), R2 (storage), Workers (compute)
- **Email Services**: For notifications (if configured)

**Security Requirements**:
- Use service accounts with minimal required permissions
- Regularly rotate API keys
- Monitor API usage for unusual patterns
- Validate all third-party responses

## Security Checklist for Deployment

Before deploying to production:

### Environment & Secrets
- [ ] All environment variables are set and secured
- [ ] Secrets are stored using `wrangler secret put` (not in code)
- [ ] Different secrets for dev/staging/production
- [ ] `.env` files are in `.gitignore`
- [ ] No secrets in commit history

### Network & Transport
- [ ] HTTPS is enforced for all traffic
- [ ] CORS policies are properly configured
- [ ] Rate limiting is configured on API routes
- [ ] Security headers are configured (CSP, HSTS, etc.)

### Authentication & Authorization
- [ ] Bearer token authentication is working
- [ ] Session expiration is configured
- [ ] Password hashing uses PBKDF2-SHA256 (100,000 iterations)
- [ ] API tokens are hashed before storage
- [ ] Multi-tenant isolation is verified (all queries filter by `site_id`)

### Data Protection
- [ ] Input validation is in place (Zod schemas)
- [ ] SQL injection prevention (parameterized queries)
- [ ] File upload validation (type, size, content)
- [ ] Sensitive files in private bucket
- [ ] Signed URLs have appropriate expiration

### Monitoring & Logging
- [ ] Error messages don't expose sensitive information
- [ ] Logs don't contain passwords, tokens, or PII
- [ ] Security events are logged
- [ ] Monitoring is configured for unusual patterns

### Dependencies
- [ ] Dependencies are up to date (`npm audit`)
- [ ] Known vulnerabilities are patched
- [ ] Regular dependency updates scheduled

### Code Review
- [ ] All database operations filter by `site_id`
- [ ] All passwords/tokens use crypto utilities
- [ ] No plaintext secrets in code
- [ ] Security guidelines are followed (`.cursor/skills/security-guidelines.md`)

## Automated Security

Run these commands regularly:

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically fixable vulnerabilities
npm audit fix

# Update dependencies
npm update

# Type check (catches some security issues)
npm run typecheck

# Build (catches some security issues)
npm run build
```

## Security Best Practices

### Code Development

1. **Follow Security Guidelines**: Always follow `.cursor/skills/security-guidelines.md`
2. **Multi-Tenancy First**: Always filter by `site_id` in database operations
3. **Use Crypto Utilities**: Use `shared/utils/crypto.ts` for all password/token operations
4. **Parameterized Queries**: Never use string concatenation for SQL queries
5. **Input Validation**: Validate all inputs using Zod schemas from `shared/config/`

### Password & Token Security

- **NEVER** store plaintext passwords or tokens
- **ALWAYS** use `hashPassword()` and `hashToken()` from `shared/utils/crypto.ts`
- **NEVER** roll your own crypto implementations
- **ALWAYS** use PBKDF2-SHA256 with 100,000 iterations for passwords

### Database Security

- **ALWAYS** filter by `site_id` in ALL queries
- **ALWAYS** use parameterized queries (prevent SQL injection)
- **ALWAYS** validate inputs before database operations
- **NEVER** trust user input for `site_id` (get from authenticated session)

### API Security

- **ALWAYS** require Bearer token authentication for worker API routes
- **ALWAYS** validate tokens using hashed tokens from database
- **ALWAYS** use HTTPS for all API communication
- **CONSIDER** rate limiting for public endpoints

## Known Security Considerations

### Multi-Tenancy

- Each site's data is isolated by `site_id` filtering
- Users can have access to multiple sites via `user_access` table
- Super admins can access any site with active API tokens
- All database operations must enforce site isolation

### Data Types Handled

This application handles:
- Tenant contact information (PII)
- Property details
- Rental applications (PII)
- Lease agreements (sensitive documents)
- Work orders
- User authentication data

**Compliance**: Ensure compliance with relevant data protection regulations (GDPR, CCPA, etc.) when deploying.

### Client-Side Considerations

- Property listing data is publicly accessible by design
- Contact forms transmit data over HTTPS
- Authentication is required for admin operations
- API tokens are shown to users once and cannot be recovered

## Security Resources

### Internal Documentation

- **Security Guidelines**: `.cursor/skills/security-guidelines.md`
- **Multi-Tenancy Guidelines**: `.cursor/skills/multi-tenancy-guidelines.md`
- **Cloudflare Worker Guidelines**: `.cursor/skills/cloudflare-worker-guidelines.md`
- **Remix Frontend Guidelines**: `.cursor/skills/remix-frontend-guidelines.md`

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Best Practices](https://developers.cloudflare.com/workers/learning/security-best-practices/)
- [Remix Security](https://remix.run/docs/en/main/guides/security)
- [D1 Database Security](https://developers.cloudflare.com/d1/learning/security-best-practices/)

## Disclosure Policy

- We follow **responsible disclosure** practices
- Security patches will be released as soon as possible after verification
- Credit will be given to researchers who report vulnerabilities responsibly
- We'll coordinate disclosure timing with reporters
- Public disclosure will occur after patches are available

## Security Updates

Security updates will be:
- Released promptly after verification and patching
- Documented in security advisories
- Backported to supported versions when possible
- Communicated through appropriate channels

---

**Last Updated**: November 28, 2024  
**Version**: 1.0  
**Maintainer**: [To be configured]

Thank you for helping keep LeaseLab and its users secure!

