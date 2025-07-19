import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Parcel {
  id: string;
  parcelId: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledPickupTime: string;
  scheduledDeliveryTime: string;
  recipientName: string;
  recipientPhone: string;
  specialInstructions: string;
  status: string;
  weight?: string;
  customerName?: string;
}

interface DeliveryInstruction {
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-driver-parcel-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './parcel-details.html',
  styleUrls: ['./parcel-details.css']
})
export class DriverParcelDetails implements OnInit {
  parcel: Parcel | null = null;
  deliveryInstructions: DeliveryInstruction[] = [];
  userRole: string = 'DRIVER';
  showMapView: boolean = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Get parcel ID from route parameters
    this.route.params.subscribe(params => {
      const parcelId = params['id'];
      this.loadParcelDetails(parcelId);
    });
  }

  loadParcelDetails(parcelId: string) {
    // Sample parcel data - in real app, this would come from a service
    this.parcel = {
      id: parcelId,
      parcelId: '#123456',
      pickupAddress: '123 Maple Street, Anytown, USA',
      deliveryAddress: '456 Oak Avenue, Anytown, USA',
      scheduledPickupTime: '2024-03-15 10:00 AM',
      scheduledDeliveryTime: '2024-03-15 12:00 PM',
      recipientName: 'Liam Carter',
      recipientPhone: '+1-555-123-4567',
      specialInstructions: 'Handle with care',
      status: 'Pending',
      weight: '2.5 kg',
      customerName: 'John Smith'
    };

    // Initialize delivery instructions with proper workflow
    this.deliveryInstructions = [
      {
        text: `Inspect parcel at pickup location`,
        completed: false
      },
      {
        text: `Pickup from: ${this.parcel.pickupAddress}`,
        completed: false
      },
      {
        text: `Deliver to: ${this.parcel.deliveryAddress}`,
        completed: false
      },
      {
        text: `Mark delivery as completed`,
        completed: false
      }
    ];
  }

  toggleInstruction(index: number) {
    if (!this.canCompleteInstruction(index)) {
      return;
    }

    this.deliveryInstructions[index].completed = !this.deliveryInstructions[index].completed;
    
    // Update status based on completed instructions
    this.updateParcelStatus();
  }

  canCompleteInstruction(index: number): boolean {
    // Can only complete instructions in order
    for (let i = 0; i < index; i++) {
      if (!this.deliveryInstructions[i].completed) {
        return false;
      }
    }
    return true;
  }

  updateParcelStatus() {
    if (!this.parcel) return;

    const completedCount = this.deliveryInstructions.filter(instruction => instruction.completed).length;
    
    if (completedCount === 0) {
      this.parcel.status = 'Pending';
    } else if (completedCount === 1) {
      // After inspection, status remains pending
      this.parcel.status = 'Pending';
    } else if (completedCount === 2) {
      // After pickup, status changes to In Transit
      this.parcel.status = 'In Transit';
    } else if (completedCount === 3) {
      // After delivery, status remains In Transit until marked complete
      this.parcel.status = 'In Transit';
    } else if (completedCount === 4) {
      // After marking as completed, status changes to Delivered
      this.parcel.status = 'Delivered';
    }
  }

  canMarkAsCompleted(): boolean {
    // Can only mark as completed if all instructions except the last one are done
    const completedCount = this.deliveryInstructions.filter(instruction => instruction.completed).length;
    return completedCount === 3; // All instructions except "Mark delivery as completed"
  }

  toggleView() {
    this.showMapView = !this.showMapView;
  }

  markAsCompleted() {
    if (this.parcel && this.canMarkAsCompleted()) {
      // Complete the last instruction
      this.deliveryInstructions[3].completed = true;
      this.parcel.status = 'Delivered';
      console.log('Parcel marked as completed:', this.parcel.parcelId);
      // TODO: Call service to update parcel status
    }
  }



  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'in transit':
        return 'status-in-transit';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }
} 