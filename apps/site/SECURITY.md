# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

As this is an actively developed project, we recommend always using the latest version from the main branch.

## Reporting a Vulnerability

We take the security of this rental management application seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do Not** Open a Public Issue

Please **do not** create a public GitHub issue for security vulnerabilities, as this could put users at risk.

### 2. Report Privately

Contact the maintainer directly through one of these channels:
- Email: [Your contact email - to be added]
- GitHub Security Advisories: Use the "Security" tab in this repository

### 3. Include Detailed Information

When reporting a vulnerability, please include:
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if available)
- Your contact information for follow-up questions

### 4. Response Timeline

- **Initial Response**: We aim to acknowledge your report within 48 hours
- **Status Updates**: We'll provide updates on the investigation within 7 days
- **Resolution**: We'll work to patch confirmed vulnerabilities promptly and coordinate disclosure

## Security Considerations

### Environment Variables

This application uses sensitive environment variables. **Never commit** the following to version control:

- `.env.local` - Local environment configuration
- `.env.production` - Production environment configuration
- Any files containing API keys, credentials, or secrets

Always use the provided `env.example` as a template and keep actual credentials secure.

### Critical Environment Variables

Ensure these are properly secured in production:

- `SHEET_ID` - Google Sheets API credentials
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Private key for authentication
- `WEBHOOK_SECRET` - Webhook validation secret
- Any email service credentials (Resend API key)

### API Routes Security

The application includes several API routes that handle sensitive data:

1. **Tenant Leads API** (`/api/tenant-leads`)
   - Validates webhook signatures
   - Handles PII (Personally Identifiable Information)
   - Ensure proper rate limiting in production

2. **Properties API** (`/api/properties`)
   - Should use proper caching headers
   - Consider implementing rate limiting

### Deployment Security Best Practices

When deploying this application:

1. **Use HTTPS Only**: Ensure all traffic is encrypted
2. **Environment Isolation**: Keep development, staging, and production environments separate
3. **API Rate Limiting**: Implement rate limiting on all API endpoints
4. **Input Validation**: All user inputs are validated, but review regularly
5. **Dependency Updates**: Regularly update npm packages to patch vulnerabilities
6. **CSP Headers**: Content Security Policy headers are recommended
7. **CORS Configuration**: Review CORS settings in production

### Google Sheets Integration

- Use a service account with minimal required permissions
- Restrict service account access to only necessary sheets
- Regularly rotate service account keys
- Monitor API usage for unusual patterns

### Data Protection

This application handles:
- Tenant contact information
- Property details
- Inquiry data

Ensure compliance with relevant data protection regulations (GDPR, CCPA, etc.) when deploying.

## Known Security Considerations

### Client-Side Data Exposure

- Property listing data is publicly accessible by design
- Contact forms transmit data over HTTPS
- No authentication system is currently implemented

### Third-Party Services

This application integrates with:
- Google Sheets API
- Email service providers (e.g., Resend)
- Image hosting services

Ensure all third-party service credentials are properly secured and services are from trusted providers.

## Security Checklist for Deployment

Before deploying to production:

- [ ] All environment variables are set and secured
- [ ] HTTPS is enforced
- [ ] Rate limiting is configured on API routes
- [ ] Webhook signatures are validated
- [ ] CORS policies are properly configured
- [ ] Dependencies are up to date (`npm audit`)
- [ ] Service account has minimal necessary permissions
- [ ] Error messages don't expose sensitive information
- [ ] Logs don't contain sensitive data
- [ ] Security headers are configured (via `next.config.mjs` or Vercel)

## Automated Security

Run these commands regularly:

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically fixable vulnerabilities
npm audit fix

# Update dependencies
npm update
```

## Additional Resources

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist#security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vercel Security](https://vercel.com/docs/security)

## Disclosure Policy

- We follow responsible disclosure practices
- Security patches will be released as soon as possible
- Credit will be given to researchers who report vulnerabilities responsibly

---

**Last Updated**: November 13, 2025

Thank you for helping keep this project and its users secure!

