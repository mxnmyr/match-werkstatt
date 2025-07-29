# File Upload Fix für Rework Status

## Problem
Wenn ein Auftrag zur Überarbeitung zurückgeschickt (werkstatt an kunde) wurde, konnte keine neue Datei hochgeladen werden. Der "Bearbeiten" Button wurde nur für den Status `revision` angezeigt, nicht für `rework`.

## Lösung
In der `ClientDashboard.tsx` wurde die Bedingung für das Anzeigen des Bearbeiten-Buttons erweitert:

### Vorher:
```tsx
{order.status === 'revision' && (
  <button onClick={() => setEditingOrder(order)}>
    Bearbeiten
  </button>
)}
```

### Nachher:
```tsx
{(order.status === 'revision' || order.status === 'rework') && (
  <button onClick={() => setEditingOrder(order)}>
    Bearbeiten
  </button>
)}
```

## Status-Definitionen
- **revision**: Kunde möchte Änderungen am Auftrag vornehmen
- **rework**: Werkstatt schickt Auftrag zur Überarbeitung zurück an Kunde

## Getestete Funktionalitäten
✅ Bearbeiten-Button wird für beide Status angezeigt
✅ File Upload funktioniert in beiden Fällen
✅ Keine weiteren Status-Beschränkungen in EditOrder.tsx gefunden

## Geänderte Dateien
- `src/components/ClientDashboard.tsx` (Zeile 181)

## Test-Szenario
1. Auftrag mit Status `rework` erstellen/setzen
2. Im Client Dashboard sollte der "Bearbeiten" Button sichtbar sein
3. Beim Klick öffnet sich das EditOrder Modal
4. File Upload sollte funktionieren
