import React, { useState } from 'react';
import { Calendar, Clock, User, Eye, Filter, Search, Settings, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import WorkshopOrderDetails from './WorkshopOrderDetails';
import AccountManagement from './AccountManagement';
import ArchiveView from './ArchiveView';
import { Order } from '../types';

export default function WorkshopDashboard() {
  const { state } = useApp();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'assigned'>('all');
  const [showArchive, setShowArchive] = useState(false);

  // Filter orders based on user role and view mode
  const getFilteredOrders = () => {
    let orders = state.orders.filter(order =>
      typeof order.status === 'string' && order.status.trim().toLowerCase() !== 'archived'
    );
    
    if (viewMode === 'assigned' && state.currentUser?.role === 'workshop') {
      // Show orders assigned to current user or their subtasks
      orders = orders.filter(order => 
        order.assignedTo === state.currentUser?.id ||
        order.subTasks.some(subTask => subTask.assignedTo === state.currentUser?.id)
      );
    }
    
    return orders;
  };

  const activeOrders = getFilteredOrders();
  
  // Sort orders by deadline priority
  const sortedOrders = [...activeOrders].sort((a, b) => {
    // First by deadline
    const deadlineA = new Date(a.deadline).getTime();
    const deadlineB = new Date(b.deadline).getTime();
    return deadlineA - deadlineB;
  });

  const filteredOrders = sortedOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Get user's assigned subtasks
  const getMySubTasks = () => {
    if (state.currentUser?.role !== 'workshop') return [];
    
    const mySubTasks: Array<{order: Order, subTask: any}> = [];
    state.orders.forEach(order => {
      order.subTasks.forEach(subTask => {
        if (subTask.assignedTo === state.currentUser?.id && subTask.status !== 'completed') {
          mySubTasks.push({ order, subTask });
        }
      });
    });
    return mySubTasks;
  };

  const mySubTasks = getMySubTasks();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'revision': return 'bg-orange-100 text-orange-800';
      case 'rework': return 'bg-red-100 text-red-800'; // Nacharbeit
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
      case 'rework': return 'Nacharbeit'; // Nacharbeit
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return priority;
    }
  };

  const isOverdue = (deadline: Date) => {
    return new Date(deadline) < new Date();
  };

  // Create a flattened list for display with subtasks indented
  const createDisplayList = () => {
    const displayItems: Array<{
      type: 'order' | 'subtask';
      order: Order;
      subTask?: any;
      isIndented?: boolean;
    }> = [];

    filteredOrders.forEach(order => {
      displayItems.push({ type: 'order', order });
      
      // Add subtasks for this order if user has access
      if (state.currentUser?.role === 'admin' || 
          order.assignedTo === state.currentUser?.id ||
          order.subTasks.some(st => st.assignedTo === state.currentUser?.id)) {
        
        order.subTasks.forEach(subTask => {
          if (state.currentUser?.role === 'admin' || 
              subTask.assignedTo === state.currentUser?.id ||
              order.assignedTo === state.currentUser?.id) {
            displayItems.push({ 
              type: 'subtask', 
              order, 
              subTask, 
              isIndented: true 
            });
          }
        });
      }
    });

    return displayItems;
  };

  const displayItems = createDisplayList();

  if (showAccountManagement) {
    return <AccountManagement onClose={() => setShowAccountManagement(false)} />;
  }

  if (showArchive) {
    return <ArchiveView onClose={() => setShowArchive(false)} />;
  }

  if (selectedOrder) {
    return <WorkshopOrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Werkstattaufträge</h2>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Werkstattaufträge</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchive(true)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
          >
            Archiv
          </button>
          {state.currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowAccountManagement(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Benutzerverwaltung
            </button>
          )}
        </div>
      </div>

      {/* My Subtasks Section for Workshop Users */}
      {state.currentUser?.role === 'workshop' && mySubTasks.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meine Unteraufgaben</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mySubTasks.map(({ order, subTask }) => (
              <div key={subTask.id} className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{subTask.title}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subTask.status)}`}>
                    {getStatusText(subTask.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{subTask.description}</p>
                <div className="text-xs text-gray-500 mb-2">
                  Hauptauftrag: {order.title}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{subTask.estimatedHours}h geschätzt</span>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Öffnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Auftrag oder Auftraggeber suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle Status</option>
                <option value="pending">Ausstehend</option>
                <option value="accepted">Angenommen</option>
                <option value="in_progress">In Bearbeitung</option>
                <option value="revision">Überarbeitung</option>
                <option value="rework">Nacharbeit</option>
                <option value="completed">Abgeschlossen</option>
              </select>
              {state.currentUser?.role === 'workshop' && (
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'all' | 'assigned')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Alle Aufträge</option>
                  <option value="assigned">Meine Aufträge</option>
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auftrag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auftraggeber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priorität
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zugewiesen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zeit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayItems.map((item, index) => {
                if (item.type === 'order') {
                  const order = item.order;
                  return (
                    <tr key={`order-${order.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{order.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.clientName}</div>
                        <div className="text-sm text-gray-500">{order.costCenter}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isOverdue(order.deadline) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {new Date(order.deadline).toLocaleDateString('de-DE')}
                        </div>
                        {isOverdue(order.deadline) && (
                          <div className="text-xs text-red-600">Überfällig</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(order.priority)}`}>
                          {getPriorityText(order.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.assignedTo ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-900">
                              {state.workshopAccounts.find(acc => acc.id === order.assignedTo)?.name || 'Unbekannt'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Nicht zugewiesen</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="w-4 h-4 text-gray-400 mr-1" />
                          {order.estimatedHours}h
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Anzeigen
                        </button>
                      </td>
                    </tr>
                  );
                } else {
                  // Subtask row
                  const { order, subTask } = item;
                  return (
                    <tr key={`subtask-${subTask.id}`} className="hover:bg-blue-50 bg-blue-25">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ChevronRight className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-blue-800">{subTask.title}</div>
                            <div className="text-sm text-blue-600 truncate max-w-xs">{subTask.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">↳ Unteraufgabe</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">-</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subTask.status)}`}>
                          {getStatusText(subTask.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">-</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {subTask.assignedTo ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-900">
                              {state.workshopAccounts.find(acc => acc.id === subTask.assignedTo)?.name || 'Unbekannt'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Nicht zugewiesen</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="w-4 h-4 text-gray-400 mr-1" />
                          {subTask.estimatedHours}h
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Anzeigen
                        </button>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {displayItems.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Aufträge gefunden</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Keine Aufträge entsprechen Ihren Filterkriterien'
                : 'Aktuell sind keine Aufträge vorhanden'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}