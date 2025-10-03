import React, { useEffect, useRef, useState } from "react";
import Invoice from "./Invoice";

// Billing App — fixed full JSX and working Invoice History viewer
// Features included:
// - Products with category, price and stock
// - Add / Purchase / Delete product
// - Create invoice from cart, finalize (autosave + auto-download JSON + auto-generate PDF)
// - Invoices are stored in localStorage
// - Invoice history with one-click View (modal) and per-invoice JSON/PDF download
// - Small pure-function tests and a "Run tests" button

export default function BillingApp() {
  const COMPANY_NAME = "RKGROWOPAL MARKETINGS PVT. LTD.";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formProd, setFormProd] = useState({ name: "", category: "", mrp: "", bv: "", stock: "" });

  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", address: "", phone: "" });
  const [paid, setPaid] = useState(0);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [useMRP, setUseMRP] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const invoiceRef = useRef(null);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const selectedInvoiceRef = useRef(null); // for PDF generation of selected invoice

  const [filterCategory, setFilterCategory] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [isExportingBulk, setIsExportingBulk] = useState(false);

  const COMPANY_EMAIL = "rkgrowopal@gmail.com";
  const COMPANY_PHONE = "+91 74287 11520";
  const COMPANY_ADDRESS = "Block-B3,Near Punjab National Bank Road Mukund Vihar,Prakash Vihar,karawal Nagar,Delhi-11009, New Delhi, Delhi 110090";

  // Load persisted state
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('rk_products') || '[]');
      const inv = JSON.parse(localStorage.getItem('rk_invoices') || '[]');
      setProducts(p);
      setInvoices(inv);
      const cats = Array.from(new Set(p.map(x => x.category).filter(Boolean)));
      setCategories(cats);
    } catch (e) { console.error('load error', e); }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('rk_products', JSON.stringify(products)); } catch (e) { console.error(e); }
    const cats = Array.from(new Set(products.map(x => x.category).filter(Boolean)));
    setCategories(cats);
  }, [products]);

  useEffect(() => {
    try { localStorage.setItem('rk_invoices', JSON.stringify(invoices)); } catch (e) { console.error(e); }
  }, [invoices]);

  // Product management
  function addProduct(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (formProd.name || "").trim();
    const category = (formProd.category || "").trim();
    const mrp = Number(formProd.mrp);
    const bv = Number(formProd.bv) || 0;
    const stock = parseInt(formProd.stock) || 0;
    if (!name) return alert('Enter product name');
    if (!Number.isFinite(mrp) || mrp < 0) return alert('Enter valid MRP');
    const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const price = Math.round(mrp * 0.9 * 100) / 100; // DP = 10% discount on MRP
    const next = [...products, { id, name, category, mrp, bv, price, stock }];
    setProducts(next);
    setFormProd({ name: "", category: "", mrp: "", bv: "", stock: "" });
  }

  function updateStock(id, delta) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
  }

  function deleteProduct(id) {
    if (!confirm('Delete product?')) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    setCart(prev => prev.filter(c => c.productId !== id));
  }

  // Cart management
  function addToCart(productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return alert('Product not found');
    if (p.stock <= 0) return alert('Out of stock');
    updateStock(productId, -1);
    setCart(prev => {
      const found = prev.find(x => x.productId === productId);
      if (found) return prev.map(x => x.productId === productId ? { ...x, qty: x.qty + 1 } : x);
      const mrp = Number(p.mrp ?? ((p.price ? (Number(p.price) / 0.9) : 0)));
      return [...prev, { productId, name: p.name, category: p.category, price: p.price, mrp, bv: p.bv || 0, qty: 1 }];
    });
  }

  function changeQty(productId, qty) {
    qty = Math.max(0, parseInt(qty) || 0);
    const item = cart.find(c => c.productId === productId);
    if (!item) return;
    const delta = qty - item.qty;
    if (delta > 0) {
      const prod = products.find(p => p.id === productId);
      if (!prod || prod.stock < delta) return alert('Not enough stock');
      updateStock(productId, -delta);
    } else if (delta < 0) {
      updateStock(productId, -delta);
    }
    setCart(prev => prev.map(c => c.productId === productId ? { ...c, qty } : c));
  }

  function removeFromCart(productId) {
    const item = cart.find(c => c.productId === productId);
    if (!item) return;
    updateStock(productId, item.qty);
    setCart(prev => prev.filter(c => c.productId !== productId));
  }

  function subtotal(c = cart) {
    return c.reduce((s, i) => s + (i.qty * (useMRP ? i.mrp : i.price)), 0);
  }

  // Finalize invoice
  async function finalizeInvoice(autoDownload = true) {
    if (isFinalizing) return; // Prevent multiple submissions
    if (cart.length === 0) return alert('Cart is empty');
    
    setIsFinalizing(true);
    const invNumber = 'INV-' + new Date().getTime().toString().slice(-8);
    const invoice = {
      id: invNumber,
      date: new Date(invoiceDate).toISOString(),
      customer: { ...customer },
      items: cart.map(c => ({ productId: c.productId, name: c.name, qty: c.qty, price: c.price })),
      subtotal: subtotal(),
      paid: Number(paid || 0),
      balance: subtotal() - Number(paid || 0)
    };

    setInvoices(prev => [invoice, ...prev]);

    // Auto-download JSON
    try {
      if (autoDownload) {
        const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.id}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e) { console.error('JSON download failed', e); }

    // Generate PDF of invoice preview area (invoiceRef)
    try {
      if (invoiceRef.current) {
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule && (html2canvasModule.default || html2canvasModule);
        const jspdfModule = await import('jspdf');
        const jsPDF = jspdfModule && (jspdfModule.jsPDF || jspdfModule.default || jspdfModule);
        if (html2canvas && jsPDF) {
          const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
          const imgProps = pdf.getImageProperties(imgData);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const scale = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
          const renderWidth = imgProps.width * scale;
          const renderHeight = imgProps.height * scale;
          const x = (pageWidth - renderWidth) / 2;
          const y = (pageHeight - renderHeight) / 2;
          pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
          pdf.save(`${invoice.id}.pdf`);
        }
      }
    } catch (err) { console.error('PDF generation error', err); }

    // Clear current cart and customer
    setCart([]);
    setCustomer({ name: '', address: '', phone: '' });
    setPaid(0);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setIsFinalizing(false);

    alert('Invoice finalized and saved.');
  }

  function exportBackup() {
    try {
      const blobP = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
      const urlP = URL.createObjectURL(blobP);
      const a = document.createElement('a'); a.href = urlP; a.download = `products_${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlP);

      const blobI = new Blob([JSON.stringify(invoices, null, 2)], { type: 'application/json' });
      const urlI = URL.createObjectURL(blobI);
      const b = document.createElement('a'); b.href = urlI; b.download = `invoices_${Date.now()}.json`; document.body.appendChild(b); b.click(); b.remove(); URL.revokeObjectURL(urlI);
    } catch (e) { console.error(e); }
  }

  // Calculate summary statistics
  function getInvoiceSummary() {
    const totalBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const totalProductsSold = invoices.reduce((sum, inv) => 
      sum + (inv.items?.reduce((itemSum, item) => itemSum + item.qty, 0) || 0), 0
    );
    const totalInvoices = invoices.length;
    return { totalBalance, totalProductsSold, totalInvoices };
  }

  // Bulk PDF export function
  async function exportAllInvoicesPDF() {
    if (invoices.length === 0) return alert('No invoices to export');
    if (isExportingBulk) return;
    
    setIsExportingBulk(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (let i = 0; i < invoices.length; i++) {
        const invoice = invoices[i];
        // Create a temporary div for PDF generation
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);
        
        // Render invoice in temp div
        const { createElement } = await import('react');
        const { createRoot } = await import('react-dom/client');
        const InvoiceComponent = (await import('./Invoice')).default;
        
        const root = createRoot(tempDiv);
        root.render(createElement(InvoiceComponent, {
          invoice: invoice,
          companyName: COMPANY_NAME,
          companyEmail: COMPANY_EMAIL,
          companyPhone: COMPANY_PHONE,
          companyAddress: COMPANY_ADDRESS
        }));
        
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Generate PDF
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule && (html2canvasModule.default || html2canvasModule);
        const jspdfModule = await import('jspdf');
        const jsPDF = jspdfModule && (jspdfModule.jsPDF || jspdfModule.default || jspdfModule);
        
        if (html2canvas && jsPDF) {
          const canvas = await html2canvas(tempDiv, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
          const imgProps = pdf.getImageProperties(imgData);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const scale = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
          const renderWidth = imgProps.width * scale;
          const renderHeight = imgProps.height * scale;
          const x = (pageWidth - renderWidth) / 2;
          const y = (pageHeight - renderHeight) / 2;
          pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
          
          // Add PDF to zip
          const pdfBlob = pdf.output('blob');
          zip.file(`${invoice.id}.pdf`, pdfBlob);
        }
        
        // Cleanup
        root.unmount();
        document.body.removeChild(tempDiv);
      }
      
      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_invoices_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      alert('All invoices exported as ZIP file!');
    } catch (err) {
      console.error('Bulk export error:', err);
      alert('Error exporting invoices. Please try again.');
    } finally {
      setIsExportingBulk(false);
    }
  }

  // View invoice (single-click)
  function viewInvoice(inv) {
    setSelectedInvoice(inv);
    // wait for modal to render then we can generate PDF if user requests
  }

  function closeInvoiceViewer() {

    setSelectedInvoice(null);
  }

  async function downloadInvoiceJSON(inv) {
    try {
      const blob = new Blob([JSON.stringify(inv, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${inv.id}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  }

  async function downloadInvoicePDF(inv) {
    // Render selected invoice details inside a hidden ref (selectedInvoiceRef) and generate PDF
    if (!selectedInvoiceRef.current) {
      // If the viewer isn't open, open it first and then the user can click download inside the viewer.
      alert('Please open the invoice viewer and then click "Download PDF" inside it.');
      return;
    }
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule && (html2canvasModule.default || html2canvasModule);
      const jspdfModule = await import('jspdf');
      const jsPDF = jspdfModule && (jspdfModule.jsPDF || jspdfModule.default || jspdfModule);
      if (html2canvas && jsPDF) {
        const canvas = await html2canvas(selectedInvoiceRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const imgProps = pdf.getImageProperties(imgData);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const scale = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
        const renderWidth = imgProps.width * scale;
        const renderHeight = imgProps.height * scale;
        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;
        pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
        pdf.save(`${inv.id}.pdf`);
      }
    } catch (err) { console.error('PDF generation error', err); }
  }

  // --- Pure helper functions for tests ---
  function pureAddToCart(productsArr, cartArr, productId) {
    const p = productsArr.find(x => x.id === productId); 
    if (!p) throw new Error('product-not-found');
    if (p.stock <= 0) throw new Error('out-of-stock');
    const newProducts = productsArr.map(x => x.id === productId ? { ...x, stock: x.stock - 1 } : x);
    const found = cartArr.find(c => c.productId === productId);
    const newCart = found ? cartArr.map(c => c.productId === productId ? { ...c, qty: c.qty + 1 } : c) : [...cartArr, { productId, name: p.name, price: p.price, qty: 1 }];
    return { products: newProducts, cart: newCart };
  }

  function pureChangeQty(productsArr, cartArr, productId, qty) {
    qty = Math.max(0, parseInt(qty) || 0);
    const item = cartArr.find(c => c.productId === productId);
    if (!item) throw new Error('item-not-in-cart');
    const delta = qty - item.qty;
    if (delta > 0) {
      const prod = productsArr.find(p => p.id === productId);
      if (!prod || prod.stock < delta) throw new Error('not-enough-stock');
      const newProducts = productsArr.map(p => p.id === productId ? { ...p, stock: p.stock - delta } : p);
      const newCart = cartArr.map(c => c.productId === productId ? { ...c, qty } : c);
      return { products: newProducts, cart: newCart };
    } else if (delta < 0) {
      const newProducts = productsArr.map(p => p.id === productId ? { ...p, stock: p.stock + (-delta) } : p);
      const newCart = cartArr.map(c => c.productId === productId ? { ...c, qty } : c);
      return { products: newProducts, cart: newCart };
    }
    return { products: productsArr, cart: cartArr };
  }

  function runTests() {
    const results = [];
    try {
      const p0 = [{ id: 1, name: 'X', price: 100, stock: 2 }];
      const c0 = [];
      const step1 = pureAddToCart(p0, c0, 1);
      results.push({ test: 'add once', pass: step1.products[0].stock === 1 && step1.cart.length === 1 && step1.cart[0].qty === 1 });
      const step2 = pureAddToCart(step1.products, step1.cart, 1);
      results.push({ test: 'add twice', pass: step2.products[0].stock === 0 && step2.cart[0].qty === 2 });
      try {
        pureAddToCart(step2.products, step2.cart, 1);
        results.push({ test: 'add third time should fail', pass: false });
      } catch (err) { results.push({ test: 'add third time should fail', pass: err.message === 'out-of-stock' }); }
      const step3 = pureChangeQty(step2.products, step2.cart, 1, 1);
      results.push({ test: 'change qty down', pass: step3.products[0].stock === 1 && step3.cart[0].qty === 1 });
      const step4 = pureChangeQty(step3.products, step3.cart, 1, 2);
      results.push({ test: 'change qty up', pass: step4.products[0].stock === 0 && step4.cart[0].qty === 2 });
    } catch (err) { results.push({ test: 'unexpected error', pass: false, error: String(err) }); }
    setTestResults(results);
  }

  // --- Render UI ---
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.company}>{COMPANY_NAME}</h1>
          <div style={styles.subtitle}>Billing · Inventory · Categories · Auto-PDF · Auto-Save</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button style={styles.btnPrimary} onClick={() => exportBackup()}>Export Backup</button>
          <button style={{ ...styles.btn, marginLeft: 8 }} onClick={() => runTests()}>Run tests</button>
        </div>
      </header>

      <main style={styles.grid}>
        <section style={styles.card}>
          <h3>Products</h3>
          <form onSubmit={addProduct} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <input placeholder="Name" value={formProd.name} onChange={e => setFormProd(s => ({ ...s, name: e.target.value }))} style={styles.input} />
            <input placeholder="Category" value={formProd.category} onChange={e => setFormProd(s => ({ ...s, category: e.target.value }))} style={styles.input} />
            <input placeholder="MRP" value={formProd.mrp} onChange={e => setFormProd(s => ({ ...s, mrp: e.target.value }))} style={styles.input} />
            <input placeholder="BV" value={formProd.bv} onChange={e => setFormProd(s => ({ ...s, bv: e.target.value }))} style={styles.input} />
            <input placeholder="Stock" value={formProd.stock} onChange={e => setFormProd(s => ({ ...s, stock: e.target.value }))} style={styles.input} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={styles.btnAdd}>Add Product</button>
              <button type="button" style={styles.btn} onClick={() => setProducts([])}>Clear All Products</button>
            </div>
          </form>

          <hr style={{ margin: '12px 0' }} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={styles.inputSmall}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Search" style={{ ...styles.inputSmall, flex: 1 }} />
          </div>

          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            {products.length === 0 && <div style={styles.muted}>No products</div>}
            {products.filter(p => !filterCategory || p.category === filterCategory).map(p => (
              <div key={p.id} style={styles.itemRow}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={styles.small}>
                    {p.category} · MRP: ₹{Number(p.mrp ?? (p.price ? (Number(p.price) / 0.9) : 0)).toFixed(2)} · DP: ₹{Number(p.price ?? 0).toFixed(2)} · BV: {Number(p.bv ?? 0)} · Stock: {p.stock}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={styles.btnPrimarySmall} onClick={() => addToCart(p.id)}>Add to Invoice</button>
                  <button style={styles.btnSmall} onClick={() => { const q = parseInt(prompt('Purchase qty', '1') || '0'); if (q>0) updateStock(p.id, q); }}>Purchase+</button>
                  <button style={styles.btnWarn} onClick={() => deleteProduct(p.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...styles.card, flex: 1 }}>
          <h3>Create Invoice</h3>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input placeholder="Customer name" value={customer.name} onChange={e => setCustomer(s => ({ ...s, name: e.target.value }))} style={styles.input} />
            <input placeholder="Customer phone" value={customer.phone} onChange={e => setCustomer(s => ({ ...s, phone: e.target.value }))} style={styles.input} />
            <input placeholder="Customer address" value={customer.address} onChange={e => setCustomer(s => ({ ...s, address: e.target.value }))} style={styles.input} />
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ ...styles.input, width: '200px', flex: 'none' }} />
            <div style={{ ...styles.input, display: 'flex', alignItems: 'center', color: '#666', flex: 1, justifyContent: 'center' }}>
              Invoice Date
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input 
                type="checkbox" 
                checked={useMRP} 
                onChange={e => setUseMRP(e.target.checked)}
                style={{ margin: 0 }}
              />
              Use MRP for billing (instead of DP)
            </label>
          </div>

          <div ref={invoiceRef} style={{ marginTop: 12, padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}>
            <Invoice 
              invoice={{
                id: 'INV-' + new Date().getTime().toString().slice(-8),
                date: new Date(invoiceDate).toISOString(),
                customer: customer,
                items: cart.map(c => ({ 
                  productId: c.productId, 
                  name: c.name, 
                  qty: c.qty, 
                  price: useMRP ? c.mrp : c.price, 
                  mrp: c.mrp, 
                  bv: c.bv 
                }))
              }}
              companyName={COMPANY_NAME}
              companyEmail={COMPANY_EMAIL}
              companyPhone={COMPANY_PHONE}
              companyAddress={COMPANY_ADDRESS}
            />
            
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginTop: 8, fontWeight: 800 }}>Balance: ₹{(subtotal() - Number(paid || 0)).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button 
              style={styles.btnPrimary} 
              onClick={() => finalizeInvoice(true)}
              disabled={isFinalizing}
            >
              {isFinalizing ? 'Finalizing...' : 'Finalize Invoice (Auto-save & PDF)'}
            </button>
            <button style={styles.btn} onClick={() => { setCart([]); }}>Clear Cart</button>
            <button style={styles.btnWarn} onClick={() => { if (!confirm('Clear all invoices?')) return; setInvoices([]); localStorage.removeItem('rk_invoices'); }}>Clear Invoices</button>
          </div>

          <hr style={{ margin: '12px 0' }} />

          <h4>Invoices History</h4>
          
          {/* Summary Statistics */}
          {invoices.length > 0 && (
            <div style={{ marginBottom: 12, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 6, border: '1px solid #e9ecef' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a' }}>{getInvoiceSummary().totalInvoices}</div>
                  <div style={styles.small}>Total Invoices</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#28a745' }}>₹{getInvoiceSummary().totalBalance.toFixed(2)}</div>
                  <div style={styles.small}>Total Balance</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#dc3545' }}>{getInvoiceSummary().totalProductsSold}</div>
                  <div style={styles.small}>Products Sold</div>
                </div>
              </div>
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <button 
                  style={{ ...styles.btnPrimary, marginRight: 8 }} 
                  onClick={exportAllInvoicesPDF}
                  disabled={isExportingBulk}
                >
                  {isExportingBulk ? 'Exporting...' : 'Export All PDFs (ZIP)'}
                </button>
              </div>
            </div>
          )}

          <div style={{ maxHeight: 160, overflow: 'auto' }}>
            {invoices.length === 0 && <div style={styles.muted}>No invoices yet</div>}
            {invoices.map(inv => (
              <div key={inv.id} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{inv.id}</div>
                  <div style={styles.small}>{new Date(inv.date).toLocaleString()}</div>
                  <div style={styles.small}>Items: {inv.items?.reduce((sum, item) => sum + item.qty, 0) || 0}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Subtotal: ₹{Number(inv.subtotal).toFixed(2)}</div>
                  <div style={styles.small}>Balance: ₹{Number(inv.balance).toFixed(2)}</div>
                  <div style={{ marginTop: 6 }}>
                    <button style={styles.btnSmall} onClick={() => viewInvoice(inv)}>View</button>
                    <button style={{ ...styles.btnSmall, marginLeft: 6 }} onClick={() => downloadInvoiceJSON(inv)}>JSON</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </section>
      </main>

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <div style={styles.modalOverlay} onClick={closeInvoiceViewer}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div ref={selectedInvoiceRef}>
              <Invoice 
                invoice={selectedInvoice}
                companyName={COMPANY_NAME}
                companyEmail={COMPANY_EMAIL}
                companyPhone={COMPANY_PHONE}
                companyAddress={COMPANY_ADDRESS}
              />
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={styles.btn} onClick={() => downloadInvoiceJSON(selectedInvoice)}>Download JSON</button>
              <button style={styles.btnPrimary} onClick={() => downloadInvoicePDF(selectedInvoice)}>Download PDF</button>
              <button style={styles.btnWarn} onClick={() => closeInvoiceViewer()}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Test results display */}
      {testResults.length > 0 && (
        <div style={styles.testBox}>
          <strong>Test results:</strong>
          <ul>
            {testResults.map((t, i) => (
              <li key={i} style={{ color: t.pass ? 'green' : 'crimson' }}>{t.test}: {t.pass ? 'PASS' : 'FAIL'} {t.error ? `(${t.error})` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      <footer style={{ marginTop: 18, textAlign: 'center', color: '#666' }}>{COMPANY_NAME} — Billing software</footer>
    </div>
  );
}

const styles = {
  page: { padding: 18, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', background: '#f6f8fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  company: { fontSize: 20, fontWeight: 800, letterSpacing: 0.4 },
  subtitle: { color: '#666', marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 },
  card: { background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  input: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' },
  inputSmall: { padding: 8, borderRadius: 6, border: '1px solid #ddd', minWidth: 140 },
  btn: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  btnAdd: { padding: '8px 10px', borderRadius: 6, border: 'none', background: '#2f9e44', color: '#fff', cursor: 'pointer' },
  btnPrimary: { padding: '8px 12px', borderRadius: 6, border: 'none', background: '#0b63c6', color: '#fff', cursor: 'pointer' },
  btnPrimarySmall: { padding: '6px 8px', borderRadius: 6, border: 'none', background: '#0b63c6', color: '#fff', cursor: 'pointer' },
  btnSmall: { padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  btnWarn: { padding: '8px 12px', borderRadius: 6, border: 'none', background: '#d97706', color: '#fff', cursor: 'pointer' },
  muted: { color: '#777' },
  small: { color: '#666', fontSize: 12 },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid #f0f0f0' },
  td: { padding: 8, textAlign: 'left', borderRight: 'none' },
  modalOverlay: { position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', padding: 16, borderRadius: 8, width: '90%', maxWidth: 800, maxHeight: '90%', overflow: 'auto' },
  testBox: { position: 'fixed', right: 12, bottom: 12, background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }
};
