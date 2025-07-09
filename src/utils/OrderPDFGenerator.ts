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
    const pdfDoc = await PDFDocument.create();
    
    // Cover Page hinzufügen
    const coverBytes = new Uint8Array(coverPdf.output('arraybuffer'));
    const coverPdfDoc = await PDFDocument.load(coverBytes);
    const coverPages = await pdfDoc.copyPages(coverPdfDoc, coverPdfDoc.getPageIndices());
    coverPages.forEach((page) => pdfDoc.addPage(page));

    // 1. Hauptdokumente des Auftrags hinzufügen
    if (this.options.includeDocuments && this.order.documents && this.order.documents.length > 0) {
      console.log('Merging order documents. Count:', this.order.documents.length);
      
      for (const document of this.order.documents) {
        await this.addDocumentToMergedPDF(pdfDoc, document, 'Auftragsdokument');
      }
    }

    // 2. Bauteil-Zeichnungen hinzufügen (falls gewünscht)
    if (this.options.includeComponents && this.order.components && this.order.components.length > 0) {
      console.log('Merging component documents. Component count:', this.order.components.length);
      
      for (const component of this.order.components) {
        if (component.documents && component.documents.length > 0) {
          console.log(`Processing component "${component.title}" with ${component.documents.length} documents`);
          
          for (const document of component.documents) {
            await this.addDocumentToMergedPDF(pdfDoc, document, `Bauteil: ${component.title}`);
          }
        }
      }
    }

    return pdfDoc.save();
  }

  private async addDocumentToMergedPDF(pdfDoc: PDFDocument, document: any, documentType: string): Promise<void> {
    try {
      console.log(`Processing ${documentType}:`, document.name, 'ID:', document.id);
      const docBuffer = await this.fetchDocumentAsArrayBuffer(document.id);
      console.log('Document buffer size:', docBuffer.byteLength);
      
      const docPdf = await PDFDocument.load(docBuffer);
      const pageCount = docPdf.getPageCount();
      console.log('Document has', pageCount, 'pages');
      
      const pages = await pdfDoc.copyPages(docPdf, docPdf.getPageIndices());
      
      // QR-Code für Header generieren und als PDF-Image vorbereiten
      const qrCodeDataUrl = await this.generateQRCode(this.order.orderNumber || this.order.id);
      let qrCodeImage: any = null;
      
      try {
        // QR-Code als PNG-Bytes konvertieren und in PDF einbetten
        const qrCodeBase64 = qrCodeDataUrl.split(',')[1];
        const qrCodeBytes = Uint8Array.from(atob(qrCodeBase64), c => c.charCodeAt(0));
        qrCodeImage = await pdfDoc.embedPng(qrCodeBytes);
      } catch (qrError) {
        console.warn('Could not embed QR code in component document:', qrError);
      }
      
      pages.forEach((page, index) => {
        console.log(`Adding page ${index + 1} of ${pageCount} from ${document.name} (${documentType})`);
        
        const { width, height } = page.getSize();
        
        // Header-Hintergrund (leicht transparent)
        page.drawRectangle({
          x: 0,
          y: height - 50,
          width: width,
          height: 50,
          color: rgb(0.95, 0.95, 0.95),
          opacity: 0.8
        });
        
        // QR-Code in der rechten Ecke des Headers hinzufügen
        if (qrCodeImage) {
          try {
            page.drawImage(qrCodeImage, {
              x: width - 65,
              y: height - 45,
              width: 40,
              height: 40
            });
          } catch (qrDrawError) {
            console.warn('Could not draw QR code image:', qrDrawError);
          }
        }
        
        // Header-Text links
        page.drawText(`${this.order.title}`, {
          x: 15,
          y: height - 20,
          size: 12,
          color: rgb(0.2, 0.2, 0.2)
        });
        
        page.drawText(`${documentType} | Kunde: ${this.order.clientName} | Nr: ${this.order.orderNumber || this.order.id}`, {
          x: 15,
          y: height - 35,
          size: 10,
          color: rgb(0.4, 0.4, 0.4)
        });
        
        // Trennlinie unter dem Header
        page.drawLine({
          start: { x: 10, y: height - 52 },
          end: { x: width - 10, y: height - 52 },
          thickness: 1,
          color: rgb(0.7, 0.7, 0.7)
        });
        
        pdfDoc.addPage(page);
      });
      
    } catch (error) {
      console.error(`Error processing ${documentType} ${document.name}:`, error);
      // Weitermachen mit dem nächsten Dokument
    }
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
