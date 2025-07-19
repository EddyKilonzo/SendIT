import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Driver' | 'User';
  status: 'Active' | 'Inactive';
  registered: string;
  avatar: string;
}

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.html',
  styleUrl: './manage-users.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class ManageUsers {
  constructor(private router: Router) {}
  
  // User role for role-based access control
  userRole: string = 'ADMIN'; // Default role for admin component, will be set from auth service later
  
  searchTerm = '';
  selectedStatus = '';
  selectedRole = '';
  users: User[] = [
    {
      id: '1',
      name: 'Sophia Clark',
      email: 'sophia.clark@email.com',
      phone: '123-456-7890',
      role: 'User',
      status: 'Active',
      registered: '2023-09-15',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '2',
      name: 'Ethan Bennett',
      email: 'ethan.bennett@email.com',
      phone: '123-456-7891',
      role: 'Driver',
      status: 'Active',
      registered: '2023-09-12',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '3',
      name: 'Olivia Hayes',
      email: 'olivia.hayes@email.com',
      phone: '123-456-7892',
      role: 'User',
      status: 'Active',
      registered: '2023-09-13',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '4',
      name: 'Liam Foster',
      email: 'liam.foster@email.com',
      phone: '123-456-7893',
      role: 'Driver',
      status: 'Active',
      registered: '2023-04-05',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '5',
      name: 'Ava Mitchell',
      email: 'ava.mitchell@email.com',
      phone: '123-456-7894',
      role: 'User',
      status: 'Active',
      registered: '2023-09-11',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '6',
      name: 'Noah Carter',
      email: 'noah.carter@email.com',
      phone: '123-456-7895',
      role: 'Driver',
      status: 'Inactive',
      registered: '2023-06-18',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '7',
      name: 'Isabella Reed',
      email: 'isabella.reed@email.com',
      phone: '123-456-7896',
      role: 'User',
      status: 'Inactive',
      registered: '2023-07-22',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '8',
      name: 'Jackson Cole',
      email: 'jackson.cole@email.com',
      phone: '123-456-7897',
      role: 'Driver',
      status: 'Active',
      registered: '2023-08-30',
      avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '9',
      name: 'Mia Hughes',
      email: 'mia.hughes@email.com',
      phone: '123-456-7898',
      role: 'User',
      status: 'Inactive',
      registered: '2023-09-10',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '10',
      name: 'Aiden Parker',
      email: 'aiden.parker@email.com',
      phone: '123-456-7899',
      role: 'Driver',
      status: 'Active',
      registered: '2023-10-11',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=entropy'
    }
  ];

  // Pagination
  currentPage = 1;
  usersPerPage = 8;

  get filteredUsers(): User[] {
    let filtered = this.users;
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phone.includes(search)
      );
    }
    if (this.selectedStatus) {
      filtered = filtered.filter(user => user.status === this.selectedStatus);
    }
    if (this.selectedRole) {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }
    return filtered;
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.usersPerPage;
    return this.filteredUsers.slice(start, start + this.usersPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.usersPerPage);
  }

  setPage(page: number) {
    this.currentPage = page;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedRole = '';
    this.currentPage = 1;
  }

  viewUserDetails(userId: string) {
    this.router.navigate(['/admin-user-details', userId]);
  }
}
