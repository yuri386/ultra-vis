# UltraWise v2.0 - Quick Start Guide

## ✅ System Status
**Backend**: Running and tested ✅
**Database**: Initialized with production schema ✅
**Security**: All protections implemented ✅

---

## Starting the Server

```bash
# From project root
npm start

# Server will start on http://localhost:3000
```

**Initial Output**:
```
🚀 UltraWise v2.0 ЗАПУЩЕН
📡 Сервер: http://localhost:3000
🌐 API: http://localhost:3000/api

Default Admin:
  Email: admin@ultrawise.local
  Password: Admin@2026!Secure
```

---

## Testing the API

### 1. Quick Registration Test
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"John",
    "lastName":"Doe",
    "email":"john@test.com",
    "nickname":"johndoe123",
    "password":"Password123",
    "userType":"schoolkid"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Регистрация успешна",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "firstName": "John",
    "email": "john@test.com",
    "nickname": "johndoe123",
    "coins": 0,
    "isAdmin": 0
  }
}
```

### 2. Login Test (Email)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"Password123"}'
```

### 3. Login Test (Nickname)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"johndoe123","password":"Password123"}'
```

### 4. Admin Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ultrawise.local","password":"Admin@2026!Secure"}'
```

---

## Frontend Access

### Main Page
```
http://localhost:3000/
http://localhost:3000/index.html
```

### Features
- Authentication modal automatically loads
- Registration and login forms functional
- Token automatically stored in localStorage
- Multi-page synchronization working

---

## Database Info

### Location
```
backend/database.db
```

### Tables
1. `users` - User accounts with security fields
2. `sessions` - Active sessions/tokens
3. `auditLog` - All authentication events
4. `passwordResets` - Password recovery tokens
5. `lectures` - Course management
6. `colleges` - Institution management

### Default Admin Account
```
Email: admin@ultrawise.local
Password: Admin@2026!Secure
⚠️ Change this password immediately after first login!
```

---

## Common Issues & Solutions

### Issue: "TypeError: argument handler must be a function"
**Solution**: Ensure all import statements reference existing files. Route files must export a router.

### Issue: Server won't start
**Solution**: 
1. Check if port 3000 is available
2. Check database permissions
3. Look at error message in console

### Issue: Registration fails but no error message
**Solution**: Check browser console and server logs for details

### Issue: Rate limiting not working
**Solution**: Ensure `express-rate-limit` is installed: `npm install express-rate-limit`

---

## Security Reminders

### ✅ What's Implemented
- Password hashing (bcryptjs)
- JWT tokens (30-day expiry)
- Bruteforce protection (5 attempts)
- Rate limiting (5 req/15min)
- Audit logging
- Input validation
- SQL injection prevention

### ⚠️ What to Do Before Production
1. Change default admin password
2. Set JWT_SECRET environment variable
3. Enable HTTPS
4. Configure proper CORS origins
5. Set up database backups
6. Review rate limiting settings

### 🔒 Security Best Practices
- Never commit secrets to repository
- Always use HTTPS in production
- Monitor audit logs regularly
- Keep dependencies updated
- Use strong passwords
- Implement email verification (future)

---

## Performance Tips

### Database
- Queries are optimized with proper indexes
- Audit logging may impact performance - consider cleanup scripts

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Adjust in middleware/auth.js as needed

### Scaling
- Current setup: Development/small deployments
- For production: Migrate to PostgreSQL
- For high-scale: Add Redis for session store

---

## Useful Commands

### View Logs
```bash
# Server console logs
npm start

# Database errors
tail -f backend/database.log  # If logging enabled
```

### Reset Database
```bash
# Delete current database
rm backend/database.db

# Restart server - will auto-initialize
npm start
```

### Test Bruteforce Protection
```bash
# Run 6 failed login attempts
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"WrongPassword"}'
  echo "Attempt $i"
  sleep 1
done
```

### Check Server Status
```bash
curl http://localhost:3000/api
```

---

## Next Steps

1. **Test Frontend**
   - Open http://localhost:3000/
   - Try registration
   - Try login
   - Verify token persistence

2. **Test Multi-Page Navigation**
   - Register user
   - Navigate between pages
   - Verify auth state persists
   - Check localStorage for token

3. **Production Preparation**
   - Change default admin password
   - Set JWT_SECRET env var
   - Migrate to PostgreSQL
   - Set up HTTPS
   - Configure monitoring

4. **Integration Testing**
   - Test all API endpoints
   - Verify error messages
   - Check rate limiting
   - Audit logging verification

---

## Support

### Files with Details
- `PRODUCTION_READY.md` - Production deployment guide
- `BACKEND_REDESIGN_SUMMARY.md` - Technical architecture
- `API_TEST_RESULTS.md` - Test results and validation
- `backend/routes/auth.js` - Endpoint documentation
- `frontend/js/auth-manager.js` - Frontend implementation

### Key Contact Points
- Database: `backend/database.js`
- Routes: `backend/routes/auth.js`
- Middleware: `backend/middleware/auth.js`
- Server: `backend/server.js`
- Frontend: `frontend/js/auth-manager.js`

---

## Version Info
- **UltraWise**: v2.0
- **Backend**: Production-grade
- **Database**: SQLite3 (dev), PostgreSQL (recommended for production)
- **Status**: ✅ Ready for testing and deployment

---

**Last Updated**: February 9, 2026
**Server Status**: ✅ Running on http://localhost:3000
