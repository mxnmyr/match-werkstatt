import React, { useState, useEffect } from 'react';
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
import { Order, SubTask, PDFDocument, RevisionComment, NoteHistory } from '../types';

interface WorkshopOrderDetailsProps {
  order: Order;
  onClose: () => void;
}

export default function WorkshopOrderDetails({ order, onClose }: WorkshopOrderDetailsProps) {
  const { state, dispatch } = useApp();
  const [localOrder, setLocalOrder] = useState(order);

  const [estimatedHours, setEstimatedHours] = useState(localOrder.estimatedHours?.toString() || '0');
  const [actualHours, setActualHours] = useState(localOrder.actualHours?.toString() || '0');
  const [notes, setNotes] = useState(localOrder.notes || '');
  const [showAddSubTask, setShowAddSubTask] = useState(false);
  const [subTaskTitle, setSubTaskTitle] = useState('');
  const [subTaskDescription, setSubTaskDescription] = useState('');
  const [subTaskHours, setSubTaskHours] = useState('');
  const [subTaskDocuments, setSubTaskDocuments] = useState<PDFDocument[]>([]);
  const [assignedTo, setAssignedTo] = useState(localOrder.assignedTo || '');
  const [subTaskAssignedTo, setSubTaskAssignedTo] = useState('');
  const [subTaskScopeType, setSubTaskScopeType] = useState<'order' | 'component'>('order');
  const [subTaskAssignedComponentId, setSubTaskAssignedComponentId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [revisionError, setRevisionError] = useState('');
  const [titleImageUrl, setTitleImageUrl] = useState('');

  // Zustand für bearbeitete Felder
  const [changedFields, setChangedFields] = useState<Partial<Order>>({});

  useEffect(() => {
    if (localOrder.titleImage) {
      // Append a timestamp to break browser cache when the image is updated
      setTitleImageUrl(`http://localhost:3001/api/orders/${localOrder.id}/title-image?t=${new Date().getTime()}`);
    } else {
      setTitleImageUrl('');
    }
  }, [localOrder.titleImage, localOrder.id]);

  // Wrapper, um Änderungen zu sammeln
  const handleFieldChange = (field: keyof Order, value: any) => {
    // Lokalen State für die UI direkt aktualisieren
    const updateLocalState = () => {
        switch (field) {
            case 'assignedTo':
                setAssignedTo(value);
                break;
            case 'estimatedHours':
                setEstimatedHours(value.toString());
                break;
            case 'actualHours':
                setActualHours(value.toString());
                break;
            case 'notes':
                setNotes(value);
                break;
            case 'materialOrderedByWorkshop':
            case 'materialOrderedByClient':
            case 'materialOrderedByClientConfirmed':
            case 'materialAvailable':
                // Aktualisiere direkt den lokalen Order-State für Checkboxen
                setLocalOrder(prev => ({ ...prev, [field]: value }));
                break;
        }
    };
    updateLocalState();

    // Änderungen für den nächsten Speicher-Vorgang sammeln
    setChangedFields(prev => ({ ...prev, [field]: value }));
  };

  // Hilfsfunktion für API-Update
  const updateOrder = async (updatedFields: Partial<Order>, notificationMsg?: string) => {
    // Verhindern, dass leere Updates gesendet werden
    if (Object.keys(updatedFields).length === 0) {
        if (notificationMsg) {
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: notificationMsg, type: 'success' } });
        }
        return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/orders/${localOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (!response.ok) {
        const errorData = await response.json();
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Fehler: ${errorData.error || 'Unbekannt'}`, type: 'error' } });
        return;
      }
      const freshOrder = await response.json();
      setLocalOrder(freshOrder);
      setChangedFields({}); // Zurücksetzen nach erfolgreichem Speichern

      if (notificationMsg) {
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: notificationMsg, type: 'success' } });
      }
    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Netzwerkfehler beim Speichern!', type: 'error' } });
    }
  };

  const handleSave = () => {
    // Sicherstellen, dass die Stunden als Zahlen gesendet werden
    const payload: Partial<Order> = {
        ...changedFields,
    };
    if (changedFields.estimatedHours !== undefined) {
        payload.estimatedHours = parseFloat(estimatedHours) || 0;
    }
    if (changedFields.actualHours !== undefined) {
        payload.actualHours = parseFloat(actualHours) || 0;
    }
    updateOrder(payload, 'Änderungen gespeichert');
  };

  const handleStatusChange = (newStatus: Order['status']) => {
    if (newStatus === 'revision') {
      setShowRevisionDialog(true);
      return;
    }
    const updatedFields: Partial<Order> = {
      ...changedFields,
      status: newStatus,
    };

    let message = '';
    switch (newStatus) {
      case 'accepted': message = 'Auftrag wurde erfolgreich angenommen'; break;
      case 'in_progress': message = 'Auftrag wurde gestartet'; break;
      case 'completed':
        updatedFields.status = 'waiting_confirmation';
        message = 'Auftrag wartet auf Endabnahme durch den Kunden';
        break;
      default: message = 'Auftragsstatus wurde aktualisiert';
    }
    updateOrder(updatedFields, message);
  };

  // Revision absenden
  const submitRevision = async () => {
    if (!revisionComment.trim()) {
      setRevisionError('Kommentar ist erforderlich!');
      return;
    }
    setRevisionError('');
    setShowRevisionDialog(false);
    
    const requestBody: Partial<Order> & { revisionComment: string; userId?: string; userName?: string } = {
      ...changedFields,
      status: 'revision',
      canEdit: true,
      revisionComment,
      userId: state.currentUser?.id,
      userName: state.currentUser?.name,
    };
    
    updateOrder(requestBody, 'Auftrag wurde zur Überarbeitung zurückgeschickt');
    setRevisionComment('');
  };

  const handleTitleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`http://localhost:3001/api/orders/${localOrder.id}/upload-title-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Fehler: ${errorData.error || 'Unbekannt'}`, type: 'error' } });
        return;
      }

      // Da das Bild jetzt über einen separaten Endpunkt geladen wird,
      // müssen wir die URL im lokalen State "künstlich" erzeugen, um eine Neuanzeige zu triggern.
      // Ein Zeitstempel sorgt für einen einzigartigen Wert.
      const updatedOrderFromServer = await response.json();
      setLocalOrder(updatedOrderFromServer);

      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Titelbild erfolgreich aktualisiert.', type: 'success' } });

    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Netzwerkfehler beim Upload des Titelbildes.', type: 'error' } });
    }
  };

  const handleTitleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleTitleImageUpload(e.target.files[0]);
    }
  };

  const removeTitleImage = async () => {
    // Create a payload with just the change
    const payload = { titleImage: null };
    updateOrder(payload, 'Titelbild entfernt.');
  };

  const handleArchive = async () => {
    updateOrder({ status: 'archived' }, 'Auftrag wurde archiviert');
    onClose();
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
    if (!subTaskAssignedTo.trim()) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Bitte einen Mitarbeiter zuweisen!', type: 'error' } });
      return;
    }
    
    const newSubTask: SubTask = {
      id: `subtask_${Date.now()}_${Math.random()}`,
      orderId: localOrder.id,
      title: subTaskTitle,
      description: subTaskDescription,
      estimatedHours: parseFloat(subTaskHours) || 0,
      actualHours: 0,
      status: 'pending',
      assignedTo: subTaskAssignedTo, // Mitarbeiter-ID (Pflicht)
      scopeType: subTaskScopeType, // Scope: 'order' oder 'component'
      assignedComponentId: subTaskScopeType === 'component' ? subTaskAssignedComponentId : null,
      notes: '',
      documents: subTaskDocuments,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const updatedOrder = {
      ...localOrder,
      subTasks: [...localOrder.subTasks, newSubTask],
      updatedAt: new Date()
    };
    await updateOrder(updatedOrder, 'Unteraufgabe wurde erfolgreich hinzugefügt');
    setSubTaskTitle('');
    setSubTaskDescription('');
    setSubTaskHours('');
    setSubTaskAssignedTo('');
    setSubTaskScopeType('order');
    setSubTaskAssignedComponentId('');
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
      ...localOrder,
      subTasks: localOrder.subTasks.map(st => st.id === subTask.id ? updatedSubTask : st),
      updatedAt: new Date()
    };
    await updateOrder(updatedOrder, 'Unteraufgabe aktualisiert');
  };

  const handleDeleteSubTask = async (subTaskId: string) => {
    if (confirm('Sind Sie sicher, dass Sie diese Unteraufgabe löschen möchten?')) {
      const updatedOrder = {
        ...localOrder,
        subTasks: localOrder.subTasks.filter(st => st.id !== subTaskId),
        updatedAt: new Date()
      };
      await updateOrder(updatedOrder, 'Unteraufgabe gelöscht');
    }
  };

  const handleDownload = (doc: any) => {
    // reworkComment docs might just have a filename as URL
    if (doc.url && !doc.url.startsWith('blob:')) {
        const a = document.createElement('a');
        // Prepend server address if it's a relative path
        a.href = doc.url.startsWith('/uploads/') ? `http://localhost:3001${doc.url}` : doc.url;
        a.download = doc.name;
        a.target = '_blank'; // Open in new tab to prevent navigation issues
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else if (doc.file) { // For newly uploaded files before saving
      const url = URL.createObjectURL(doc.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'revision': return 'bg-orange-100 text-orange-800';
      case 'rework': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'waiting_confirmation': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'accepted': return 'Angenommen';
      case 'in_progress': return 'In Bearbeitung';
      case 'revision': return 'Überarbeitung';
      case 'rework': return 'In Nacharbeit';
      case 'completed': return 'Abgeschlossen';
      case 'waiting_confirmation': return 'Wartet auf Abnahme';
      default: return status;
    }
  };

  const canModify = state.currentUser?.role === 'admin' || 
                   (state.currentUser?.role === 'workshop' && localOrder.assignedTo === state.currentUser?.id);

  // Auftrag löschen (nur für Admin)
  const handleDeleteOrder = async () => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      alert('Nur Admins dürfen Aufträge löschen!');
      return;
    }
    if (!window.confirm('Diesen Auftrag wirklich unwiderruflich löschen?')) return;
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${localOrder.id}`, {
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

  // Hilfsfunktion für die Anzeige der Zuweisungsinformationen
  const getAssignmentDisplay = (subTask: SubTask) => {
    // Mitarbeiter-Zuweisung anzeigen
    let assignedUser = 'Nicht zugewiesen';
    if (subTask.assignedTo) {
      const employee = state.workshopAccounts.find(acc => acc.id === subTask.assignedTo);
      assignedUser = employee ? `👤 ${employee.name}` : 'Unbekannter Mitarbeiter';
    }
    
    // Scope anzeigen
    let scope = '';
    if (subTask.scopeType === 'component' && subTask.assignedComponentId) {
      const component = localOrder.components.find(comp => comp.id === subTask.assignedComponentId);
      scope = component ? ` → 🔧 ${component.title}` : ' → Unbekanntes Bauteil';
    } else if (subTask.scopeType === 'order') {
      scope = ' → 📋 Gesamtauftrag';
    }
    
    return assignedUser + scope;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{localOrder.title}</h2>
            <p className="text-gray-600 mt-1">Auftrags-Nr.: {localOrder.orderNumber || localOrder.id}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Linke Spalte: Auftragsdetails */}
            <div className="md:col-span-2 space-y-6">

              {/* Titelbild Sektion */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Titelbild</h3>
                <div className="flex items-center gap-6">
                  {titleImageUrl ? (
                    <img src={titleImageUrl} alt="Titelbild" className="w-32 h-32 object-cover rounded-lg shadow-md" />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-center p-2">
                      Kein Titelbild
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="title-image-input" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm text-center">
                      {titleImageUrl ? 'Bild ändern' : 'Bild hochladen'}
                    </label>
                    <input
                      id="title-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleTitleImageInputChange}
                    />
                    {titleImageUrl && (
                      <button
                        onClick={removeTitleImage}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Auftragsinformationen */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Auftragsinformationen</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`block px-2 py-1 text-xs rounded-full ${getStatusColor(localOrder.status)}`}>
                      {getStatusText(localOrder.status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Auftraggeber:</span>
                    <span className="text-sm font-medium text-gray-900">{localOrder.clientName}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Deadline:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(localOrder.deadline).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Kostenstelle:</span>
                    <span className="text-sm font-medium text-gray-900">{localOrder.costCenter}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Priorität:</span>
                    <span className="text-sm font-medium text-gray-900">{localOrder.priority}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Beschreibung</h4>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{localOrder.description}</p>
              </div>

              {/* Revision History (Werkstatt an Kunde) */}
              {localOrder.revisionHistory && Array.isArray(localOrder.revisionHistory) && localOrder.revisionHistory.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Werkstatt-Kommentare</h4>
                  <div className="space-y-3 bg-orange-50 rounded-lg p-4 border border-orange-200">
                    {localOrder.revisionHistory.map((entry: any, index: number) => (
                      <div key={index} className="p-3 bg-white rounded-md shadow-sm">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.comment}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          <strong>{entry.userName}</strong> am {new Date(entry.createdAt).toLocaleString('de-DE')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rework Comments (Kunde an Werkstatt) */}
              {localOrder.reworkComments && Array.isArray(localOrder.reworkComments) && localOrder.reworkComments.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Kunden-Kommentare zur Nacharbeit</h4>
                  <div className="space-y-3 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    {localOrder.reworkComments.map((entry: any, index: number) => (
                      <div key={index} className="p-3 bg-white rounded-md shadow-sm">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.comment}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          <strong>{entry.userName}</strong> am {new Date(entry.createdAt).toLocaleString('de-DE')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Dokumente</h4>
                {localOrder.documents && localOrder.documents.length > 0 ? (
                  <div className="space-y-2">
                    {localOrder.documents.map((doc) => (
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

              {/* Bauteile-Bereich */}
              {localOrder.components && localOrder.components.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Bauteile</h4>
                  <div className="space-y-4">
                    {localOrder.components.map((component) => (
                      <div key={component.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="mb-3">
                          <h5 className="font-medium text-gray-900 text-sm">{component.title}</h5>
                          {component.description && (
                            <p className="text-gray-600 text-sm mt-1">{component.description}</p>
                          )}
                        </div>
                        
                        {component.documents && component.documents.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-700 mb-2">Dokumente:</h6>
                            <div className="space-y-1">
                              {component.documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                                  <div className="flex items-center">
                                    <FileText className="w-4 h-4 text-red-600 mr-2" />
                                    <span className="text-gray-900">{doc.name}</span>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                      onChange={(e) => handleFieldChange('assignedTo', e.target.value || null)}
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
                        onChange={(e) => handleFieldChange('estimatedHours', e.target.value)}
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
                        onChange={(e) => handleFieldChange('actualHours', e.target.value)}
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
                      onChange={(e) => handleFieldChange('notes', e.target.value)}
                      disabled={!canModify && state.currentUser?.role !== 'admin'}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="Notizen und Kommentare..."
                    />
                  </div>

                  {/* Materialstatus Sektion */}
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      📦 Materialstatus
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOrder.materialOrderedByWorkshop || false}
                          onChange={(e) => handleFieldChange('materialOrderedByWorkshop', e.target.checked)}
                          disabled={!canModify && state.currentUser?.role !== 'admin'}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          🏭 Material von der Werkstatt bestellt
                        </span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOrder.materialOrderedByClient || false}
                          onChange={(e) => handleFieldChange('materialOrderedByClient', e.target.checked)}
                          disabled={!canModify && state.currentUser?.role !== 'admin'}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          👤 Material durch den Kunden bestellt
                        </span>
                        {localOrder.materialOrderedByClient && localOrder.materialOrderedByClientConfirmed && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            ✓ Vom Kunden bestätigt
                          </span>
                        )}
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOrder.materialAvailable || false}
                          onChange={(e) => handleFieldChange('materialAvailable', e.target.checked)}
                          disabled={!canModify && state.currentUser?.role !== 'admin'}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          ✅ Material vorhanden
                        </span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={Object.keys(changedFields).length === 0}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Änderungen speichern
                  </button>

                  {/* Notiz-Historie */}
                  {localOrder.noteHistory && localOrder.noteHistory.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mt-4 mb-2">Notiz-Verlauf</h4>
                      <div className="space-y-3 bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        {localOrder.noteHistory.map((entry: NoteHistory) => (
                          <div key={entry.id} className="p-3 bg-white rounded-md shadow-sm border">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.notes}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(entry.createdAt).toLocaleString('de-DE')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(canModify || state.currentUser?.role === 'admin') && (
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Aktionen</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {localOrder.status === 'pending' && (
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
                    
                    {localOrder.status === 'accepted' || localOrder.status === 'rework' ? (
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Starten
                      </button>
                    ) : null}
                    
                    {localOrder.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Abschließen
                      </button>
                    )}
                    
                    {localOrder.status === 'completed' && state.currentUser?.role === 'admin' && (
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
                  
                  {/* Mitarbeiter-Auswahl (Pflichtfeld) */}
                  <select
                    value={subTaskAssignedTo}
                    onChange={e => setSubTaskAssignedTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Mitarbeiter auswählen *</option>
                    {state.workshopAccounts.filter(acc => acc.role === 'workshop').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                  
                  {/* Scope-Auswahl */}
                  <select
                    value={subTaskScopeType}
                    onChange={e => setSubTaskScopeType(e.target.value as 'order' | 'component')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="order">Gesamter Auftrag</option>
                    <option value="component">Bauteil</option>
                  </select>
                  
                  {/* Bauteil-Auswahl (nur bei scopeType='component') */}
                  {subTaskScopeType === 'component' && (
                    <div className="md:col-span-2">
                      <select
                        value={subTaskAssignedComponentId}
                        onChange={e => setSubTaskAssignedComponentId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Bauteil auswählen</option>
                        {localOrder.components.map(comp => (
                          <option key={comp.id} value={comp.id}>{comp.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
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

            {/* Subtasks sicher abfragen */}
            {Array.isArray(localOrder.subTasks) && localOrder.subTasks.length > 0 ? (
              <div className="space-y-3">
                {localOrder.subTasks.map((subTask) => (
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
                          {getAssignmentDisplay(subTask)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2 flex-wrap">
                        {/* Mitarbeiter-Zuweisung (Pflichtfeld) */}
                        <select
                          value={subTask.assignedTo || ''}
                          onChange={(e) => handleUpdateSubTask(subTask, { assignedTo: e.target.value || null })}
                          disabled={!canModify && state.currentUser?.role !== 'admin'}
                          className="text-xs px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                        >
                          <option value="">Mitarbeiter auswählen</option>
                          {state.workshopAccounts.filter(acc => acc.role === 'workshop').map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        
                        {/* Scope-Auswahl */}
                        <select
                          value={subTask.scopeType || 'order'}
                          onChange={(e) => {
                            const newScopeType = e.target.value as 'order' | 'component';
                            let updates: Partial<SubTask> = { 
                              scopeType: newScopeType,
                              assignedComponentId: newScopeType === 'order' ? null : subTask.assignedComponentId
                            };
                            handleUpdateSubTask(subTask, updates);
                          }}
                          disabled={!canModify && state.currentUser?.role !== 'admin'}
                          className="text-xs px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                        >
                          <option value="order">Gesamtauftrag</option>
                          <option value="component">Bauteil</option>
                        </select>
                        
                        {/* Bauteil-Auswahl (nur bei scopeType='component') */}
                        {subTask.scopeType === 'component' && (
                          <select
                            value={subTask.assignedComponentId || ''}
                            onChange={(e) => handleUpdateSubTask(subTask, { assignedComponentId: e.target.value || null })}
                            disabled={!canModify && state.currentUser?.role !== 'admin'}
                            className="text-xs px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                          >
                            <option value="">Bauteil auswählen</option>
                            {localOrder.components.map((comp) => (
                              <option key={comp.id} value={comp.id}>
                                {comp.title}
                              </option>
                            ))}
                          </select>
                        )}
                        
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

      {/* Revision-Kommentar Dialog */}
      {showRevisionDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Kommentar zur Nacharbeit</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-2 mb-2"
              rows={4}
              value={revisionComment}
              onChange={e => setRevisionComment(e.target.value)}
              placeholder="Bitte geben Sie einen Kommentar zur Nacharbeit ein..."
              autoFocus
            />
            {revisionError && <div className="text-red-600 text-sm mb-2">{revisionError}</div>}
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 border rounded-lg text-gray-700"
                onClick={() => { setShowRevisionDialog(false); setRevisionError(''); }}
              >Abbrechen</button>
              <button
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                onClick={submitRevision}
              >Absenden</button>
            </div>
          </div>
        </div>
      )}

      {/* Nacharbeits-Kommentare Verlauf */}
      {localOrder.revisionHistory && localOrder.revisionHistory.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-2">Nacharbeits-Kommentare</h4>
          <div className="space-y-2">
            {localOrder.revisionHistory.map((entry: RevisionComment, idx: number) => (
              <div key={idx} className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                <div className="text-sm text-gray-800 mb-1">{entry.comment}</div>
                <div className="text-xs text-gray-500">{entry.userName} am {new Date(entry.createdAt).toLocaleString('de-DE')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}