# REST Client Testing Files

This directory contains `.http` files for testing all the API endpoints in the SendIT application. These files can be used with VS Code's REST Client extension or similar tools.

## Setup Instructions

1. **Install REST Client Extension**: Install the "REST Client" extension in VS Code
2. **Start the Backend Server**: Make sure your NestJS backend is running on `http://localhost:3000`
3. **Get Authentication Tokens**: First run the auth endpoints to get valid JWT tokens
4. **Update Token Variables**: Replace the placeholder tokens in each `.http` file with actual tokens

## File Structure

- `auth.http` - Authentication endpoints (register, login, logout, refresh)
- `users.http` - User management endpoints
- `parcels.http` - Parcel management endpoints
- `admin.http` - Admin management endpoints
- `drivers.http` - Driver-specific endpoints
- `reviews.http` - Review management endpoints

## Authentication Flow

1. **Register Users**: Use the register endpoints in `auth.http` to create test users
2. **Login**: Use the login endpoints to get JWT tokens
3. **Copy Tokens**: Copy the access token from the login response
4. **Update Variables**: Replace the placeholder tokens in the `.http` files

## Testing Workflow

### 1. Authentication Testing
```http
# First, register users
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123",
  "name": "John Customer",
  "role": "CUSTOMER"
}

# Then login to get token
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123"
}
```

### 2. Update Token Variables
After getting the token from login response, update the variables in the `.http` files:

```http
@customerToken = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
@driverToken = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
@adminToken = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Test Protected Endpoints
Now you can test all the protected endpoints with proper authentication.

## Role-Based Access Control

The API implements role-based access control with the following roles:

- **CUSTOMER**: Can manage their own profile, create parcels, view their parcels
- **DRIVER**: Can update location, manage availability, update parcel status
- **ADMIN**: Can manage all users, parcels, drivers, and system operations

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Testing Tips

1. **Start with Auth**: Always test authentication endpoints first
2. **Use Different Users**: Test with different user roles to verify permissions
3. **Check Response Headers**: Look for pagination headers in list responses
4. **Validate Error Responses**: Test with invalid data to ensure proper error handling
5. **Test Edge Cases**: Try updating resources you don't own, accessing admin endpoints as regular users, etc.

## Environment Variables

Make sure your backend has the following environment variables set:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/sendit_db
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
```

## Troubleshooting

1. **CORS Issues**: Make sure your backend has CORS properly configured
2. **Database Connection**: Ensure your PostgreSQL database is running and accessible
3. **JWT Secret**: Verify your JWT secret is properly set in environment variables
4. **Port Conflicts**: Make sure port 3000 is available for the backend server

## Example Test Sequence

1. Register a customer, driver, and admin
2. Login with each user to get tokens
3. Update the token variables in all `.http` files
4. Test customer endpoints (create parcels, view profile)
5. Test driver endpoints (update location, manage parcels)
6. Test admin endpoints (manage users, view dashboard)
7. Test review system
8. Test error cases and edge cases 