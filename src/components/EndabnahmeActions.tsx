import React, { useState } from 'react';

interface EndabnahmeActionsProps {
  onConfirm: (note: string) => void;
  onRequestRevision: (revisionComment: string, newDeadline?: string) => void;
  loading?: boolean;
}

export default function EndabnahmeActions({ onConfirm, onRequestRevision, loading }: EndabnahmeActionsProps) {
  const [note, setNote] = useState('');
  const [revisionComment, setRevisionComment] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  return (
    <div className="flex flex-col gap-4 mt-4 border-t pt-4">
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={() => onConfirm(note)}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors text-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Endabnahme bestätigen
        </button>
        <button
          onClick={() => onRequestRevision(revisionComment, newDeadline)}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition-colors text-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9m0 0C4.582 14.523 9.477 19 15 19c1.657 0 3-1.343 3-3 0-1.657-1.343-3-3-3H9" /></svg>
          Nacharbeit anfordern
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mt-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kommentar zur Endabnahme (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={2}
            placeholder="Kommentar für die Werkstatt ..."
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kommentar zur Nacharbeit</label>
          <textarea
            value={revisionComment}
            onChange={e => setRevisionComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            placeholder="Was soll überarbeitet werden?"
          />
          <label className="block text-xs font-medium text-gray-500 mt-1">Neue Deadline (optional, Format: JJJJ-MM-TT)</label>
          <input
            type="date"
            value={newDeadline}
            onChange={e => setNewDeadline(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mt-1"
          />
        </div>
      </div>
    </div>
  );
}
