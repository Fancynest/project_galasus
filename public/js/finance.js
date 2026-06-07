/**
 * finance.js
 * Modul Operasional Keuangan Galasus (Enterprise Edition)
 * Updated: UI Responsive & Formal Wording Integration
 */

let allTransactions = [];
let allProjections = [];
let notifications = [];
let allClients = [];

function setupUI() {
    setupMobileSidebar(); // INISIALISASI: Fungsionalitas Navigasi Layar Sentuh

    const name = localStorage.getItem('galasus_name') || 'Administrator Keuangan';
    const role = localStorage.getItem('galasus_role') || 'Finance';
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const userInitials = document.getElementById('user-initials');

    if(userName) userName.textContent = name;
    if(userRole) userRole.textContent = role;
    if(userInitials) userInitials.textContent = name.substring(0, 2).toUpperCase();
}

// FUNGSI: Kontrol Layar Mobile
function setupMobileSidebar() {
    const btnOpen = document.getElementById('open-sidebar-btn');
    const btnClose = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    const toggleMenu = () => {
        if(sidebar) sidebar.classList.toggle('-translate-x-full');
        if(overlay) overlay.classList.toggle('hidden');
    };

    if(btnOpen) btnOpen.onclick = toggleMenu;
    if(btnClose) btnClose.onclick = toggleMenu;
    if(overlay) overlay.onclick = toggleMenu;
}

async function loadFinanceData() {
    const token = localStorage.getItem('galasus_token');
    const rangeElement = document.getElementById('filter-range');
    const range = rangeElement ? rangeElement.value : '30days';

    try {
        const resTrans = await fetch(`http://127.0.0.1:8081/transactions?range=${range}`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const dataTrans = await resTrans.json();
        allTransactions = Array.isArray(dataTrans) ? dataTrans : [];

        const resProj = await fetch(`http://127.0.0.1:8081/projections`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const dataProj = await resProj.json();
        allProjections = Array.isArray(dataProj) ? dataProj : [];

        const resClient = await fetch(`http://127.0.0.1:8081/clients`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const dataClient = await resClient.json();
        allClients = Array.isArray(dataClient) ? dataClient : [];

        renderAll();
    } catch (err) { 
        console.error("Kegagalan penarikan data transaksi dari server utama:", err); 
    }
}

function renderAll() {
    renderTable(allTransactions);
    renderProjections();
    // Also render the invoice health metrics
    renderInvoiceHealth(allTransactions);
    updateStats();
    checkNotifications();
}

function renderInvoiceHealth(txs) {
    let paidTotal = 0;
    let unpaidTotal = 0;

    // Only consider 'Keluar' (Piutang) which means invoicing clients
    txs.forEach(t => {
        const typeLower = (t.type || '').toLowerCase();
        const statusLower = (t.status || '').toLowerCase();
        const invoiceNo = (t.invoice_no || '').toUpperCase();
        
        let isIncome = typeLower === 'keluar' || typeLower === 'income';
        if (!isIncome && invoiceNo.startsWith('INV')) isIncome = true;
        
        if (isIncome) {
            if (statusLower === 'lunas' || statusLower === 'paid' || statusLower === 'success') {
                paidTotal += parseFloat(t.amount) || 0;
            } else {
                unpaidTotal += parseFloat(t.amount) || 0;
            }
        }
    });

    const total = paidTotal + unpaidTotal;
    const paidPercentage = total === 0 ? 0 : Math.round((paidTotal / total) * 100);
    const unpaidPercentage = total === 0 ? 0 : (100 - paidPercentage);

    // Update UI elements
    const elPercent = document.getElementById('health-percentage');
    const elBarPaid = document.getElementById('health-bar-paid');
    const elBarUnpaid = document.getElementById('health-bar-unpaid');
    const elValPaid = document.getElementById('health-val-paid');
    const elValUnpaid = document.getElementById('health-val-unpaid');

    if (elPercent) elPercent.textContent = `${paidPercentage}%`;
    if (elBarPaid) elBarPaid.style.width = `${paidPercentage}%`;
    if (elBarUnpaid) elBarUnpaid.style.width = `${unpaidPercentage}%`;
    if (elValPaid) elValPaid.textContent = formatIDR(paidTotal);
    if (elValUnpaid) elValUnpaid.textContent = formatIDR(unpaidTotal);
}

// Chart logic is no longer needed since we removed the chart
function updateChart(txs) {
    // Keep empty to avoid breaking existing calls
}

function updateStats() {
    let income = 0;
    let pending = 0;
    let expenses = 0;

    allTransactions.forEach(t => {
        const typeLower = (t.type || '').toLowerCase();
        const statusLower = (t.status || '').toLowerCase();
        const invoiceNo = (t.invoice_no || '').toUpperCase();
        
        let isIncome = typeLower === 'keluar' || typeLower === 'income';
        let isExpense = typeLower === 'masuk' || typeLower === 'expense';
        
        if (!isIncome && !isExpense) {
            if (invoiceNo.startsWith('INV')) isIncome = true;
            else if (invoiceNo.startsWith('EXP')) isExpense = true;
        }
        
        const isLunas = statusLower === 'lunas' || statusLower === 'paid' || statusLower === 'success';

        if (isIncome) {
            if (isLunas) income += parseFloat(t.amount) || 0;
            else pending += parseFloat(t.amount) || 0;
        } else if (isExpense) {
            expenses += parseFloat(t.amount) || 0;
        }
    });

    expenses += allProjections.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const incEl = document.getElementById('stat-income');
    const penEl = document.getElementById('stat-pending');
    const expEl = document.getElementById('stat-expenses');
    
    if(incEl) incEl.textContent = formatIDR(income);
    if(penEl) penEl.textContent = formatIDR(pending);
    if(expEl) expEl.textContent = formatIDR(expenses);
    
    // Data Dinamis: Hitung Klien Aktif
    const contEl = document.getElementById('stat-contracts');
    if(contEl) {
        const activeClients = allClients.filter(c => (c.status || '').toLowerCase() === 'active').length;
        contEl.textContent = activeClients;
    }
}

// --- EXPORTS / GLOBAL BINDING ---
window.loadFinanceData = loadFinanceData;
window.checkNotifications = checkNotifications;
window.clearNotif = clearNotif;

window.editProjection = async function(id) {
    const proj = allProjections.find(p => p.projection_id === id);
    if (!proj) return;
    const newAmount = await GalasusDialog.prompt("Masukkan nominal anggaran baru (contoh: 5000000):", proj.amount);
    if (!newAmount || isNaN(newAmount)) return;

    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/projections/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: proj.title, amount: parseFloat(newAmount), due_date: proj.due_date })
        });
        if (res.ok) await loadFinanceData();
        else await GalasusDialog.alert("Peringatan Sistem: Gagal memperbarui proyeksi");
    } catch (e) {
        await GalasusDialog.alert("Peringatan Sistem: Terjadi kesalahan sistem");
    }
}

window.deleteProjection = async function(id) {
    if (!await GalasusDialog.confirm("Konfirmasi Keamanan: Apakah Anda yakin ingin menghapus alokasi anggaran ini?")) return;
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/projections/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) await loadFinanceData();
        else await GalasusDialog.alert("Peringatan Sistem: Gagal menghapus proyeksi");
    } catch (e) {
        await GalasusDialog.alert("Peringatan Sistem: Terjadi kesalahan sistem");
    }
}

window.executePayment = async function(id) {
    if (!await GalasusDialog.confirm("Otorisasi Akses: Apakah Anda yakin ingin merealisasikan anggaran ini menjadi pengeluaran aktual?")) return;
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/projections/${id}/execute`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) await loadFinanceData();
        else await GalasusDialog.alert("Peringatan Sistem: Gagal mengeksekusi proyeksi");
    } catch (e) {
        await GalasusDialog.alert("Peringatan Sistem: Terjadi kesalahan sistem");
    }
}

// --- LOGIKA AUDIT NOTIFIKASI ---
function checkNotifications() {
    notifications = [];
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    allTransactions.forEach(t => {
        const dueDate = new Date(t.due_date);
        const typeLower = (t.type || '').toLowerCase();
        const statusLower = (t.status || '').toLowerCase();
        const invoiceNo = (t.invoice_no || '').toUpperCase();
        
        let isIncome = typeLower === 'keluar' || typeLower === 'income';
        if (!isIncome && invoiceNo.startsWith('INV')) isIncome = true;
        
        const isLunas = statusLower === 'lunas' || statusLower === 'paid' || statusLower === 'success';

        if (isIncome && !isLunas && dueDate <= threeDaysLater && dueDate >= today) {
            notifications.push({
                title: "Teguran Batas Waktu Piutang",
                desc: `Dokumen penagihan ${t.invoice_no} (${t.client_vendor}) membutuhkan eskalasi pembayaran dalam kurun waktu 3 hari kalender.`,
                type: 'urgent'
            });
        }
    });

    allProjections.forEach(p => {
        if (new Date(p.due_date) < today) {
            notifications.push({
                title: "Keterlambatan Eksekusi Anggaran",
                desc: `Alokasi beban untuk ${p.title} telah melampaui tenggat waktu yang dijadwalkan. Mohon segera lakukan rekonsiliasi.`,
                type: 'warning'
            });
        }
    });

    renderNotifList();
}

function renderNotifList() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    if(!list || !badge) return;

    if (notifications.length > 0) {
        badge.classList.remove('hidden');
        badge.textContent = notifications.length;
        list.innerHTML = '';
        
        notifications.forEach(n => {
            const iconColor = n.type === 'urgent' ? 'text-error bg-error-container/30' : 'text-amber-600 bg-amber-100';
            const icon = n.type === 'urgent' ? 'priority_high' : 'schedule';
            
            list.insertAdjacentHTML('beforeend', `
                <div class="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div class="flex gap-3">
                        <div class="w-8 h-8 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-sm font-bold">${icon}</span>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-900 uppercase tracking-tight">${n.title}</p>
                            <p class="text-[10px] text-slate-500 mt-1 leading-relaxed">${n.desc}</p>
                        </div>
                    </div>
                </div>
            `);
        });
    } else {
        badge.classList.add('hidden');
        list.innerHTML = `<p class="p-8 text-center text-xs text-slate-400 italic">Infrastruktur operasional berjalan normal. Tidak ada temuan kritis.</p>`;
    }
}

function clearNotif() {
    notifications = [];
    renderNotifList();
}

// --- RENDER TABEL TRANSAKSI ---
function renderTable(data) {
    const tbody = document.getElementById('invoice-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400 text-sm italic font-medium">Buku besar belum memiliki entri transaksi untuk periode ini.</td></tr>`;
        return;
    }

    data.forEach(t => {
        const typeLower = (t.type || '').toLowerCase();
        const statusLower = (t.status || '').toLowerCase();
        const invoiceNo = (t.invoice_no || '').toUpperCase();
        
        let isKeluar = typeLower === 'keluar' || typeLower === 'income';
        let isMasuk = typeLower === 'masuk' || typeLower === 'expense';
        
        if (!isKeluar && !isMasuk) {
            if (invoiceNo.startsWith('INV')) isKeluar = true;
            else if (invoiceNo.startsWith('EXP')) isMasuk = true;
        }

        const typeIndicator = isMasuk ? `<span class="inline-flex mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">Beban Usaha</span>` : `<span class="inline-flex mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">Tagihan Klien</span>`;
        
        const isLunas = statusLower === 'lunas' || statusLower === 'paid' || statusLower === 'success';
        const statusClass = isLunas ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200';
        
        const actionButton = !isLunas ? 
            `<button onclick="markAsPaid(${t.transaction_id})" title="Otorisasi Pencairan / Penerimaan Lunas" class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-200"><span class="material-symbols-outlined text-lg">check_circle</span></button>` : 
            `<span class="p-1.5 text-slate-300" title="Telah Diselesaikan"><span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">verified</span></span>`;

        tbody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-50">
                <td class="px-4 py-4 font-bold text-slate-700 text-xs tracking-wide">${t.invoice_no}</td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                        <div class="text-xs font-bold text-slate-900">${t.client_vendor}</div>
                        ${typeIndicator}
                    </div>
                    <div class="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5" title="${t.description || '-'}">${t.description || '-'}</div>
                </td>
                <td class="px-4 py-4 text-[11px] font-medium text-slate-500 whitespace-nowrap">${new Date(t.issue_date).toLocaleDateString('id-ID', {day: '2-digit', month:'short', year:'numeric'})}</td>
                <td class="px-4 py-4 text-xs font-black whitespace-nowrap ${isKeluar ? 'text-slate-900' : 'text-error'}">${formatIDR(t.amount)}</td>
                <td class="px-4 py-4 text-center"><span class="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${statusClass}">${t.status}</span></td>
                <td class="px-4 py-4 text-right flex justify-end gap-1.5 whitespace-nowrap">
                    ${actionButton}
                    <button onclick="exportSinglePDF(${t.transaction_id})" title="Cetak Dokumen Administratif" class="p-1.5 text-slate-400 hover:text-galasus-blue hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors">
                        <span class="material-symbols-outlined text-lg">picture_as_pdf</span>
                    </button>
                </td>
            </tr>
        `);
    });
}

function renderProjections() {
    const list = document.getElementById('projection-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(allProjections.length === 0) {
        list.innerHTML = `<div class="p-6 text-center border-2 border-dashed border-slate-100 rounded-xl"><p class="text-xs text-slate-400 font-medium italic">Belum ada penjadwalan alokasi anggaran.</p></div>`;
        return;
    }

    allProjections.slice(0, 3).forEach(p => {
        list.insertAdjacentHTML('beforeend', `
            <div class="flex flex-col p-4 border border-slate-100 rounded-xl group hover:border-galasus-blue/50 hover:bg-slate-50 transition-all bg-white gap-3">
                <div class="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div class="p-2 md:p-2.5 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-galasus-blue transition-all border border-slate-100 group-hover:border-blue-100 flex-shrink-0"><span class="material-symbols-outlined text-base md:text-lg">event_repeat</span></div>
                    <div class="min-w-0 flex-1">
                        <p class="text-xs md:text-sm font-bold text-slate-900 leading-tight truncate" title="${p.title}">${p.title}</p>
                        <p class="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-semibold flex items-center gap-1 truncate">
                            <span class="material-symbols-outlined text-[12px]">calendar_today</span> 
                            Tenggat: ${new Date(p.due_date).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}
                        </p>
                    </div>
                </div>
                <div class="flex items-center justify-between gap-2 flex-shrink-0 border-t border-slate-100 pt-3 mt-1">
                    <p class="text-xs md:text-sm font-black text-slate-900 tracking-tight mr-2">${formatIDR(p.amount)}</p>
                    <div class="flex items-center gap-1">
                        <button onclick="editProjection(${p.projection_id})" title="Edit Proyeksi" class="p-1.5 md:p-2 bg-slate-50 text-slate-500 hover:bg-galasus-blue hover:text-white rounded-lg transition-colors border border-slate-200">
                            <span class="material-symbols-outlined text-sm md:text-lg block">edit_square</span>
                        </button>
                        <button onclick="deleteProjection(${p.projection_id})" title="Hapus Proyeksi" class="p-1.5 md:p-2 bg-slate-50 text-slate-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-slate-200">
                            <span class="material-symbols-outlined text-sm md:text-lg block">delete</span>
                        </button>
                        <button onclick="executePayment(${p.projection_id})" title="Realisasikan Anggaran" class="flex items-center gap-1 px-3 py-1.5 md:p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors border border-emerald-100 hover:border-emerald-600 text-[10px] font-bold uppercase">
                            <span class="material-symbols-outlined text-sm md:text-lg block">payments</span>
                            <span class="md:hidden">Bayar</span>
                        </button>
                    </div>
                </div>
            </div>
        `);
    });
}

// --- GENERATOR DOKUMEN PDF (STANDAR KORPORAT) ---
function drawKopSurat(doc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = '/public/photos/Logo-Galasus178x40.png'; 
        img.onload = function() {
            doc.addImage(img, 'PNG', 14, 10, 48, 12); 
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.text("Jl. Raya Puspitek, Panorama Serpong, D2 14, Tangerang Selatan.", 14, 30);
            doc.text("info@galasus.com | WhatsApp: 0813-9977-7247", 14, 35);
            doc.setDrawColor(2, 116, 190);
            doc.setLineWidth(0.5);
            doc.line(14, 40, 196, 40);
            resolve();
        };
        img.onerror = () => {
            doc.setFont("helvetica", "bold");
            doc.text("GALASUS IT SOLUTIONS - FINANCE DEPT", 14, 20);
            doc.line(14, 40, 196, 40);
            resolve();
        };
    });
}

async function exportFullPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    await drawKopSurat(doc);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("REKAPITULASI BUKU BESAR TRANSAKSI", 14, 50);
    const body = allTransactions.map(t => [t.invoice_no, t.client_vendor, t.description || "-", new Date(t.issue_date).toLocaleDateString('id-ID'), formatIDR(t.amount), t.status.toUpperCase()]);
    doc.autoTable({ 
        startY: 55, 
        head: [['REFERENSI', 'ENTITAS MITRA', 'URAIAN', 'TGL TERBIT', 'NOMINAL (IDR)', 'STATUS']], 
        body: body, 
        theme: 'grid', 
        headStyles: { fillColor: [2, 116, 190], fontSize: 8, fontStyle: 'bold' }, 
        styles: { fontSize: 7, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const printTime = new Date().toLocaleString('id-ID');
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Waktu Cetak Dokumen: ${printTime}`, 14, 290);
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}${d.toLocaleString('id-ID', { month: 'short' }).replace('.', '')}${d.getFullYear()}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    doc.save(`Rekap_Keuangan_${dateStr}.pdf`);
}

async function exportSinglePDF(id) {
    const t = allTransactions.find(item => item.transaction_id === id);
    if (!t) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    await drawKopSurat(doc);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    
    // Penamaan Dokumen Tergantung Tipe Transaksi
    const docTitle = (t.type === 'Keluar' || t.type.toLowerCase() === 'income') ? "FAKTUR TAGIHAN (INVOICE)" : "BUKTI POTONG BEBAN (EXPENSE)";
    doc.text(docTitle, 14, 50);
    
    doc.autoTable({ 
        startY: 55, 
        head: [['KOMPONEN ADMINISTRATIF', 'RINCIAN DATA']], 
        body: [
            ['Nomor Referensi', t.invoice_no], 
            ['Entitas Klien / Mitra', t.client_vendor], 
            ['Deskripsi Jasa/Barang', t.description || "Tercantum pada lampiran terpisah"], 
            ['Tanggal Pengesahan', new Date(t.issue_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })], 
            ['Total Nilai Transaksi', formatIDR(t.amount)], 
            ['Status Pencairan', t.status.toUpperCase()]
        ], 
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
        bodyStyles: { borderBottom: [0.1, 'solid', 226, 232, 240] },
        columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold', textColor: [100, 100, 100] } }
    });

    doc.text("Disahkan Secara Elektronik", 140, doc.lastAutoTable.finalY + 40, null, null, "center");
    doc.setFont("helvetica", "bold");
    doc.text("Tim Administrasi Galasus", 140, doc.lastAutoTable.finalY + 60, null, null, "center");

    const printTime = new Date().toLocaleString('id-ID');
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Waktu Cetak Dokumen: ${printTime}`, 14, 290);
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}${d.toLocaleString('id-ID', { month: 'short' }).replace('.', '')}${d.getFullYear()}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    doc.save(`Invoice_${t.invoice_no.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`);
}

// --- AKSI PERUBAHAN DATABASE ---
async function markAsPaid(id) {
    if(!await GalasusDialog.confirm("Konfirmasi Otorisasi: Apakah Anda menyetujui perubahan status dokumen tagihan ini menjadi 'LUNAS' (Telah Direkonsiliasi)?\n\nTindakan ini akan mempengaruhi kalkulasi arus kas pada sistem.")) return;
    
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/transactions/${id}`, { 
            method: 'PUT', 
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'Lunas' }) 
        });
        
        if (!res.ok) throw new Error("Akses ditolak atau terjadi asinkronisasi pada server utama.");
        loadFinanceData();
    } catch (err) {
        await GalasusDialog.alert("Peringatan Sistem: " + err.message);
    }
}

async function executePayment(id) {
    if(!await GalasusDialog.confirm("Konfirmasi Eksekusi: Apakah Anda ingin merealisasikan proyeksi anggaran ini menjadi beban pengeluaran aktual?")) return;
    const res = await fetch(`http://127.0.0.1:8081/projections/${id}/execute`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('galasus_token')}` } 
    });
    if (res.ok) {
        loadFinanceData();
    } else {
        await GalasusDialog.alert("Peringatan Sistem: Kegagalan dalam memproses eksekusi anggaran.");
    }
}

async function deleteProjection(id) {
    if(!await GalasusDialog.confirm("Konfirmasi Hapus: Apakah Anda yakin ingin membatalkan dan menghapus jadwal alokasi anggaran ini?")) return;
    try {
        const token = localStorage.getItem('galasus_token');
        const res = await fetch(`http://127.0.0.1:8081/projections/${id}`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (res.ok) {
            loadFinanceData();
        } else {
            await GalasusDialog.alert("Peringatan Sistem: Gagal menghapus proyeksi anggaran.");
        }
    } catch (err) {
        await GalasusDialog.alert("Kegagalan koneksi sistem.");
    }
}

let activeEditProjId = null;

window.editProjection = function(id) {
    const p = allProjections.find(x => x.projection_id === id);
    if (!p) return;
    
    activeEditProjId = id;
    document.getElementById('proj-title').value = p.title;
    document.getElementById('proj-amount').value = p.amount;
    document.getElementById('proj-due').value = new Date(p.due_date).toISOString().split('T')[0];
    
    openModalCustom('modal-projection-form');
};

function handleSearch(e) {
    const keyword = e.target.value.toLowerCase();
    const filtered = allTransactions.filter(t => t.invoice_no.toLowerCase().includes(keyword) || t.client_vendor.toLowerCase().includes(keyword) || (t.description && t.description.toLowerCase().includes(keyword)));
    renderTable(filtered);
}

function formatIDR(num) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num); }
window.openModalCustom = function(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    const content = modal.querySelector('.transform') || modal.children[0];
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Force reflow
    void modal.offsetWidth;
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
        if(content) content.classList.remove('scale-95');
    }, 10);
};

window.closeAllModals = function() {
    document.querySelectorAll('[id^="modal-"]').forEach(modal => {
        if (modal.id.endsWith('-content') || modal.id === 'modal-content') return;
        if (modal.classList.contains('hidden')) return;
        const content = modal.querySelector('.transform') || modal.children[0];
        
        modal.classList.add('opacity-0');
        modal.classList.add('pointer-events-none');
        if(content) content.classList.add('scale-95');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    });
};

window.openTransactionForm = function(type) {
    const selModal = document.getElementById('modal-select-type');
    if (selModal) {
        selModal.classList.add('hidden');
        selModal.classList.remove('flex');
        selModal.classList.add('opacity-0', 'pointer-events-none');
        const content = selModal.querySelector('.transform');
        if (content) content.classList.add('scale-95');
    }
    
    const headerBg = document.getElementById('form-header-bg');
    const title = document.getElementById('form-title');
    const subtitle = document.getElementById('form-subtitle');
    const fieldType = document.getElementById('field-type');
    
    if(fieldType) fieldType.value = type;
    
    if(headerBg && title && subtitle) {
        if(type === 'Keluar') {
            headerBg.className = 'w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 transition-colors';
            title.textContent = 'Penerbitan Faktur';
            subtitle.textContent = 'Penagihan kepada klien';
        } else {
            headerBg.className = 'w-12 h-12 rounded-2xl bg-red-50 text-error flex items-center justify-center border border-red-100 transition-colors';
            title.textContent = 'Pencatatan Beban';
            subtitle.textContent = 'Pembayaran ke mitra usaha';
        }
    }
    
    openModalCustom('modal-transaction-form');
};

// --- EVENT LISTENERS INISIALISASI ---
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    loadFinanceData();

    const btnNotif = document.getElementById('btn-notification');
    const dropNotif = document.getElementById('dropdown-notif');
    if(btnNotif && dropNotif) {
        btnNotif.onclick = (e) => {
            e.stopPropagation();
            dropNotif.classList.toggle('hidden');
        };
    }
    window.onclick = () => { if(dropNotif) dropNotif.classList.add('hidden'); };

    // Handler Search untuk 2 bar pencarian (Desktop & Mobile)
    const searchDesktop = document.getElementById('search-finance');
    const searchMobile = document.getElementById('search-finance-mobile');
    if(searchDesktop) searchDesktop.addEventListener('input', handleSearch);
    if(searchMobile) searchMobile.addEventListener('input', handleSearch);

    const btnTypeSelector = document.getElementById('btn-open-type-selector');
    if(btnTypeSelector) btnTypeSelector.onclick = () => openModalCustom('modal-select-type');
    
    const btnAddProjOld = document.getElementById('btn-add-projection');
    if(btnAddProjOld) btnAddProjOld.onclick = null; // Removed old handler
    
    const filterRng = document.getElementById('filter-range');
    if(filterRng) filterRng.onchange = loadFinanceData;

    const formFinance = document.getElementById('finance-main-form');
    if (formFinance) {
        formFinance.onsubmit = async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('galasus_token');
            const body = { 
                type: document.getElementById('field-type').value, 
                client_vendor: document.getElementById('field-name').value, 
                description: document.getElementById('field-desc').value, 
                amount: parseFloat(document.getElementById('field-amount').value), 
                due_date: new Date(document.getElementById('field-due').value).toISOString(), 
                status: 'Pending' 
            };
            try {
                const res = await fetch('http://127.0.0.1:8081/transactions', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                if(res.ok) { 
                    closeAllModals(); 
                    loadFinanceData(); 
                    document.getElementById('finance-main-form').reset(); 
                } else {
                    await GalasusDialog.alert("Gagal mengesahkan formulir ke basis data.");
                }
            } catch(e) { await GalasusDialog.alert("Kegagalan lalu lintas jaringan."); }
        };
    }

    const formProj = document.getElementById('projection-main-form');
    if (formProj) {
        formProj.onsubmit = async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('galasus_token');
            const body = { 
                title: document.getElementById('proj-title').value, 
                amount: parseFloat(document.getElementById('proj-amount').value), 
                due_date: new Date(document.getElementById('proj-due').value).toISOString() 
            };
            try {
                let url = 'http://127.0.0.1:8081/projections';
                let method = 'POST';
                if (activeEditProjId) {
                    url = `http://127.0.0.1:8081/projections/${activeEditProjId}`;
                    method = 'PUT';
                }
                const res = await fetch(url, { method: method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                if(res.ok) { 
                    closeAllModals(); 
                    loadFinanceData(); 
                    document.getElementById('projection-main-form').reset();
                    activeEditProjId = null;
                } else {
                    await GalasusDialog.alert("Gagal memproses alokasi anggaran.");
                }
            } catch(e) { await GalasusDialog.alert("Kegagalan koneksi sistem."); }
        };
    }
    
    const btnAddProj = document.getElementById('btn-add-projection');
    if(btnAddProj) btnAddProj.addEventListener('click', () => {
        activeEditProjId = null;
        const f = document.getElementById('projection-main-form');
        if (f) f.reset();
        openModalCustom('modal-projection-form');
    });
});