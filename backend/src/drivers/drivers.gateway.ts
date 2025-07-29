import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface DriverLocation {
  driverId: string;
  driverName: string;
  currentLat: number;
  currentLng: number;
  lastActiveAt: Date;
  vehicleType?: string;
  vehicleNumber?: string;
  assignedParcelId?: string;
}

interface LocationUpdate {
  driverId: string;
  currentLat: number;
  currentLng: number;
  address?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/drivers',
})
export class DriversGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DriversGateway.name);
  private connectedClients = new Map<string, { userId: string; role: string }>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or headers
      const token = client.handshake.auth.token || 
                   client.handshake.headers.authorization?.replace('Bearer ', '') ||
                   client.handshake.query.token as string;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication token required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const role = payload.role;

      // Store client information
      this.connectedClients.set(client.id, { userId, role });
      
      this.logger.log(`Client connected: ${client.id} (User: ${userId}, Role: ${role})`);
      
      // Join appropriate rooms based on role
      if (role === 'ADMIN') {
        client.join('admin-room');
        this.logger.log(`Admin ${userId} joined admin-room`);
      } else if (role === 'DRIVER') {
        client.join(`driver-${userId}`);
        this.logger.log(`Driver ${userId} joined driver-${userId}`);
      } else if (role === 'CUSTOMER') {
        client.join('customer-room');
        this.logger.log(`Customer ${userId} joined customer-room`);
      }
      
      // Send connection confirmation
      client.emit('connected', { 
        message: 'Successfully connected to WebSocket',
        userId,
        role 
      });
      
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}${clientInfo ? ` (User: ${clientInfo.userId})` : ''}`);
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(
    @MessageBody() data: LocationUpdate,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo || clientInfo.role !== 'DRIVER') {
        this.logger.warn('Unauthorized location update attempt');
        client.emit('error', { message: 'Unauthorized: Only drivers can update location' });
        return;
      }

      // Validate that the driver is updating their own location
      if (clientInfo.userId !== data.driverId) {
        this.logger.warn(`Driver ${clientInfo.userId} attempted to update location for driver ${data.driverId}`);
        client.emit('error', { message: 'Unauthorized: Can only update your own location' });
        return;
      }

      this.logger.log(`Location update from driver ${data.driverId}: ${data.currentLat}, ${data.currentLng}`);

      // Broadcast location update to all connected clients
      this.server.emit('driverLocationUpdate', {
        driverId: data.driverId,
        currentLat: data.currentLat,
        currentLng: data.currentLng,
        address: data.address,
        timestamp: new Date(),
      });

      // Also emit to specific rooms for targeted updates
      this.server.to('admin-room').emit('driverLocationUpdate', {
        driverId: data.driverId,
        currentLat: data.currentLat,
        currentLng: data.currentLng,
        address: data.address,
        timestamp: new Date(),
      });

      // Confirm to the sender
      client.emit('locationUpdated', { 
        message: 'Location updated successfully',
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Error handling location update:', error);
      client.emit('error', { message: 'Failed to update location' });
    }
  }

  @SubscribeMessage('subscribeToDriver')
  async handleSubscribeToDriver(
    @MessageBody() data: { driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Allow admins and customers to subscribe to specific drivers
      if (clientInfo.role === 'ADMIN' || clientInfo.role === 'CUSTOMER') {
        client.join(`driver-${data.driverId}`);
        this.logger.log(`Client ${client.id} subscribed to driver ${data.driverId}`);
        client.emit('subscribed', { 
          message: `Subscribed to driver ${data.driverId}`,
          driverId: data.driverId
        });
      } else {
        client.emit('error', { message: 'Unauthorized to subscribe to drivers' });
      }
    } catch (error) {
      this.logger.error('Error subscribing to driver:', error);
      client.emit('error', { message: 'Failed to subscribe to driver' });
    }
  }

  @SubscribeMessage('unsubscribeFromDriver')
  async handleUnsubscribeFromDriver(
    @MessageBody() data: { driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Allow admins and customers to unsubscribe from specific drivers
      if (clientInfo.role === 'ADMIN' || clientInfo.role === 'CUSTOMER') {
        client.leave(`driver-${data.driverId}`);
        this.logger.log(`Client ${client.id} unsubscribed from driver ${data.driverId}`);
        client.emit('unsubscribed', { 
          message: `Unsubscribed from driver ${data.driverId}`,
          driverId: data.driverId
        });
      } else {
        client.emit('error', { message: 'Unauthorized to unsubscribe from drivers' });
      }
    } catch (error) {
      this.logger.error('Error unsubscribing from driver:', error);
      client.emit('error', { message: 'Failed to unsubscribe from driver' });
    }
  }

  // Method to broadcast driver location updates (called from service)
  broadcastDriverLocation(locationData: DriverLocation) {
    this.server.emit('driverLocationUpdate', {
      ...locationData,
      timestamp: new Date(),
    });
    
    // Also emit to admin room
    this.server.to('admin-room').emit('driverLocationUpdate', {
      ...locationData,
      timestamp: new Date(),
    });
  }

  // Method to broadcast driver assignment updates
  broadcastDriverAssignment(assignmentData: {
    driverId: string;
    parcelId: string;
    driverName: string;
    vehicleType?: string;
  }) {
    this.server.emit('driverAssignmentUpdate', {
      ...assignmentData,
      timestamp: new Date(),
    });
  }

  // Method to broadcast parcel status updates
  broadcastParcelStatusUpdate(statusData: {
    parcelId: string;
    driverId: string;
    status: string;
    location?: string;
    timestamp: Date;
  }) {
    this.server.emit('parcelStatusUpdate', statusData);
  }
}