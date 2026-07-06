import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface BillData {
  bill_no: string;
  date: string;
  payment_type: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  notes?: string;
  due_date?: string;
}

export function generateInvoicePDF(
  bill: BillData,
  contactName: string,
  contactMobile: string,
  contactAddress: string,
  isSale: boolean
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette
  const primaryColor = [99, 102, 241]; // Indigo 500
  const grayDark = [39, 39, 42]; // Zinc 850
  const grayLight = [113, 113, 122]; // Zinc 500

  // 1. Header Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('SHOP ERP INVOICE', 14, 22);

  // Company Details (Top Right)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.text('MY GENERAL STORE INC.', 140, 15);
  doc.text('123 Market Square, Central City', 140, 20);
  doc.text('Mobile: +91 99887 76655', 140, 25);
  doc.text('GSTIN: 27ABCDE1234F1Z1', 140, 30);

  // Separator Line
  doc.setDrawColor(228, 228, 231); // Zinc 200
  doc.line(14, 35, 196, 35);

  // 2. Invoice Meta & Contact Details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(isSale ? 'BILL TO (CUSTOMER):' : 'VENDOR DETAILS:', 14, 43);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(contactName, 14, 49);
  
  doc.setFontSize(9);
  doc.setTextColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.text(`Mobile: ${contactMobile || 'N/A'}`, 14, 54);
  doc.text(`Address: ${contactAddress || 'N/A'}`, 14, 59);

  // Invoice Details (Right Aligned)
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text('INVOICE METRICS:', 140, 43);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Bill Number: ${bill.bill_no}`, 140, 49);
  doc.text(`Date Issued: ${bill.date}`, 140, 54);
  doc.text(`Payment Mode: ${bill.payment_type} (${bill.payment_status})`, 140, 59);

  // 3. Line Items Table using jspdf-autotable
  const tableBody = [
    [
      isSale ? 'Sales Settlement for Counter Goods' : 'Purchase Inbound Stock Order',
      `Rs. ${bill.total_amount.toFixed(2)}`
    ]
  ];

  (doc as any).autoTable({
    startY: 67,
    head: [['Description', 'Amount']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50]
    },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 42, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  // 4. Summary & Totals (Positioned below table)
  const finalY = (doc as any).lastAutoTable.finalY + 12;

  // Notes/Remarks on Left
  if (bill.notes) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text('Notes / Remarks:', 14, finalY);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(grayLight[0], grayLight[1], grayLight[2]);
    const splitNotes = doc.splitTextToSize(bill.notes, 110);
    doc.text(splitNotes, 14, finalY + 5);
  }

  // Totals Box on Right
  const rightColX = 140;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  
  doc.text('Subtotal:', rightColX, finalY);
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rs. ${bill.total_amount.toFixed(2)}`, 196, finalY, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.text('Paid Amount:', rightColX, finalY + 6);
  doc.text(`Rs. ${bill.paid_amount.toFixed(2)}`, 196, finalY + 6, { align: 'right' });

  // Draw a small balance border line
  doc.setDrawColor(228, 228, 231);
  doc.line(rightColX, finalY + 9, 196, finalY + 9);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Balance Due:', rightColX, finalY + 14);
  doc.text(`Rs. ${bill.balance_amount.toFixed(2)}`, 196, finalY + 14, { align: 'right' });

  // Due Date alert for credits
  if (bill.balance_amount > 0 && bill.due_date) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text(`Due Date: ${bill.due_date}`, rightColX, finalY + 20);
  }

  // Save the PDF file
  doc.save(`Invoice_${bill.bill_no}.pdf`);
}
