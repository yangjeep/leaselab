# Admin Credentials

## Default Admin Account

**⚠️ IMPORTANT: Change these credentials immediately after first login!**

### Production Credentials
- **Email**: `admin@leaselab.io`
- **Password**: `admin123`

### Login URL
- **Production**: https://bc906a81.leaselab-ops.pages.dev/login
- **Custom Domain**: (Configure in Cloudflare Pages → Custom Domains)

## Changing the Password

After logging in, you can change the password by:

1. Creating a new migration file with your new password hash
2. Run the hash-password script:
   ```bash
   npm run hash-password "YourNewSecurePassword123!"
   ```
3. Use the generated hash in a new migration:
   ```sql
   UPDATE users SET password_hash = '<new_hash>' WHERE email = 'admin@leaselab.io';
   ```

## Creating Additional Users

Use the `hash-password` script to generate password hashes:

```bash
npm run hash-password "UserPassword123"
```

Then insert into the database:

```sql
INSERT INTO users (id, email, password_hash, name, role, created_at)
VALUES (
  'user_<random_id>',
  'user@example.com',
  '<generated_hash>',
  'User Name',
  'staff',  -- or 'admin'
  datetime('now')
);
```

Run via wrangler:
```bash
wrangler d1 execute leaselab-db --remote --command="<your SQL>"
```

## Security Notes

1. **Never commit passwords** to version control
2. **Use strong passwords** in production (minimum 12 characters, mixed case, numbers, symbols)
3. **Change default credentials** immediately after deployment
4. **Regularly rotate passwords** for admin accounts
5. **Monitor login attempts** and failed authentications
