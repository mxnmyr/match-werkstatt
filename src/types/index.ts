export interface User {
  id: string;
  username: string;
  role: 'client' | 'workshop' | 'admin';
  name: string;
  password?: string;
}

export interface PDFDocument {
  id: string;
  name: string;
  url: string;
  uploadDate: Date;
  file?: File;
}

export interface Order {
  id: string;
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  deadline: Date;
  costCenter: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'in_progress' | 'revision' | 'rework' | 'completed' | 'archived' | 'waiting_confirmation';
  documents: PDFDocument[];
  estimatedHours: number;
  actualHours: number;
  assignedTo: string | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  subTasks: SubTask[];
  canEdit?: boolean; // For revision state
  confirmationNote?: string; // Endabnahme-Kommentar vom Kunden
  confirmationDate?: Date;   // Wann bestätigt
  revisionRequest?: {
    description: string;
    newDeadline?: Date;
    documents?: PDFDocument[];
    requestedAt: Date;
  };
  orderType: 'fertigung' | 'service'; // Auftragstyp für Nummerngenerierung
}

export interface SubTask {
  id: string;
  orderId: string;
  title: string;
  description: string;
  estimatedHours: number;
  actualHours: number;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string | null;
  notes: string;
  documents: PDFDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkshopAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'workshop' | 'admin';
  isActive: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  company?: string;
  email?: string;
  isActive: boolean;
  isApproved: boolean; // Muss von Admin bestätigt werden
  createdAt: Date;
}