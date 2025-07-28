# SendIT Delivery Flow Implementation

## Overview

This document describes the complete parcel delivery flow implementation in SendIT, including status transitions, user roles, and review functionality.

## Delivery Flow Status Transitions

### Complete Status Flow
1. **pending** → **assigned** → **picked_up** → **in_transit** → **delivered_to_recipient** → **delivered** → **completed**

### Detailed Status Descriptions

| Status | Description | Who Can Update | Next Possible Status |
|--------|-------------|----------------|---------------------|
| `pending` | Parcel created, waiting for driver assignment | Admin | `assigned`, `cancelled` |
| `assigned` | Driver assigned to parcel | Driver | `picked_up`, `cancelled` |
| `picked_up` | Driver has picked up the parcel | Driver | `in_transit`, `cancelled` |
| `in_transit` | Parcel is being transported | Driver | `delivered_to_recipient`, `cancelled` |
| `delivered_to_recipient` | Driver delivered to recipient, waiting for confirmation | Customer | `delivered`, `cancelled` |
| `delivered` | Customer confirmed delivery | Customer | `completed`, `cancelled` |
| `completed` | Customer marked as complete, can leave review | Customer | None (final state) |
| `cancelled` | Delivery cancelled | Admin/Customer | None (final state) |

## User Role Responsibilities

### Driver Actions
1. **Pick up parcel**: Update status to `picked_up`
2. **Start transit**: Update status to `in_transit`
3. **Deliver to recipient**: Update status to `delivered_to_recipient`

### Customer Actions
1. **Confirm delivery**: Update status to `delivered`
2. **Mark as complete**: Update status to `completed`
3. **Leave review**: Available after status is `completed`

### Admin Actions
1. **Assign driver**: Update status to `assigned`
2. **Cancel parcel**: Update status to `cancelled`

## API Endpoints

### Driver Status Updates
```
PATCH /parcels/:id/status
Body: {
  "status": "picked_up" | "in_transit" | "delivered_to_recipient",
  "currentLocation": "string",
  "latitude": number,
  "longitude": number,
  "notes": "string"
}
```

### Customer Delivery Confirmation
```
POST /parcels/:id/confirm-delivery
Body: {
  "customerSignature": "string",
  "customerNotes": "string"
}
```

### Customer Mark as Complete
```
POST /parcels/:id/mark-completed
Body: {
  "customerNotes": "string"
}
```

### Review Creation
```
POST /reviews
Body: {
  "parcelId": "string",
  "rating": number (1-5),
  "comment": "string",
  "reviewType": "SERVICE" | "DRIVER" | "DELIVERY_SPEED" | "COMMUNICATION" | "OVERALL"
}
```

## Frontend Implementation

### Status Mapping
The frontend maps backend statuses to user-friendly display names:

- `pending` → "Pending"
- `assigned` → "Pending" 
- `picked_up` → "In Transit"
- `in_transit` → "In Transit"
- `delivered_to_recipient` → "Out for Delivery"
- `delivered` → "Delivered"
- `completed` → "Completed"
- `cancelled` → "Cancelled"

### Progress Calculation
Delivery progress is calculated based on status:

- `pending`: 25%
- `in_transit`: 60%
- `out_for_delivery`: 80%
- `delivered`: 90%
- `completed`: 100%

### Review Flow
1. Customer marks parcel as `completed`
2. System shows review prompt
3. Customer can leave review for delivery service
4. Review is stored and associated with parcel

## Database Schema

### Parcel Model
```prisma
model Parcel {
  id                   String        @id @default(cuid())
  trackingNumber       String        @unique
  status               ParcelStatus  @default(pending)
  // ... other fields
  
  // Completion tracking
  completedAt           DateTime?
  completedBy           String?
  
  // Relations
  reviews               Review[]
  statusHistory         ParcelStatusHistory[]
}
```

### Review Model
```prisma
model Review {
  id          String     @id @default(cuid())
  parcelId    String
  reviewerId  String     // Customer who left the review
  revieweeId  String?    // Driver being reviewed (optional)
  rating      Int        // 1-5 stars
  comment     String?
  reviewType  ReviewType
  isPublic    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  
  parcel    Parcel @relation(fields: [parcelId], references: [id])
  reviewer  User   @relation("ReviewsGiven", fields: [reviewerId], references: [id])
  reviewee  User?  @relation("ReviewsReceived", fields: [revieweeId], references: [id])
}
```

## Email Notifications

### Parcel Completion Email
When a parcel is marked as `completed`, the system sends:
1. **Email to customer** with completion confirmation
2. **Notification** prompting to leave a review
3. **Email template**: `parcel-completed.ejs`

## Validation Rules

### Status Transition Validation
```typescript
const validTransitions: Record<string, string[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['delivered_to_recipient', 'cancelled'],
  delivered_to_recipient: ['delivered', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [], // Final state
  cancelled: [], // Final state
};
```

### Review Validation
- Rating must be between 1-5
- Comment is optional but recommended
- Only customers can leave reviews
- Reviews can only be created for `completed` parcels

## Error Handling

### Common Error Scenarios
1. **Invalid status transition**: Returns 400 Bad Request
2. **Unauthorized status update**: Returns 403 Forbidden
3. **Parcel not found**: Returns 404 Not Found
4. **Review already exists**: Returns 409 Conflict

### Frontend Error Handling
- Toast notifications for success/error states
- Form validation for required fields
- Loading states during API calls
- Graceful fallbacks for network errors

## Testing

### Backend Tests
- Status transition validation
- Authorization checks
- Email notification sending
- Review creation and validation

### Frontend Tests
- Status display mapping
- Progress calculation
- Review form validation
- API integration

## Security Considerations

1. **Authorization**: Only authorized users can update parcel status
2. **Validation**: All status transitions are validated
3. **Audit Trail**: All status changes are logged in `ParcelStatusHistory`
4. **Data Integrity**: Foreign key constraints ensure data consistency

## Performance Considerations

1. **Database Indexes**: Status and user ID fields are indexed
2. **Caching**: Parcel details can be cached for frequent access
3. **Pagination**: Large result sets are paginated
4. **Async Operations**: Email sending is non-blocking

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live status updates
2. **Push Notifications**: Mobile push notifications for status changes
3. **Analytics**: Delivery performance metrics and analytics
4. **Multi-language Support**: Internationalization for status messages
5. **Advanced Tracking**: GPS tracking and route optimization 