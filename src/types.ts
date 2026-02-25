export type Role = 'admin' | 'patient';

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
  age?: number;
  gender?: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  type: 'frame' | 'lens' | 'sunglasses' | 'accessory';
  brand: string;
  model: string;
  price: number;
  stock: number;
  image_url?: string;
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
