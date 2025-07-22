# SendIT Backend Services

This document outlines the comprehensive backend services created for the SendIT delivery platform with strong TypeScript typing, robust error handling, and clean code architecture.

## Services Overview

### 1. Admin Service (`admin.service.ts`)

**Purpose**: Comprehensive admin management system for platform oversight.

**Key Functionalities**:
- **Dashboard & Statistics**
  - Get dashboard statistics (users, drivers, parcels, etc.)
  - Get system performance metrics
  - Revenue tracking and analytics

- **User Management**
  - Find all users with filtering and pagination
  - View user details with related data
  - Suspend/deactivate users
  - Manage user accounts

- **Driver Management**
  - Find all drivers with advanced filtering
  - Manage driver status (activate/deactivate/suspend)
  - View driver performance metrics
  - Monitor driver availability

- **Driver Application Management**
  - Review pending driver applications
  - Approve/reject driver applications
  - Track application status

- **Parcel Management**
  - View all parcels with filtering
  - Manage parcel status and priority
  - Cancel or reassign parcels
  - Bulk operations

- **Parcel Assignment**
  - Assign parcels to available drivers
  - Bulk assignment operations
  - Assignment tracking

### 2. Parcels Service (`parcels.service.ts`)

**Purpose**: Core parcel management and tracking system.

**Key Functionalities**:
- **Parcel Creation & Management**
  - Create new parcels with tracking numbers
  - Update parcel details
  - Cancel parcels (with restrictions)

- **Parcel Tracking**
  - Find parcels by ID or tracking number
  - Get parcel status history
  - Real-time location tracking

- **Role-Based Access**
  - Customers: View their sent/received parcels
  - Drivers: View assigned parcels and available parcels
  - Admins: Full access to all parcels

- **Status Management**
  - Update parcel status (for drivers)
  - Status transition validation
  - Automatic timestamp updates

- **Delivery Confirmation**
  - Customer delivery confirmation
  - Digital signature support
  - Delivery proof creation

### 3. Reviews Service (`reviews.service.ts`)

**Purpose**: Customer feedback and rating system.

**Key Functionalities**:
- **Review Management**
  - Create reviews for delivered parcels
  - Update/delete reviews (by reviewer)
  - Review validation and permissions

- **Rating System**
  - 1-5 star rating system
  - Multiple review types (service, driver, delivery speed, etc.)
  - Public/private review options

- **Review Analytics**
  - Get review summaries for users/drivers
  - Rating distribution analysis
  - Recent reviews tracking

- **Driver Performance**
  - Automatic driver rating updates
  - Performance metrics calculation
  - Review-based analytics

### 4. Drivers Service (`drivers.service.ts`)

**Purpose**: Driver-specific operations and management.

**Key Functionalities**:
- **Driver Operations**
  - Update location and availability
  - View assigned parcels
  - Update parcel status

- **Application System**
  - Apply for driver position
  - Application status tracking
  - Performance metrics

- **Parcel Management**
  - View assigned parcels
  - Update delivery status
  - Location tracking

## Data Models & Types

### Strong TypeScript Typing

All services use comprehensive TypeScript interfaces:

```typescript
// Example DTOs
interface CreateParcelDto {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
  priority?: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT';
}

interface ParcelStatusUpdateDto {
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered_to_recipient' | 'delivered' | 'cancelled';
  currentLocation?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}
```

### Database Schema

The services work with a comprehensive Prisma schema including:

- **Users**: Customers, Drivers, Admins with role-based fields
- **Parcels**: Complete delivery tracking with status history
- **Reviews**: Customer feedback system
- **Notifications**: Real-time updates
- **Delivery Proofs**: Digital confirmation system

## Error Handling

### Comprehensive Error Management

```typescript
// Example error handling
if (!parcel) {
  throw new NotFoundException('Parcel not found');
}

if (!this.isValidStatusTransition(currentStatus, newStatus)) {
  throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
}

if (parcel.senderId !== reviewerId && parcel.recipientId !== reviewerId) {
  throw new ForbiddenException('You can only review parcels you sent or received');
}
```

### Error Types Used
- `NotFoundException`: Resource not found
- `BadRequestException`: Invalid input or business logic violations
- `ForbiddenException`: Permission denied
- `UnauthorizedException`: Authentication required

## API Endpoints

### Admin Endpoints
```
GET    /admin/dashboard/stats
GET    /admin/dashboard/system-stats
GET    /admin/users
GET    /admin/users/:id
PATCH  /admin/users/:id/manage
GET    /admin/drivers
PATCH  /admin/drivers/:id/manage
GET    /admin/driver-applications
PATCH  /admin/driver-applications/:id/manage
GET    /admin/parcels
GET    /admin/parcels/:id
PATCH  /admin/parcels/:id/manage
POST   /admin/parcels/assign
POST   /admin/parcels/bulk-assign
```

### Parcel Endpoints
```
POST   /parcels
GET    /parcels
GET    /parcels/tracking/:trackingNumber
GET    /parcels/my-parcels
GET    /parcels/assigned
GET    /parcels/status-history/:id
GET    /parcels/:id
PATCH  /parcels/:id
PATCH  /parcels/:id/status
PATCH  /parcels/:id/confirm-delivery
DELETE /parcels/:id
```

### Review Endpoints
```
POST   /reviews
GET    /reviews
GET    /reviews/summary/:userId
GET    /reviews/parcel/:parcelId
GET    /reviews/my-reviews
GET    /reviews/received
GET    /reviews/:id
PATCH  /reviews/:id
DELETE /reviews/:id
```

## Security & Permissions

### Role-Based Access Control
- **Customers**: Can create parcels, view their parcels, leave reviews
- **Drivers**: Can update parcel status, view assigned parcels, update location
- **Admins**: Full access to all operations and management functions

### Data Validation
- Input validation using DTOs
- Business logic validation
- Status transition validation
- Permission checks on all operations

## Performance Features

### Database Optimization
- Efficient queries with proper indexing
- Pagination for large datasets
- Selective field inclusion
- Relationship optimization

### Caching Strategy
- Ready for Redis integration
- Query result caching
- User session management

## Future Enhancements

### Planned Features
1. **Real-time Notifications**: WebSocket integration for live updates
2. **Payment Integration**: Stripe/PayPal integration
3. **File Upload**: Cloudinary integration for signatures and proof
4. **Analytics Dashboard**: Advanced reporting and analytics
5. **Mobile API**: Optimized endpoints for mobile apps

### Scalability Considerations
- Microservices architecture ready
- Database sharding support
- Load balancing preparation
- API rate limiting

## Testing Strategy

### Test Coverage
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for critical workflows
- Performance testing

### Mock Data
- Comprehensive test data sets
- Edge case scenarios
- Error condition testing

## Deployment

### Environment Configuration
- Environment-specific configurations
- Database connection management
- API key management
- Logging and monitoring

### Docker Support
- Containerized application
- Database migrations
- Health checks
- Production-ready configuration

This backend implementation provides a solid foundation for the SendIT delivery platform with enterprise-grade features, strong typing, and comprehensive error handling. 