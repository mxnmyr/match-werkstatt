import React, { useState } from 'react';
import { 
  X, 
  Check, 
  XCircle, 
  RotateCcw, 
  Clock, 
  FileText, 
  Plus, 
  Trash2,
  Archive,
  Download,
  Upload
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, SubTask, PDFDocument } from '../types';

interface WorkshopOrderDetailsProps {
  order: Order;
  onClose: () => void;
}

export default function WorkshopOrderDetails({ order, onClose }: WorkshopOrderDetailsProps) {
  const { state, dispatch } = useApp();
  // Immer die aktuellste Order aus dem Context holen
  const currentOrder = state.orders.find(o => o.id === order.id) || order;

  const [estimatedHours, setEstimatedHours] = useState(currentOrder.estimatedHours.toString());
  const [actualHours, setActualHours] = useState(currentOrder.actualHours.toString());
  const [notes, setNotes] = useState(currentOrder.notes);
  const [showAddSubTask, setShowAddSubTask] = useState(false);
  const [subTaskTitle, setSubTaskTitle] = useState('');
  const [subTaskDescription, setSubTaskDescription] = useState('');
  const [subTaskHours, setSubTaskHours] = useState('');
  const [subTaskDocuments, setSubTaskDocuments] = useState<PDFDocument[]>([]);
  const [assignedTo, setAssignedTo] = useState(currentOrder.assignedTo || '');
  const [subTaskAssignedTo, setSubTaskAssignedTo] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Hilfsfunktion für API-Update
  const updateOrder = async (updatedOrder: Order, notificationMsg?: string) => {
    try {
      const response = await fetch(`/api/orders/${updatedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder)
      });
      if (!response.ok) {
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Fehler beim Speichern!', type: 'error' } });
        return;
      }
      if (notificationMsg) {
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: notificationMsg, type: 'success' } });
      }
    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Netzwerkfehler beim Speichern!', type: 'error' } });
    }
  };

  const handleStatusChange = (newStatus: Order['status']) => {
    const updatedOrder = {
      ...currentOrder,
      status: newStatus,
      assignedTo: assignedTo || null,
      estimatedHours: parseFloat(estimatedHours) || 0,
      actualHours: parseFloat(actualHours) || 0,
      notes,
      canEdit: newStatus === 'revision',
      updatedAt: new Date()
    };
    let message = '';
    switch (newStatus) {
      case 'accepted': message = 'Auftrag wurde erfolgreich angenommen'; break;
      case 'revision': message = 'Auftrag wurde zur Überarbeitung zurückgeschickt'; break;
      case 'in_progress': message = 'Auftrag wurde gestartet'; break;
      case 'completed':
        // Statt direkt abschließen: Endabnahme durch Kunden erforderlich
        updatedOrder.status = 'waiting_confirmation';
        message = 'Auftrag wartet auf Endabnahme durch den Kunden';
        break;
      default: message = 'Auftragsstatus wurde aktualisiert';
    }
    updateOrder(updatedOrder, message);
  };

  const handleArchive = async () => {
    const updatedOrder = {
      ...currentOrder,
      status: 'archived',
      updatedAt: new Date()
    };
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder)
      });
      if (!response.ok) {
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Fehler beim Archivieren!', type: 'error' } });
        return;
      }
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Auftrag wurde archiviert', type: 'info' } });
      onClose();
    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Netzwerkfehler beim Archivieren!', type: 'error' } });
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf') {
        const document: PDFDocument = {
          id: `doc_${Date.now()}_${Math.random()}`,
          name: file.name,
          url: URL.createObjectURL(file),
          uploadDate: new Date(),
          file: file
        };
        setSubTaskDocuments(prev => [...prev, document]);
      }
    });
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
    handleFileUpload(e.dataTransfer.files);
  };

  const removeSubTaskDocument = (id: string) => {
    setSubTaskDocuments(prev => {
      const docToRemove = prev.find(doc => doc.id === id);
      if (docToRemove?.url) {
        URL.revokeObjectURL(docToRemove.url);
      }
      return prev.filter(doc => doc.id !== id);
    });
  };

  const handleAddSubTask = async () => {
    if (!subTaskTitle.trim()) return;
    const newSubTask: SubTask = {
      id: `subtask_${Date.now()}_${Math.random()}`,
      orderId: currentOrder.id,
      title: subTaskTitle,
      description: subTaskDescription,
      estimatedHours: parseFloat(subTaskHours) || 0,
      actualHours: 0,
      status: 'pending',
      assignedTo: subTaskAssignedTo || null,
      notes: '',
      documents: subTaskDocuments,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const updatedOrder = {
      ...currentOrder,
      subTasks: [...currentOrder.subTasks, newSubTask],
      updatedAt: new Date()
    };
    await updateOrder(updatedOrder, 'Unteraufgabe wurde erfolgreich hinzugefügt');
    setSubTaskTitle('');
    setSubTaskDescription('');
    setSubTaskHours('');
    setSubTaskAssignedTo('');
    setSubTaskDocuments([]);
    setShowAddSubTask(false);
  };

  const handleUpdateSubTask = async (subTask: SubTask, updates: Partial<SubTask>) => {
    const updatedSubTask = {
      ...subTask,
      ...updates,
      updatedAt: new Date()
    };
    const updatedOrder = {
      ...currentOrder,
      subTasks: currentOrder.subTasks.map(st => st.id === subTask.id ? updatedSubTask : st),
      updatedAt: new Date()
    };
    await updateOrder(updatedOrder, 'Unteraufgabe aktualisiert');
  };

  const handleDeleteSubTask = async (subTaskId: string) => {
    if (confirm('Sind Sie sicher, dass Sie diese Unteraufgabe löschen möchten?')) {
      const updatedOrder = {
        ...currentOrder,
        subTasks: currentOrder.subTasks.filter(st => st.id !== subTaskId),
        updatedAt: new Date()
      };
      await updateOrder(updatedOrder, 'Unteraufgabe gelöscht');
    }
  };

  const handleDownload = (doc: any) => {
    if (doc.file) {
      const url = URL.createObjectURL(doc.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (doc.url) {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'revision': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'accepted': return 'Angenommen';
      case 'in_progress': return 'In Bearbeitung';
      case 'revision': return 'Überarbeitung';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  const canModify = state.currentUser?.role === 'admin' || 
                   (state.currentUser?.role === 'workshop' && currentOrder.assignedTo === state.currentUser?.id);

  // Auftrag löschen (nur für Admin)
  const handleDeleteOrder = async () => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      alert('Nur Admins dürfen Aufträge löschen!');
      return;
    }
    if (!window.confirm('Diesen Auftrag wirklich unwiderruflich löschen?')) return;
    try {
      const response = await fetch(`/api/orders/${currentOrder.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        alert('Fehler beim Löschen!');
        return;
      }
      onClose();
    } catch (err) {
      alert('Netzwerkfehler beim Löschen!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{currentOrder.title}</h2>
            <p className="text-gray-600 mt-1">Auftrags-Nr.: {currentOrder.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Auftragsdetails</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(currentOrder.status)}`}>
                      {getStatusText(currentOrder.status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Auftraggeber:</span>
                    <span className="text-sm font-medium text-gray-900">{currentOrder.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Deadline:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(currentOrder.deadline).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Kostenstelle:</span>
                    <span className="text-sm font-medium text-gray-900">{currentOrder.costCenter}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Priorität:</span>
                    <span className="text-sm font-medium text-gray-900">{currentOrder.priority}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Beschreibung</h4>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{currentOrder.description}</p>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Dokumente</h4>
                {currentOrder.documents.length > 0 ? (
                  <div className="space-y-2">
                    {currentOrder.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-red-600 mr-3" />
                          <span className="text-sm text-gray-900">{doc.name}</span>
                        </div>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          <span className="text-sm">Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Keine Dokumente hochgeladen</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Arbeitsbereich</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zugewiesen an
                    </label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      disabled={!canModify && state.currentUser?.role !== 'admin'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Nicht zugewiesen</option>
                      {state.workshopAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Geschätzte Stunden
                      </label>
                      <input
                        type="number"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        disabled={!canModify && state.currentUser?.role !== 'admin'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        min="0"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tatsächliche Stunden
                      </label>
                      <input
                        type="number"
                        value={actualHours}
                        onChange={(e) => setActualHours(e.target.value)}
                        disabled={!canModify && state.currentUser?.role !== 'admin'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notizen
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!canModify && state.currentUser?.role !== 'admin'}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="Notizen und Kommentare..."
                    />
                  </div>
                </div>
              </div>

              {(canModify || state.currentUser?.role === 'admin') && (
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Aktionen</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {currentOrder.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('accepted')}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Annehmen
                        </button>
                        <button
                          onClick={() => handleStatusChange('revision')}
                          className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Überarbeitung
                        </button>
                      </>
                    )}
                    
                    {currentOrder.status === 'accepted' || currentOrder.status === 'rework' ? (
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Starten
                      </button>
                    ) : null}
                    
                    {currentOrder.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Abschließen
                      </button>
                    )}
                    
                    {currentOrder.status === 'completed' && state.currentUser?.role === 'admin' && currentOrder.confirmationDate && (
                      <button
                        onClick={handleArchive}
                        className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archivieren
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleStatusChange('revision')}
                      className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Ablehnen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sub-tasks Section */}
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Unteraufgaben</h3>
              {(canModify || state.currentUser?.role === 'admin') && (
                <button
                  onClick={() => setShowAddSubTask(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Unteraufgabe hinzufügen
                </button>
              )}
            </div>

            {showAddSubTask && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Titel der Unteraufgabe"
                    value={subTaskTitle}
                    onChange={(e) => setSubTaskTitle(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Geschätzte Stunden"
                    value={subTaskHours}
                    onChange={(e) => setSubTaskHours(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.5"
                  />
                  <select
                    value={subTaskAssignedTo}
                    onChange={e => setSubTaskAssignedTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Mitarbeiter zuweisen (optional)</option>
                    {state.workshopAccounts.filter(acc => acc.role === 'workshop').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  placeholder="Beschreibung der Unteraufgabe"
                  value={subTaskDescription}
                  onChange={(e) => setSubTaskDescription(e.target.value)}
                  rows={2}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {/* PDF Upload for Subtasks */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF Dokumente für Unteraufgabe
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm mb-2">PDF-Dateien hier ablegen oder</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={e => handleFileUpload(e.target.files)}
                      />
                      <span className="text-blue-600 underline">Dateien auswählen</span>
                    </label>
                  </div>
                  {/* Show uploaded files */}
                  {subTaskDocuments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {subTaskDocuments.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-red-600 mr-2" />
                            <span className="text-sm text-gray-900">{doc.name}</span>
                          </div>
                          <button
                            onClick={() => removeSubTaskDocument(doc.id)}
                            className="text-red-600 hover:text-red-800 transition-colors flex items-center"
                          >
                            <X className="w-3 h-3 mr-1" />
                            <span className="text-xs">Entfernen</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={() => {
                      setShowAddSubTask(false);
                      setSubTaskDocuments([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAddSubTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            )}

            {currentOrder.subTasks.length > 0 ? (
              <div className="space-y-3">
                {currentOrder.subTasks.map((subTask) => (
                  <div key={subTask.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{subTask.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{subTask.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subTask.status)}`}>
                          {getStatusText(subTask.status)}
                        </span>
                        {(canModify || state.currentUser?.role === 'admin') && (
                          <button
                            onClick={() => handleDeleteSubTask(subTask.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Subtask Documents */}
                    {subTask.documents.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Dokumente:</h5>
                        <div className="space-y-1">
                          {subTask.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-red-600 mr-2" />
                                <span className="text-sm text-gray-900">{doc.name}</span>
                              </div>
                              <button
                                onClick={() => handleDownload(doc)}
                                className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                <span className="text-xs">Download</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Geschätzt: </span>
                        <span className="font-medium">{subTask.estimatedHours}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tatsächlich: </span>
                        <span className="font-medium">{subTask.actualHours}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Zugewiesen: </span>
                        <span className="font-medium">
                          {subTask.assignedTo 
                            ? state.workshopAccounts.find(acc => acc.id === subTask.assignedTo)?.name 
                            : 'Nicht zugewiesen'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <select
                          value={subTask.assignedTo || ''}
                          onChange={(e) => handleUpdateSubTask(subTask, { assignedTo: e.target.value || null })}
                          disabled={!canModify && state.currentUser?.role !== 'admin'}
                          className="text-xs px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                        >
                          <option value="">Nicht zugewiesen</option>
                          {state.workshopAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={subTask.status}
                          onChange={(e) => handleUpdateSubTask(subTask, { status: e.target.value as SubTask['status'] })}
                          disabled={!canModify && state.currentUser?.role !== 'admin' && subTask.assignedTo !== state.currentUser?.id}
                          className="text-xs px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                        >
                          <option value="pending">Ausstehend</option>
                          <option value="in_progress">In Bearbeitung</option>
                          <option value="completed">Abgeschlossen</option>
                        </select>
                      </div>
                      
                      <input
                        type="number"
                        placeholder="Tats. Stunden"
                        value={subTask.actualHours}
                        onChange={(e) => handleUpdateSubTask(subTask, { actualHours: parseFloat(e.target.value) || 0 })}
                        disabled={!canModify && state.currentUser?.role !== 'admin' && subTask.assignedTo !== state.currentUser?.id}
                        className="w-20 text-xs px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Keine Unteraufgaben vorhanden</p>
            )}
          </div>
        </div>
        {/* Löschen-Button für Admin unten zentriert */}
        {state.currentUser?.role === 'admin' && (
          <div className="flex justify-center mt-12 mb-2">
            <button
              onClick={handleDeleteOrder}
              className="px-6 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors text-lg font-semibold"
              title="Auftrag löschen"
            >
              <Trash2 className="w-5 h-5 mr-2 inline" /> Auftrag löschen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}