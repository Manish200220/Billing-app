import React from 'react';

const Invoice = ({ invoice, companyName = "Your Business Name", companyEmail = "", companyPhone = "", companyAddress = "" }) => {
  const currentDate = new Date();
  const issueDate = invoice?.date ? new Date(invoice.date) : currentDate;
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 15); // 15 days from issue date

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const subtotal = invoice?.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;
  const totalBV = invoice?.items?.reduce((sum, item) => sum + ((item.bv || 0) * item.qty), 0) || 0;
  const total = subtotal; // No tax

  return (
    <div style={styles.invoiceContainer}>
      {/* Header Section */}
      <div style={styles.header}>
        <div style={styles.businessInfo}>
          <div style={styles.businessName}>{companyName}</div>
          {companyAddress && <div style={styles.businessAddress}>{companyAddress}</div>}
          <div style={styles.businessContacts}>
            {companyPhone && <span style={styles.contactItem}>📞 {companyPhone}</span>}
            {companyEmail && <span style={{ ...styles.contactItem, marginLeft: 12 }}>✉️ {companyEmail}</span>}
          </div>
        </div>
        <div style={styles.invoiceTitle}>
          <div style={styles.invoiceTitleText}>INVOICE</div>
          <div style={styles.invoiceNumber}># {invoice?.id || 'INV-000011'}</div>
          <div style={styles.balanceDue}>
            <div style={styles.balanceDueLabel}>Balance </div>
            <div style={styles.balanceDueAmount}>{formatCurrency(total)}</div>
          </div>
        </div>
      </div>

      {/* Bill To and Invoice Details */}
      <div style={styles.detailsSection}>
        <div style={styles.billTo}>
          <div style={styles.billToLabel}>Bill To</div>
          <div style={styles.clientName}>{invoice?.customer?.name || 'Customer Name'}</div>
          {invoice?.customer?.phone && <div style={styles.clientAddress}>Phone: {invoice.customer.phone}</div>}
          <div style={styles.clientAddress}>{invoice?.customer?.address || 'Customer Address'}</div>
        </div>
        <div style={styles.invoiceDetails}>
          <div style={styles.detailRow}>
            <span>Invoice Date :</span>
            <span style={styles.detailValue}>{formatDate(issueDate)}</span>
          </div>
          <div style={styles.detailRow}>
            <span>Terms :</span>
            <span style={styles.detailValue}>Due on Receipt</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={styles.tableContainer}>
        <table style={styles.itemsTable}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>S.no</th>
              <th style={styles.tableHeaderCellDesc}>Item & Description</th>
              <th style={styles.tableHeaderCellQty}>Qty</th>
              <th style={styles.tableHeaderCellPrice}>MRP</th>
              <th style={styles.tableHeaderCellPrice}>Rate (DP)</th>
              <th style={styles.tableHeaderCellAmount}>Amount</th>
              <th style={styles.tableHeaderCellQty}>BV</th>
            </tr>
          </thead>
          <tbody>
            {invoice?.items?.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={index} style={styles.tableRow}>
                  <td style={styles.tableCell}>{index + 1}</td>
                  <td style={styles.tableCellDesc}>
                    <div style={styles.itemName}>{item.name}</div>
                  </td>
                  <td style={styles.tableCellQty}>{item.qty}</td>
                  <td style={styles.tableCellPrice}>{formatCurrency(item.mrp ?? Math.round((item.price/0.9) * 100)/100)}</td>
                  <td style={styles.tableCellPrice}>{formatCurrency(item.price)}</td>
                  <td style={styles.tableCellAmount}>{formatCurrency(item.qty * item.price)}</td>
                  <td style={styles.tableCellQty}>{(item.bv || 0) * item.qty}</td>
                </tr>
              ))
            ) : (
              <tr style={styles.tableRow}>
                <td style={styles.tableCell} colSpan={7}>No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div style={styles.totalsSection}>
        <div style={styles.totalsContainer}>
          <div style={styles.totalRow}>
            <span>Sub Total</span>
            <span style={styles.totalAmount}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={styles.totalRow}>
            <span>Total BV</span>
            <span style={styles.totalAmount}>{totalBV}</span>
          </div>
          <div style={styles.totalRowFinal}>
            <span style={styles.totalLabel}>Total</span>
            <span style={styles.totalAmountFinal}>{formatCurrency(total)}</span>
          </div>
          <div style={styles.balanceDueRow}>
            <span style={styles.balanceDueLabel}>Balance </span>
            <span style={styles.balanceDueAmount}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes and Terms */}
     {/*  <div style={styles.notesSection}>
        <div style={styles.notesContainer}>
          <div style={styles.notesTitle}>Notes</div>
          <div style={styles.notesContent}>Thanks for your business.</div>
        </div>
        <div style={styles.termsContainer}>
          <div style={styles.termsTitle}>Terms & Conditions</div>
          <div style={styles.termsContent}>All services provided are subject to the terms and conditions outlined in the agreement or engagement letter.</div>
        </div>
      </div> */}

      {/* Company details footer - pinned at bottom, horizontally spaced */}
      <div style={styles.companyFooter}>
        <div style={styles.footerItem}>{companyName}</div>
        {companyPhone ? <div style={styles.footerItem}>📞 {companyPhone}</div> : <div style={styles.footerItem}></div>}
        {companyEmail ? <div style={styles.footerItem}>✉️ {companyEmail}</div> : <div style={styles.footerItem}></div>}
        <div style={{ ...styles.footerItem, maxWidth: '40%' }}>{companyAddress}</div>
      </div>
    </div>
  );
};

const styles = {
  invoiceContainer: {
    width: '210mm',
    minHeight: '297mm',
    margin: '0 auto',
    padding: '20mm',
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#333333',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px'
  },
  businessInfo: {
    flex: 1
  },
  businessName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '8px'
  },
  businessAddress: {
    fontSize: '12px',
    color: '#333333',
    lineHeight: '1.3'
  },
  invoiceTitle: {
    textAlign: 'right',
    flex: 1
  },
  invoiceTitleText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '8px'
  },
  invoiceNumber: {
    fontSize: '14px',
    color: '#333333',
    marginBottom: '15px'
  },
  balanceDue: {
    textAlign: 'right'
  },
  balanceDueLabel: {
    fontSize: '12px',
    color: '#333333',
    marginBottom: '5px'
  },
  balanceDueAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333'
  },
  detailsSection: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '30px'
  },
  billTo: {
    flex: 1
  },
  billToLabel: {
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: '8px',
    fontSize: '12px'
  },
  clientName: {
    fontWeight: 'bold',
    fontSize: '14px',
    marginBottom: '4px',
    color: '#333333'
  },
  clientAddress: {
    fontSize: '12px',
    color: '#333333',
    marginBottom: '2px',
    lineHeight: '1.3'
  },
  invoiceDetails: {
    textAlign: 'right',
    flex: 0.6,
    minWidth: '200px'
  },
  detailRow: {
    marginBottom: '8px',
    fontSize: '12px'
  },
  detailValue: {
    fontWeight: 'bold',
    marginLeft: '10px'
  },
  tableContainer: {
    marginBottom: '20px'
  },
  itemsTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#1e3a8a',
    color: 'white'
  },
  tableHeaderCell: {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: 'bold',
    border: 'none',
    fontSize: '12px'
  },
  tableHeaderCellDesc: {
    padding: '12px 8px',
    textAlign: 'left',
    fontWeight: 'bold',
    border: 'none',
    fontSize: '12px'
  },
  tableHeaderCellQty: {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: 'bold',
    border: 'none',
    fontSize: '12px'
  },
  tableHeaderCellPrice: {
    padding: '12px 8px',
    textAlign: 'right',
    fontWeight: 'bold',
    border: 'none',
    fontSize: '12px'
  },
  tableHeaderCellAmount: {
    padding: '12px 8px',
    textAlign: 'right',
    fontWeight: 'bold',
    border: 'none',
    fontSize: '12px'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  tableCell: {
    padding: '12px 8px',
    border: 'none',
    textAlign: 'center',
    fontSize: '13px'
  },
  tableCellDesc: {
    padding: '12px 8px',
    border: 'none',
    textAlign: 'left',
    fontSize: '13px'
  },
  tableCellQty: {
    padding: '12px 8px',
    textAlign: 'center',
    border: 'none',
    fontSize: '13px'
  },
  tableCellPrice: {
    padding: '12px 8px',
    textAlign: 'right',
    border: 'none',
    fontSize: '13px'
  },
  tableCellAmount: {
    padding: '12px 8px',
    textAlign: 'right',
    border: 'none',
    fontSize: '13px'
  },
  itemName: {
    fontWeight: 'bold',
    marginBottom: '4px',
    color: '#333333'
  },
  itemDescription: {
    fontSize: '11px',
    color: '#666666',
    lineHeight: '1.3'
  },
  qtyNumber: {
    fontWeight: 'bold',
    marginBottom: '2px'
  },
  qtyLabel: {
    fontSize: '10px',
    color: '#666666'
  },
  totalsSection: {
    marginBottom: '30px'
  },
  totalsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '250px',
    fontSize: '12px'
  },
  totalRowFinal: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '250px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '8px',
    marginTop: '8px',
    fontSize: '12px'
  },
  totalLabel: {
    fontWeight: 'bold'
  },
  totalAmount: {
    fontWeight: 'bold'
  },
  totalAmountFinal: {
    fontWeight: 'bold',
    fontSize: '14px'
  },
  balanceDueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '250px',
    backgroundColor: '#1e3a8a',
    color: 'white',
    padding: '12px',
    marginTop: '10px',
    fontSize: '12px'
  },
  balanceDueLabel: {
    fontWeight: 'bold'
  },
  balanceDueAmount: {
    fontWeight: 'bold',
    fontSize: '14px'
  },
  notesSection: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '30px'
  },
  notesContainer: {
    flex: 1,
    marginRight: '20px'
  },
  notesTitle: {
    fontWeight: 'bold',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#333333'
  },
  notesContent: {
    fontSize: '12px',
    color: '#333333'
  },
  termsContainer: {
    flex: 2
  },
  termsTitle: {
    fontWeight: 'bold',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#333333'
  },
  termsContent: {
    fontSize: '12px',
    color: '#333333',
    lineHeight: '1.4'
  },
  companyFooter: {
    marginTop: 'auto',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  footerItem: {
    flex: 1,
    textAlign: 'center',
    fontSize: '11px',
    color: '#333333'
  }
};

export default Invoice;
