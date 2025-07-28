const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestReview() {
  try {
    console.log('🔍 Adding test review for driver...');
    
    const driverId = 'cmdlzkrvh0000k7a8y2y7guhn';
    const parcelId = 'cmdmpwvyw0002k7i0tvt0u7qx'; // The completed parcel we saw
    
    // Check if this parcel exists
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      select: { id: true, driverId: true, status: true },
    });
    
    console.log('📦 Parcel found:', parcel);
    
    if (parcel && parcel.driverId === driverId) {
      // Add a test review
      const testReview = await prisma.review.create({
        data: {
          parcelId: parcelId,
          reviewerId: 'test-customer-id', // You might need to use a real customer ID
          revieweeId: driverId,
          rating: 4,
          comment: 'Test review for driver rating calculation',
          reviewType: 'DRIVER',
          isPublic: true,
        },
      });
      
      console.log('✅ Test review added:', testReview);
    } else {
      console.log('❌ Parcel not found or not assigned to driver');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestReview(); 