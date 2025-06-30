import React, { useState } from 'react';
import { X, Upload, FileText, Trash2, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, PDFDocument } from '../types';

interface CreateOrderProps {
  onClose: () => void;
}

export default function CreateOrder({ onClose }: CreateOrderProps) {
  const { state } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [orderType, setOrderType] = useState<'fertigung' | 'service'>('fertigung');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newOrder: Order = {
      id: `order_${Date.now()}`,
      title,
      description,
      clientId: state.currentUser!.id,
      clientName: state.currentUser!.name,
      deadline: new Date(deadline),
      costCenter,
      priority,
      status: 'pending',
      documents,
      estimatedHours: 0,
      actualHours: 0,
      assignedTo: null,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      subTasks: [],
      orderType
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (!response.ok) {
        alert('Fehler beim Anlegen des Auftrags!');
        return;
      }
      onClose();
    } catch (err) {
      alert('Netzwerkfehler beim Anlegen des Auftrags!');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        alert('Fehler beim Hochladen!');
        return;
      }
      const data = await response.json();
      const document: PDFDocument = {
        id: `doc_${Date.now()}_${Math.random()}`,
        name: data.originalname,
        url: `/uploads/${data.filename}`,
        uploadDate: new Date(),
        file: undefined
      };
      setDocuments(prev => [...prev, document]);
    } catch (err) {
      alert('Netzwerkfehler beim Hochladen!');
    }
  };

  // Hilfsfunktion für FileList (Drag & Drop)
  const handleFileListUpload = async (fileList: FileList) => {
    const file = fileList[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        alert('Fehler beim Hochladen!');
        return;
      }
      const data = await response.json();
      const document: PDFDocument = {
        id: `doc_${Date.now()}_${Math.random()}`,
        name: data.originalname,
        url: `/uploads/${data.filename}`,
        uploadDate: new Date(),
        file: undefined
      };
      setDocuments(prev => [...prev, document]);
    } catch (err) {
      alert('Netzwerkfehler beim Hochladen!');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileListUpload(e.dataTransfer.files);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => {
      const docToRemove = prev.find(doc => doc.id === id);
      if (docToRemove?.url) {
        URL.revokeObjectURL(docToRemove.url);
      }
      return prev.filter(doc => doc.id !== id);
    });
  };

  const isApproved = state.currentUser?.isApproved; // Annahme: Der Benutzerstatus ist im Kontext verfügbar

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Neuen Auftrag erstellen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {!isApproved && (
            <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-2 text-sm">
              Ihr Account wurde noch nicht von der Administration bestätigt. Sie können noch keine Aufträge einreichen.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Auftragstitel *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                Deadline *
              </label>
              <input
                type="date"
                id="deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="costCenter" className="block text-sm font-medium text-gray-700 mb-2">
                Kostenstelle *
              </label>
              <input
                type="text"
                id="costCenter"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. KOSTEN-001"
                required
              />
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priorität
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            </div>

            <div>
              <label htmlFor="orderType" className="block text-sm font-medium text-gray-700 mb-2">
                Auftragstyp *
              </label>
              <select
                id="orderType"
                value={orderType}
                onChange={e => setOrderType(e.target.value as 'fertigung' | 'service')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="fertigung">Fertigungsauftrag</option>
                <option value="service">Serviceauftrag</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF Dokumente
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">PDF-Dateien hier ablegen oder</p>
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-800">Dateien auswählen</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e)}
                  className="hidden"
                />
              </label>
            </div>

            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-red-600 mr-3" />
                      <span className="text-sm text-gray-900">{doc.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ minWidth: 120 }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!isApproved}
              className={`px-5 py-2 rounded-lg text-white font-semibold text-base transition-colors ${!isApproved ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              style={{ minWidth: 180 }}
            >
              Auftrag einreichen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}