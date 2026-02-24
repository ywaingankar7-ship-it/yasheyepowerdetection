export type Role = 'admin' | 'staff' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  type: 'frame' | 'lens';
  brand: string;
  model: string;
  price: number;
  stock: number;
  details: string; // JSON string
}

export interface Appointment {
  id: number;
  customer_id: number;
  customer_name?: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'completed';
  notes: string;
}

export interface EyeTest {
  id: number;
  customer_id: number;
  date: string;
  results: string; // JSON string
  image_url: string;
}

export interface Sale {
  id: number;
  customer_id: number;
  total: number;
  items: string; // JSON string
  date: string;
}
