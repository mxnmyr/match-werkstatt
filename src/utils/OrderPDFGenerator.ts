import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { PDFDocument, rgb } from 'pdf-lib';
import { Order } from '../types';

export interface OrderPrintOptions {
  includeDocuments: boolean;
  includeComponents: boolean;
  includeQRCode: boolean;
}

export class OrderPDFGenerator {
  private order: Order;
  private options: OrderPrintOptions;

  constructor(order: Order, options: OrderPrintOptions = {
    includeDocuments: true,
    includeComponents: true,
    includeQRCode: true
  }) {
    this.order = order;
    this.options = options;
  }

  private async generateQRCode(text: string): Promise<string> {
    try {
      // Generate a full URL for the order that can be opened directly
      const baseUrl = window.location.origin;
      const orderUrl = `${baseUrl}/#/order/${text}`;
      
      // QR-Code mit der vollständigen URL generieren
      const qrCodeDataUrl = await QRCode.toDataURL(orderUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      return qrCodeDataUrl;
    } catch (error) {
      console.error('QR-Code generation failed:', error);
      // Fallback: Einfacher QR-Code mit nur der Auftragsnummer
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 2
      });
    }
  }

  private async createCoverPage(): Promise<jsPDF> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Header mit QR-Code
    if (this.options.includeQRCode) {
      const qrCodeData = await this.generateQRCode(this.order.orderNumber || this.order.id);
      pdf.addImage(qrCodeData, 'PNG', pageWidth - 80, 10, 70, 70);
    }

    // Titel
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('WERKSTATTAUFTRAG', 20, 30);

    // Auftragsnummer
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Auftragsnummer: ${this.order.orderNumber || this.order.id}`, 20, 45);

    // Auftragsdetails
    pdf.setFontSize(12);
    let yPos = 60;
    
    const details = [
      ['Titel:', this.order.title],
      ['Auftraggeber:', this.order.clientName],
      ['Kostenstelle:', this.order.costCenter],
      ['Deadline:', new Date(this.order.deadline).toLocaleDateString('de-DE')],
      ['Priorität:', this.getPriorityText(this.order.priority)],
      ['Status:', this.getStatusText(this.order.status)],
      ['Geschätzte Stunden:', this.order.estimatedHours?.toString() || 'N/A'],
      ['Tatsächliche Stunden:', this.order.actualHours?.toString() || 'N/A'],
      ['Zugewiesen an:', this.order.assignedTo || 'Nicht zugewiesen'],
      ['Erstellt am:', new Date(this.order.createdAt).toLocaleDateString('de-DE')],
    ];

    details.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 70, yPos);
      yPos += 8;
    });

    // Beschreibung
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Beschreibung:', 20, yPos);
    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    
    // Beschreibung umbrechen
    const splitDescription = pdf.splitTextToSize(this.order.description, pageWidth - 40);
    pdf.text(splitDescription, 20, yPos);
    yPos += splitDescription.length * 6;

    // Notizen falls vorhanden
    if (this.order.notes) {
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notizen:', 20, yPos);
      yPos += 8;
      pdf.setFont('helvetica', 'normal');
      const splitNotes = pdf.splitTextToSize(this.order.notes, pageWidth - 40);
      pdf.text(splitNotes, 20, yPos);
      yPos += splitNotes.length * 6;
    }

    // Materialstatus
    yPos += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Materialstatus:', 20, yPos);
    yPos += 8;
    pdf.setFont('helvetica', 'normal');

    const materialStatus = [
      ['Material von Werkstatt bestellt:', this.order.materialOrderedByWorkshop ? 'Ja' : 'Nein'],
      ['Material vom Kunden bestellt:', this.order.materialOrderedByClient ? 'Ja' : 'Nein'],
      ['Kundenbestellung bestätigt:', this.order.materialOrderedByClientConfirmed ? 'Ja' : 'Nein'],
      ['Material verfügbar:', this.order.materialAvailable ? 'Ja' : 'Nein']
    ];

    materialStatus.forEach(([label, value]) => {
      pdf.text(`${label} ${value}`, 25, yPos);
      yPos += 6;
    });

    // Komponenten falls vorhanden
    if (this.order.components && this.order.components.length > 0) {
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Komponenten:', 20, yPos);
      yPos += 8;
      pdf.setFont('helvetica', 'normal');

      this.order.components.forEach((component, index) => {
        pdf.text(`${index + 1}. ${component.title}`, 25, yPos);
        yPos += 6;
        if (component.description) {
          const splitDesc = pdf.splitTextToSize(component.description, pageWidth - 50);
          pdf.text(splitDesc, 30, yPos);
          yPos += splitDesc.length * 5;
        }
        yPos += 3;
      });
    }

    // SubTasks falls vorhanden
    if (this.order.subTasks && Array.isArray(this.order.subTasks) && this.order.subTasks.length > 0) {
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Teilaufgaben:', 20, yPos);
      yPos += 8;
      pdf.setFont('helvetica', 'normal');

      this.order.subTasks.forEach((task: any, index: number) => {
        pdf.text(`${index + 1}. ${task.title}`, 25, yPos);
        yPos += 6;
        if (task.description) {
          const splitDesc = pdf.splitTextToSize(task.description, pageWidth - 50);
          pdf.text(splitDesc, 30, yPos);
          yPos += splitDesc.length * 5;
        }
        if (task.estimatedHours) {
          pdf.text(`Geschätzte Stunden: ${task.estimatedHours}`, 30, yPos);
          yPos += 6;
        }
        yPos += 3;
      });
    }

    // Footer mit Auftragsnummer und QR-Code
    if (this.options.includeQRCode) {
      const footerY = pageHeight - 30;
      pdf.setFontSize(10);
      pdf.text(`Auftrag: ${this.order.orderNumber || this.order.id} | ${this.order.clientName}`, 20, footerY);
      
      const smallQRCodeData = await this.generateQRCode(this.order.orderNumber || this.order.id);
      pdf.addImage(smallQRCodeData, 'PNG', pageWidth - 35, footerY - 25, 25, 25);
    }

    return pdf;
  }

  private async fetchDocumentAsArrayBuffer(documentId: string): Promise<ArrayBuffer> {
    const response = await fetch(`http://localhost:3001/api/documents/${documentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch document ${documentId}: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }

  private async mergeDocuments(coverPdf: jsPDF): Promise<Uint8Array> {
    if (!this.options.includeDocuments || !this.order.documents || this.order.documents.length === 0) {
      return new Uint8Array(coverPdf.output('arraybuffer'));
    }

    console.log('Merging documents. Document count:', this.order.documents.length);

    const pdfDoc = await PDFDocument.create();
    
    // Cover Page hinzufügen
    const coverBytes = new Uint8Array(coverPdf.output('arraybuffer'));
    const coverPdfDoc = await PDFDocument.load(coverBytes);
    const coverPages = await pdfDoc.copyPages(coverPdfDoc, coverPdfDoc.getPageIndices());
    coverPages.forEach((page) => pdfDoc.addPage(page));

    // Angehängte PDFs hinzufügen
    for (const document of this.order.documents) {
      try {
        console.log('Processing document:', document.name, 'ID:', document.id);
        const docBuffer = await this.fetchDocumentAsArrayBuffer(document.id);
        console.log('Document buffer size:', docBuffer.byteLength);
        
        const docPdf = await PDFDocument.load(docBuffer);
        const pageCount = docPdf.getPageCount();
        console.log('Document has', pageCount, 'pages');
        
        const pages = await pdfDoc.copyPages(docPdf, docPdf.getPageIndices());
        
        pages.forEach((page, index) => {
          console.log(`Adding page ${index + 1} of ${pageCount} from ${document.name}`);
          
          // Einfacher Header ohne komplexe Zeichnungen
          const { width, height } = page.getSize();
          
          // Header-Text hinzufügen
          page.drawText(`${this.order.title} | ${this.order.clientName} | ${this.order.orderNumber || this.order.id}`, {
            x: 20,
            y: height - 25,
            size: 10,
            color: rgb(0.3, 0.3, 0.3)
          });
          
          // Trennlinie
          page.drawLine({
            start: { x: 20, y: height - 30 },
            end: { x: width - 20, y: height - 30 },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });
          
          pdfDoc.addPage(page);
        });
      } catch (error) {
        console.error(`Error merging document ${document.name}:`, error);
        // Füge eine Fehlerseite hinzu
        const errorPage = pdfDoc.addPage();
        errorPage.drawText(`Fehler beim Laden von: ${document.name}`, {
          x: 50,
          y: 700,
          size: 14,
          color: rgb(1, 0, 0)
        });
        const errorMessage = error instanceof Error ? error.message : String(error);
        errorPage.drawText(`Error: ${errorMessage}`, {
          x: 50,
          y: 680,
          size: 10,
          color: rgb(0.5, 0, 0)
        });
      }
    }

    return await pdfDoc.save();
  }

  public async generatePDF(): Promise<Blob> {
    try {
      const coverPdf = await this.createCoverPage();
      const finalPdfBytes = await this.mergeDocuments(coverPdf);
      
      return new Blob([finalPdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  private getPriorityText(priority: string): string {
    switch (priority) {
      case 'low': return 'Niedrig';
      case 'medium': return 'Mittel';
      case 'high': return 'Hoch';
      case 'urgent': return 'Dringend';
      default: return priority;
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'accepted': return 'Angenommen';
      case 'in_progress': return 'In Bearbeitung';
      case 'revision': return 'Überarbeitung';
      case 'rework': return 'Nacharbeit';
      case 'completed': return 'Abgeschlossen';
      case 'archived': return 'Archiviert';
      default: return status;
    }
  }
}

export default OrderPDFGenerator;
