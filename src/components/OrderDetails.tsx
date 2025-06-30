import React, { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, Clock, FileText, User, Download } from 'lucide-react';
import { Order } from '../types';
import ws from '../utils/websocket';
import { useApp } from '../context/AppContext';

interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
}

export default function OrderDetails({ order, onClose }: OrderDetailsProps) {
  const { state, dispatch } = useApp();
  // Immer die aktuellste Order aus dem Context holen
  const currentOrder = state.orders.find(o => o.id === order.id) || order;

  // --- State für Endabnahme/Nacharbeit ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [confirmationNote, setConfirmationNote] = useState('');
  const [revisionDescription, setRevisionDescription] = useState('');
  const [revisionDeadline, setRevisionDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- State für Nacharbeits-Upload ---
  const [revisionFiles, setRevisionFiles] = useState<File[]>([]);
  const [revisionFileError, setRevisionFileError] = useState('');

  useEffect(() => {
    // WebSocket verbinden und auf Events hören
    ws.connect(order.id, (data) => {
      // Nach Event: Context wird aktualisiert, Komponente rendert neu
      // (optional: hier könnte man auch einen Backend-Reload triggern)
    });
    return () => {
      ws.disconnect();
    };
  }, [order.id]);

  // Debug: User und Order-Status prüfen
  useEffect(() => {
    console.log('OrderDetails: currentUser', state.currentUser);
    console.log('OrderDetails: currentOrder.status', currentOrder.status);
    console.log('OrderDetails: currentOrder', currentOrder);
  }, [state.currentUser, currentOrder.status]);

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

  const handleDownload = async (doc: any) => {
    if (doc.file) {
      // Create download link for the actual file
      const url = URL.createObjectURL(doc.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (doc.url) {
      // Datei als Blob vom Server laden und dann herunterladen
      try {
        const response = await fetch(doc.url);
        if (!response.ok) throw new Error('Download fehlgeschlagen');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Fehler beim Herunterladen der Datei!');
      }
    }
  };

  // Auftrag löschen (nur für Admin)
  const handleDelete = async () => {
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

  // Endabnahme bestätigen
  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      const updatedOrder = {
        ...currentOrder,
        status: 'completed',
        confirmationNote,
        confirmationDate: new Date(),
        updatedAt: new Date(),
      };
      console.log('PUT /api/orders/:id (Bestätigen):', updatedOrder);
      const response = await fetch(`/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder),
      });
      if (!response.ok) throw new Error('Fehler beim Bestätigen');
      setShowConfirmModal(false);
      setConfirmationNote('');
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Auftrag bestätigt!', type: 'success' } });
    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Fehler bei der Bestätigung!', type: 'error' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nacharbeit anfordern
  const handleRequestRevision = async () => {
    setIsSubmitting(true);
    try {
      // Dateien hochladen (falls vorhanden)
      let uploadedDocs = [];
      if (revisionFiles.length > 0) {
        uploadedDocs = await Promise.all(revisionFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          return {
            id: `doc_${Date.now()}_${Math.random()}`,
            name: data.originalname,
            url: `/uploads/${data.filename}`,
            uploadDate: new Date(),
          };
        }));
      }
      const updatedOrder = {
        ...currentOrder,
        status: 'revision',
        revisionRequest: {
          description: revisionDescription,
          newDeadline: revisionDeadline ? new Date(revisionDeadline) : undefined,
          documents: uploadedDocs,
          requestedAt: new Date(),
        },
        updatedAt: new Date(),
      };
      console.log('PUT /api/orders/:id (Nacharbeit):', updatedOrder);
      const response = await fetch(`/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder),
      });
      if (!response.ok) throw new Error('Fehler bei Nacharbeitsanfrage');
      setShowRevisionModal(false);
      setRevisionDescription('');
      setRevisionDeadline('');
      setRevisionFiles([]);
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Nacharbeit angefordert!', type: 'success' } });
    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Fehler bei der Nacharbeitsanfrage!', type: 'error' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nacharbeitsdokumente hinzufügen
  const handleRevisionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRevisionFileError('');
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const pdfs = files.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== files.length) {
      setRevisionFileError('Nur PDF-Dateien erlaubt!');
      return;
    }
    setRevisionFiles(prev => [...prev, ...pdfs]);
  };

  const handleRemoveRevisionFile = (idx: number) => {
    setRevisionFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Hilfsfunktion: Wer hat Nacharbeit gefordert?
  const isRevisionByClient = currentOrder.status === 'revision' && !!currentOrder.revisionRequest && currentOrder.revisionRequest?.description && state.currentUser?.role === 'client';
  const isRevisionByWorkshop = currentOrder.status === 'revision' && !!currentOrder.revisionRequest && currentOrder.revisionRequest?.description && state.currentUser?.role === 'workshop';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Auftragsdetails</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(currentOrder.status)}`}>
                      {getStatusText(currentOrder.status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Erstellt am:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(currentOrder.createdAt).toLocaleDateString('de-DE')}
                    </span>
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
                    <span className="text-sm font-medium text-gray-900 capitalize">{currentOrder.priority}</span>
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
                          <div>
                            <span className="text-sm text-gray-900">{doc.name}</span>
                            <div className="text-xs text-gray-500">
                              {new Date(doc.uploadDate).toLocaleDateString('de-DE')}
                            </div>
                          </div>
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

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bearbeitungsstatus</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Geschätzte Stunden:</span>
                    <span className="text-sm font-medium text-gray-900">{currentOrder.estimatedHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tatsächliche Stunden:</span>
                    <span className="text-sm font-medium text-gray-900">{currentOrder.actualHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Zugewiesen an:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {currentOrder.assignedTo ? 'Werkstatt Personal' : 'Nicht zugewiesen'}
                    </span>
                  </div>
                </div>
              </div>

              {currentOrder.notes && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Notizen</h4>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{currentOrder.notes}</p>
                </div>
              )}

              {currentOrder.subTasks.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Unteraufgaben</h4>
                  <div className="space-y-2">
                    {currentOrder.subTasks.map((subTask) => (
                      <div key={subTask.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900">{subTask.title}</h5>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subTask.status)}`}>
                            {getStatusText(subTask.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{subTask.description}</p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Geschätzt: {subTask.estimatedHours}h</span>
                          <span>Tatsächlich: {subTask.actualHours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Endabnahme-Kommentar und Nacharbeitsanfrage */}
              {(currentOrder.confirmationNote || currentOrder.confirmationDate) && (
                <div>
                  <h4 className="text-md font-semibold text-green-700 mb-2">Endabnahme durch Kunde</h4>
                  {currentOrder.confirmationNote && (
                    <div className="bg-green-50 rounded-lg p-3 mb-2">
                      <span className="block text-gray-700">Kommentar:</span>
                      <span className="block text-gray-900">{currentOrder.confirmationNote}</span>
                    </div>
                  )}
                  {currentOrder.confirmationDate && (
                    <div className="text-xs text-gray-500 mb-2">
                      Bestätigt am: {new Date(currentOrder.confirmationDate).toLocaleString('de-DE')}
                    </div>
                  )}
                </div>
              )}

              {currentOrder.revisionRequest && (
                <div>
                  <h4 className="text-md font-semibold text-orange-700 mb-2">Nacharbeitsanfrage</h4>
                  <div className="bg-orange-50 rounded-lg p-3 mb-2">
                    <span className="block text-gray-700">Beschreibung:</span>
                    <span className="block text-gray-900">{currentOrder.revisionRequest.description}</span>
                    {currentOrder.revisionRequest.newDeadline && (
                      <div className="text-xs text-gray-500 mt-2">
                        Neue Deadline: {new Date(currentOrder.revisionRequest.newDeadline).toLocaleDateString('de-DE')}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Angefordert am: {new Date(currentOrder.revisionRequest.requestedAt).toLocaleString('de-DE')}
                    </div>
                  </div>
                  {currentOrder.revisionRequest.documents && currentOrder.revisionRequest.documents.length > 0 && (
                    <div className="mb-2">
                      <span className="block text-gray-700 font-medium mb-1">Neue Dokumente:</span>
                      <div className="space-y-1">
                        {currentOrder.revisionRequest.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                            <span className="text-sm text-gray-900">{doc.name}</span>
                            <button onClick={() => handleDownload(doc)} className="text-blue-600 hover:text-blue-800 flex items-center text-xs">
                              <Download className="w-4 h-4 mr-1" />Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons für Endabnahme und Nacharbeit (nur für Kunden, wenn Status waiting_confirmation) */}
        {state.currentUser?.role === 'client' && currentOrder.status === 'waiting_confirmation' && (
          <div className="flex flex-col gap-2 mt-4">
            <div className="text-xs text-gray-500">DEBUG: Buttons sichtbar für User {state.currentUser?.username}, Status: {currentOrder.status}</div>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => setShowConfirmModal(true)}
            >
              Endabnahme bestätigen
            </button>
            <button
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              onClick={() => setShowRevisionModal(true)}
            >
              Nacharbeit anfordern
            </button>
          </div>
        )}

        {/* Nacharbeitsmaske für den Kunden (Status revision, Nacharbeit wurde vom Kunden gefordert) */}
        {state.currentUser?.role === 'client' && currentOrder.status === 'revision' && currentOrder.revisionRequest && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 my-4 rounded">
            <h4 className="font-semibold text-orange-700 mb-2">Nacharbeit angefordert</h4>
            <div className="mb-2">
              <span className="font-medium">Beschreibung:</span> {currentOrder.revisionRequest.description}
            </div>
            {currentOrder.revisionRequest.newDeadline && (
              <div className="mb-2">
                <span className="font-medium">Neue Deadline:</span> {new Date(currentOrder.revisionRequest.newDeadline).toLocaleDateString('de-DE')}
              </div>
            )}
            {currentOrder.revisionRequest.documents && currentOrder.revisionRequest.documents.length > 0 && (
              <div className="mb-2">
                <span className="font-medium">Dokumente:</span>
                <ul className="list-disc ml-6">
                  {currentOrder.revisionRequest.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <span>{doc.name}</span>
                      <button onClick={() => handleDownload(doc)} className="text-blue-600 hover:text-blue-800 text-xs">Download</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-xs text-gray-500">Status: Nacharbeit wurde an die Werkstatt übermittelt. Bitte warten Sie auf Rückmeldung.</div>
          </div>
        )}

        {/* Nacharbeitsmaske für die Werkstatt (Status revision, Nacharbeit wurde vom Kunden gefordert) */}
        {state.currentUser?.role === 'workshop' && currentOrder.status === 'revision' && currentOrder.revisionRequest && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 my-4 rounded">
            <h4 className="font-semibold text-orange-700 mb-2">Nacharbeit vom Kunden angefordert</h4>
            <div className="mb-2">
              <span className="font-medium">Beschreibung:</span> {currentOrder.revisionRequest.description}
            </div>
            {currentOrder.revisionRequest.newDeadline && (
              <div className="mb-2">
                <span className="font-medium">Neue Deadline:</span> {new Date(currentOrder.revisionRequest.newDeadline).toLocaleDateString('de-DE')}
              </div>
            )}
            {currentOrder.revisionRequest.documents && currentOrder.revisionRequest.documents.length > 0 && (
              <div className="mb-2">
                <span className="font-medium">Dokumente:</span>
                <ul className="list-disc ml-6">
                  {currentOrder.revisionRequest.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <span>{doc.name}</span>
                      <button onClick={() => handleDownload(doc)} className="text-blue-600 hover:text-blue-800 text-xs">Download</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-xs text-gray-500">Status: Nacharbeit durch Werkstatt erforderlich.</div>
          </div>
        )}

        {/* Modal für Endabnahme */}
        {showConfirmModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">Endabnahme bestätigen</h3>
              <textarea
                className="w-full border rounded p-2 mb-4"
                rows={3}
                placeholder="Kommentar zur Endabnahme (optional)"
                value={confirmationNote}
                onChange={e => setConfirmationNote(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-gray-200 rounded"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >Abbrechen</button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting}
                >Bestätigen</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal für Nacharbeitsanfrage */}
        {showRevisionModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-2">Nacharbeit anfordern</h3>
              <textarea
                className="w-full border rounded p-2 mb-4"
                rows={3}
                placeholder="Beschreibung der Nacharbeit"
                value={revisionDescription}
                onChange={e => setRevisionDescription(e.target.value)}
              />
              <label className="block mb-2 text-sm">Neue Deadline (optional):</label>
              <input
                type="date"
                className="w-full border rounded p-2 mb-4"
                value={revisionDeadline}
                onChange={e => setRevisionDeadline(e.target.value)}
              />
              <label className="block mb-2 text-sm">Dokumente (PDF, optional):</label>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleRevisionFileChange}
                className="mb-2"
              />
              {revisionFileError && <div className="text-red-600 text-xs mb-2">{revisionFileError}</div>}
              {revisionFiles.length > 0 && (
                <ul className="mb-2">
                  {revisionFiles.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm bg-gray-100 rounded p-2 mb-1">
                      <span>{file.name}</span>
                      <button className="text-red-600 ml-2" onClick={() => handleRemoveRevisionFile(idx)}>Entfernen</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 bg-gray-200 rounded"
                  onClick={() => setShowRevisionModal(false)}
                  disabled={isSubmitting}
                >Abbrechen</button>
                <button
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  onClick={handleRequestRevision}
                  disabled={isSubmitting || !revisionDescription.trim()}
                >Nacharbeit anfordern</button>
              </div>
            </div>
          </div>
        )}

        {/* Admin-Löschen-Button mittig unten */}
        {state.currentUser?.role === 'admin' && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-base font-semibold shadow"
              title="Auftrag löschen"
            >
              Auftrag löschen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}