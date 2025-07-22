# Admin Service Fix Guide

## Critical Issues to Fix

### 1. Import Prisma Types
```typescript
import { Prisma } from '@prisma/client';
```

### 2. Fix Type Safety Issues
Replace all `any` types with proper Prisma types:

```typescript
// Before:
const where: any = {};

// After:
const where: Prisma.UserWhereInput = {};
```

### 3. Fix Unused Variables
Remove unused `reason` variables or use them:

```typescript
// In manageUser method:
const { action } = managementDto; // Remove reason

// In manageDriver method:
const { action } = managementDto; // Remove reason

// In manageParcel method:
const { action, newDriverId } = managementDto; // Remove reason
```

### 4. Fix Case Block Issue
Add braces around case blocks with variable declarations:

```typescript
case 'reassign': {
  if (!newDriverId) {
    throw new BadRequestException('New driver ID is required for reassignment');
  }
  // Verify new driver exists and is available
  const newDriver = await this.prisma.user.findFirst({
    where: {
      id: newDriverId,
      role: 'DRIVER',
      isAvailable: true,
      isActive: true,
      deletedAt: null,
    },
  });
  if (!newDriver) {
    throw new BadRequestException('New driver not found or not available');
  }
  updateData = {
    driverId: newDriverId,
    assignedAt: new Date(),
    status: 'assigned',
  };
  break;
}
```

### 5. Fix Error Handling
Replace unsafe error message access:

```typescript
// Before:
message: error.message,

// After:
message: error instanceof Error ? error.message : 'Unknown error',
```

### 6. Fix Map Methods
Add proper typing to map methods:

```typescript
// Before:
private mapToUserResponse(user: any): UserResponseDto {

// After:
private mapToUserResponse(user: Prisma.UserGetPayload<{
  include: {
    sentParcels: true;
    receivedParcels: true;
    reviewsGiven: true;
    reviewsReceived: true;
  };
}>): UserResponseDto {
```

## Implementation Steps

1. **Add Prisma import** at the top of the file
2. **Replace all `any` types** with proper Prisma types
3. **Remove unused variables** or use them appropriately
4. **Add braces** to case blocks with variable declarations
5. **Fix error handling** with proper type checking
6. **Add proper typing** to map methods

## Benefits

- ✅ Strong TypeScript typing (no `any`)
- ✅ Better error handling
- ✅ Improved code maintainability
- ✅ Better IDE support and autocomplete
- ✅ Compile-time error detection 