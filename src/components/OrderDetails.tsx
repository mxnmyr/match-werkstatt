import { useEffect, useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleImageUrl, setTitleImageUrl] = useState('');

  useEffect(() => {
    if (currentOrder.titleImage) {
      // Hänge einen Zeitstempel an, um den Browser-Cache zu umgehen
      setTitleImageUrl(`http://localhost:3001/api/orders/${currentOrder.id}/title-image?t=${new Date().getTime()}`);
    } else {
      setTitleImageUrl('');
    }
  }, [currentOrder.titleImage, currentOrder.id]);

  useEffect(() => {
    // WebSocket verbinden und auf Events hören
    ws.connect(order.id, (_data) => {
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
    console.log('OrderDetails: currentOrder.reworkComments', currentOrder.reworkComments);
  }, [state.currentUser, currentOrder.status, currentOrder]);

  // Zeige eine Warnung, wenn kein User im State ist
  useEffect(() => {
    if (!state.currentUser) {
      alert('FEHLER: Kein Benutzer im System angemeldet! Bitte neu einloggen.');
      console.error('OrderDetails: currentUser fehlt!', state.currentUser);
    } else {
      console.log('OrderDetails: currentUser vorhanden', state.currentUser);
    }
  }, []);

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

  const handleDownload = (doc: any) => {
    if (doc.url) {
      const a = document.createElement('a');
      a.href = doc.url.startsWith('/uploads/') ? `http://localhost:3001${doc.url}` : doc.url;
      a.download = doc.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Materialstatus aktualisieren (nur für Kunden-Checkbox)
  const handleMaterialStatusUpdate = async (field: 'materialOrderedByClientConfirmed', value: boolean) => {
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Fehler beim Aktualisieren');
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Materialstatus aktualisiert!', type: 'success' } });
    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Fehler beim Aktualisieren!', type: 'error' } });
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
      const response = await fetch(`http://localhost:3001/api/orders/${currentOrder.id}`, {
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
      const response = await fetch(`http://localhost:3001/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder),
      });
      if (!response.ok) throw new Error('Fehler beim Bestätigen');
      
      // Den aktualisierten Auftrag aus der Response holen und den Context aktualisieren
      const updatedOrderFromResponse = await response.json();
      console.log('=== FRONTEND: Updated Order received (Confirmation) ===');
      
      // Context mit dem aktualisierten Auftrag updaten
      dispatch({ 
        type: 'UPDATE_ORDER', 
        payload: updatedOrderFromResponse 
      });
      
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
    console.log('=== FRONTEND: handleRequestRevision called ===');
    console.log('revisionDescription:', revisionDescription);
    console.log('currentUser:', state.currentUser);
    console.log('currentOrder:', currentOrder);
    
    if (!revisionDescription.trim()) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Bitte geben Sie eine Beschreibung für die Nacharbeit ein!', type: 'error' } });
      return;
    }

    if (!state.currentUser?.id || !state.currentUser?.name) {
      alert('FEHLER: Kein Benutzer im System angemeldet! Bitte neu einloggen.');
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Fehler: Benutzerinformationen nicht verfügbar!', type: 'error' } });
      console.error('currentUser missing:', state.currentUser);
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Saubere Datenstruktur für Kundenkommentare - keine Arrays überschreiben!
      const requestBody = {
        status: 'rework',
        revisionComment: revisionDescription, // Der Kommentartext
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        updatedAt: new Date(),
      };
      
      console.log('=== FRONTEND: Request Body vor dem Senden ===');
      console.log('Full requestBody:', JSON.stringify(requestBody, null, 2));
      console.log('===============================================');
      
      console.log('PUT /api/orders/:id (Nacharbeit):', requestBody);
      const response = await fetch(`http://localhost:3001/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error('Fehler bei Nacharbeitsanfrage');
      
      // Den aktualisierten Auftrag aus der Response holen und den Context aktualisieren
      const updatedOrder = await response.json();
      console.log('=== FRONTEND: Updated Order received ===');
      console.log('reworkComments in response:', updatedOrder.reworkComments);
      console.log('About to dispatch UPDATE_ORDER with payload:', updatedOrder);
      
      // Context mit dem aktualisierten Auftrag updaten
      dispatch({ 
        type: 'UPDATE_ORDER', 
        payload: updatedOrder 
      });
      console.log('=== FRONTEND: UPDATE_ORDER dispatched ===');
      
      setShowRevisionModal(false);
      setRevisionDescription('');
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Nacharbeit angefordert!', type: 'success' } });
    } catch (err) {
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Fehler bei der Nacharbeitsanfrage!', type: 'error' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 truncate" title={currentOrder.title}>{currentOrder.title}</h2>
            <p className="text-gray-600 mt-1">Auftrags-Nr.: {currentOrder.orderNumber || currentOrder.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Linke Spalte: Auftragsdetails */}
            <div className="md:col-span-2 space-y-6">

              {/* Titelbild (falls vorhanden) */}
              {titleImageUrl && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Titelbild</h3>
                  <img 
                    src={titleImageUrl}
                    alt="Titelbild des Auftrags"
                    className="w-full h-auto max-h-96 object-contain rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Auftragsinformationen */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Auftragsinformationen</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Auftrags-Nr.</span>
                    <h4 className="text-xl font-bold text-gray-900">{currentOrder.id}</h4>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(currentOrder.status)}`}>
                      {getStatusText(currentOrder.status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Erstellt am</span>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(currentOrder.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Deadline</span>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(currentOrder.deadline).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Kostenstelle</span>
                    <p className="text-sm font-medium text-gray-900">{currentOrder.costCenter}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Priorität</span>
                    <p className="text-sm font-medium text-gray-900 capitalize">{currentOrder.priority}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Beschreibung</h4>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{currentOrder.description}</p>
              </div>

              {/* Kombinierter und sortierter Kommentarverlauf */}
              {(() => {
                const combinedComments = [
                  ...(currentOrder.revisionHistory || []),
                  ...(currentOrder.reworkComments || [])
                ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                if (combinedComments.length === 0) {
                  return null;
                }

                return (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Kommentarverlauf</h4>
                    <div className="space-y-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {combinedComments.map((entry: any, index: number) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-md shadow-sm ${entry.userName === 'Werkstatt' ? 'bg-orange-50 border-l-4 border-orange-300' : 'bg-blue-50 border-r-4 border-blue-300'}`}>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.comment}</p>
                          <p className={`text-xs text-gray-500 mt-2 ${entry.userName === 'Werkstatt' ? 'text-left' : 'text-right'}`}>
                            <strong>{entry.userName}</strong> am {new Date(entry.createdAt).toLocaleString('de-DE')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Dokumente</h4>
                {currentOrder.documents && currentOrder.documents.length > 0 ? (
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

              {/* Bauteile-Bereich */}
              {currentOrder.components && currentOrder.components.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Bauteile</h4>
                  <div className="space-y-4">
                    {currentOrder.components.map((component) => (
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
                                    <div>
                                      <span className="text-gray-900">{doc.name}</span>
                                      <div className="text-xs text-gray-500">
                                        {new Date(doc.uploadDate).toLocaleDateString('de-DE')}
                                      </div>
                                    </div>
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

              {/* Materialstatus Sektion für Kunden */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Materialstatus</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 flex items-center">
                      🏭 Material von der Werkstatt bestellt
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${currentOrder.materialOrderedByWorkshop ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {currentOrder.materialOrderedByWorkshop ? 'Ja' : 'Nein'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 flex items-center">
                      👤 Material durch den Kunden bestellt
                    </span>
                    {/* Checkbox nur anzeigen, wenn Werkstatt diese Option aktiviert hat */}
                    {currentOrder.materialOrderedByClient ? (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={currentOrder.materialOrderedByClientConfirmed || false}
                          onChange={(e) => handleMaterialStatusUpdate('materialOrderedByClientConfirmed', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Material bestellt</span>
                      </label>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        Nicht erforderlich
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 flex items-center">
                      ✅ Material vorhanden
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${currentOrder.materialAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {currentOrder.materialAvailable ? 'Ja' : 'Nein'}
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

        {/* Aktionen für Endabnahme */}
        {currentOrder.status === 'waiting_confirmation' && state.currentUser?.role === 'client' && (
          <div className="p-6 bg-gray-50 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Endabnahme</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bitte überprüfen Sie den Auftrag. Sie können die Fertigstellung bestätigen oder eine Nacharbeit mit Anmerkungen anfordern.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Auftrag bestätigen
              </button>
              <button
                onClick={() => setShowRevisionModal(true)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Nacharbeit anfordern
              </button>
            </div>
          </div>
        )}

        {/* Admin-Aktionen */}
        {state.currentUser?.role === 'admin' && (
          <div className="p-6 bg-gray-50 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin-Aktionen</h3>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Auftrag löschen
            </button>
          </div>
        )}
      </div>

      {/* Modal für Bestätigung */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Endabnahme bestätigen</h3>
            <p className="mb-4 text-gray-700">Möchten Sie die Fertigstellung dieses Auftrags wirklich bestätigen?</p>
            <textarea
              value={confirmationNote}
              onChange={(e) => setConfirmationNote(e.target.value)}
              placeholder="Optionale Anmerkung zur Abnahme..."
              className="w-full p-2 border rounded-lg mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="text-gray-600">Abbrechen</button>
              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Wird bestätigt...' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal für Nacharbeit */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Nacharbeit anfordern</h3>
            <p className="mb-4 text-gray-700">Bitte beschreiben Sie die gewünschten Änderungen. Diese werden an die Werkstatt übermittelt.</p>
            <textarea
              value={revisionDescription}
              onChange={(e) => setRevisionDescription(e.target.value)}
              placeholder="Beschreiben Sie hier detailliert die notwendige Nacharbeit..."
              className="w-full p-2 border rounded-lg mb-4"
              rows={5}
              required
            />
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowRevisionModal(false)} className="text-gray-600">Abbrechen</button>
              <button
                onClick={handleRequestRevision}
                disabled={isSubmitting || !revisionDescription.trim()}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Wird gesendet...' : 'Nacharbeit anfordern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}