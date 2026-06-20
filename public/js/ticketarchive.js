/**
 * ticketarchive.js
 * FINAL FIX: Tanggal Akurat & Full Export Excel
 */

let archiveTickets = [];
let filteredTickets = [];

// Memuat pustaka SheetJS secara dinamis
if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    setupMobileSidebar();
    loadArchiveData();

    const searchInput = document.getElementById('search-archive');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderArchiveTable(archiveTickets);
                return;
            }
            const keywords = query.split(/\s+/);
            filteredTickets = archiveTickets.filter(t => {
                const searchableString = `
                    ${t.no_tiket || t.ticket_id || ''} 
                    ${t.pelanggan || t.Pelanggan || ''} 
                    ${t.masalah || t.Masalah || t.issue_description || ''} 
                    ${t.teknisi || t.Teknisi || ''}
                    ${t.status || t.Status || ''}
                `.toLowerCase();
                return keywords.every(kw => searchableString.includes(kw));
            });
            renderArchiveTable(filteredTickets);
        });
    }

    const dateInput = document.getElementById('filter-date');
    if (dateInput) {
        flatpickr(dateInput, {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d/m/Y",
            locale: "id",
            onChange: function(selectedDates, dateStr, instance) {
                const selectedDate = dateStr; 
                if (!selectedDate) {
                    filteredTickets = [...archiveTickets];
                    return renderArchiveTable(filteredTickets);
                }
                filteredTickets = archiveTickets.filter(t => {
                    const strDate = t.resolved_at || t.ResolvedAt || t.create_at || t.created_at || t.CreatedAt;
                    if (!strDate) return false;
                    const d = new Date(strDate);
                    const finishedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return finishedDate === selectedDate;
                });
                renderArchiveTable(filteredTickets);
            }
        });
    }
});

function setupHeader() {
    const name = localStorage.getItem('galasus_name') || 'Admin';
    const role = localStorage.getItem('galasus_role') || 'Admin';
    const un=document.getElementById('user-name'); const ur=document.getElementById('user-role'); const ui=document.getElementById('user-initials'); if(un) un.textContent=name; 
    let displayRole = role;
    if (role === 'super admin' || role === 'super_admin') displayRole = 'Administrator Utama';
    else if (role === 'technician') displayRole = 'Teknisi Lapangan';
    else if (role === 'finance') displayRole = 'Keuangan';
    else if (role === 'admin') displayRole = 'Admin Sistem';

    if(ur) ur.textContent=displayRole; if(ui) ui.textContent=name.substring(0,2).toUpperCase();
}

async function loadArchiveData() {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch('/tickets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const allData = Array.isArray(data) ? data : [];

        // Filter status selesai
        archiveTickets = allData.filter(t => {
            const s = (t.status || t.Status || '').toLowerCase();
            return s === 'closed' || s === 'resolved' || s === 'success' || s === 'selesai';
        });

        filteredTickets = [...archiveTickets];
        renderArchiveTable(filteredTickets);
    } catch (err) {
        console.error("Gagal load archive:", err);
    }
}

function renderArchiveTable(data) {
    const tbody = document.getElementById('archive-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic">Data kosong.</td></tr>`;
        return;
    }

    data.forEach(t => {
        const noTiket = t.no_tiket || t.ticket_id || t.NoTiket || `#${t.id}`;
        // PERBAIKAN KRITIS: Menggunakan CreatedAt sebagai fallback untuk ResolvedAt
        const d = new Date(t.created_at || t.CreatedAt || t.resolved_at);
        const tglSelesai = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

        tbody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                <td class="px-6 py-4 font-bold text-slate-500 text-xs">${noTiket}</td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="text-sm font-semibold text-slate-700">${t.pelanggan || t.Pelanggan || '-'}</span>
                        <span class="text-[11px] text-slate-400 truncate max-w-[300px]">${t.masalah || t.Masalah || t.issue_description || '-'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center text-xs text-slate-600 font-medium">${tglSelesai}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">SUCCESS</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="viewDetail('${t.id}')" class="p-2 text-slate-400 hover:text-galasus-blue transition-colors">
                        <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                </td>
            </tr>
        `);
    });
}

function exportToExcel() {
    if (filteredTickets.length === 0) return GalasusDialog.alert("Data kosong.");
    const dataExcel = filteredTickets.map(t => ({
        "Nomor Tiket": t.no_tiket || t.ticket_id,
        "Nama Klien": t.pelanggan || t.Pelanggan,
        "Masalah": t.masalah || t.Masalah || t.issue_description,
        "Tanggal Selesai": new Date(t.created_at || t.CreatedAt || t.resolved_at).toLocaleString('id-ID'),
        "Status": "SUCCESS"
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Arsip");
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}${d.toLocaleString('id-ID', { month: 'short' }).replace('.', '')}${d.getFullYear()}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `Arsip_Tiket_Galasus_${dateStr}.xlsx`);
}

function resetFilters() {
    document.getElementById('search-archive').value = '';
    const dateInput = document.getElementById('filter-date');
    if (dateInput && dateInput._flatpickr) {
        dateInput._flatpickr.clear();
    } else if (dateInput) {
        dateInput.value = '';
    }
    filteredTickets = [...archiveTickets];
    renderArchiveTable(filteredTickets);
}

async function viewDetail(id) {
    const t = archiveTickets.find(x => x.id == id);
    if (!t) return GalasusDialog.alert("Data tiket tidak ditemukan.");

    const token = localStorage.getItem('galasus_token');
    let logsHtml = '<div class="text-center text-slate-400 text-xs italic py-4">Tidak ada riwayat aktivitas.</div>';

    try {
        const res = await fetch(`/tickets/${id}/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const logs = await res.json();
            if (logs && logs.length > 0) {
                logsHtml = logs.map(l => `
                    <div class="mb-4 pl-4 border-l-2 border-slate-200 relative">
                        <div class="absolute w-2 h-2 bg-galasus-blue rounded-full -left-[5px] top-1.5 ring-4 ring-white"></div>
                        <div class="flex justify-between items-baseline mb-1">
                            <div class="text-xs font-bold text-slate-800">${l.user_name} <span class="px-1.5 py-0.5 bg-blue-50 text-galasus-blue rounded text-[9px] uppercase tracking-wider ml-1">${l.action_type || 'UPDATE'}</span></div>
                            <div class="text-[10px] text-slate-400 font-mono">${new Date(l.created_at).toLocaleString('id-ID')}</div>
                        </div>
                        <div class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">${l.description}</div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Gagal load logs:", e);
    }

    const noTiket = t.no_tiket || t.ticket_id || t.NoTiket || `#${t.id}`;
    
    // Fix Date parsing: GORM map returns column names like 'create_at' instead of json tags
    const strCreated = t.create_at || t.created_at || t.CreatedAt;
    const strResolved = t.resolved_at || t.ResolvedAt || strCreated;
    
    const dCreated = strCreated ? new Date(strCreated) : new Date();
    const dResolved = strResolved ? new Date(strResolved) : new Date();
    
    const durationMs = Math.abs(dResolved - dCreated);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationText = hours > 0 ? `${hours} Jam ${minutes} Menit` : `${minutes} Menit`;

    const html = `
        <div class="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
                <h2 class="text-2xl font-bold text-slate-800">Berita Acara Pekerjaan (BAP)</h2>
                <div class="text-sm text-galasus-blue font-bold flex items-center gap-2 mt-1">
                    <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                    ${noTiket}
                </div>
            </div>
            <div class="text-right flex items-center justify-end gap-2 md:gap-4">
                <button onclick="deleteArchive('${t.id}')" class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors rounded-xl font-bold text-xs uppercase tracking-wider">
                    <span class="material-symbols-outlined text-sm">delete</span> Hapus
                </button>
                <button onclick="exportBAPPDF('${t.id}')" class="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-galasus-blue hover:bg-galasus-blue hover:text-white transition-colors rounded-xl font-bold text-xs uppercase tracking-wider">
                    <span class="material-symbols-outlined text-sm">picture_as_pdf</span> Cetak BAP
                </button>
                <div class="text-right">
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Akhir</div>
                    <span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-200">SELESAI (CLOSED)</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Klien</div>
                <div class="text-sm font-bold text-slate-800 truncate">${t.pelanggan || t.Pelanggan || '-'}</div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Teknisi</div>
                <div class="text-sm font-bold text-slate-800 truncate">${t.teknisi_name || 'Tidak diketahui'}</div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Waktu Pelaporan</div>
                <div class="text-sm font-bold text-slate-800">${dCreated.toLocaleString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Penyelesaian</div>
                <div class="text-sm font-bold text-slate-800">${dResolved.toLocaleString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Durasi Total</div>
                <div class="text-sm font-bold text-slate-800">${durationText}</div>
            </div>
        </div>

        <div class="mb-6">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-galasus-blue">build</span>
                Rincian Tindakan Korektif
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border border-slate-200 rounded-xl p-4">
                    <div class="text-[10px] font-bold text-slate-400 uppercase mb-2">Keluhan Awal</div>
                    <div class="text-sm text-slate-700 font-medium">${t.masalah || t.Masalah || t.issue_description || '-'}</div>
                </div>
                <div class="border border-slate-200 rounded-xl p-4 bg-blue-50/30">
                    <div class="text-[10px] font-bold text-galasus-blue uppercase mb-2">Hasil Diagnostik Akhir</div>
                    <div class="text-sm text-slate-700 font-medium">${t.diagnostik || t.Diagnostik || '-'}</div>
                </div>
                <div class="border border-slate-200 rounded-xl p-4 md:col-span-2">
                    <div class="text-[10px] font-bold text-emerald-600 uppercase mb-2">Tindakan Perbaikan yang Dilakukan</div>
                    <div class="text-sm text-slate-700 whitespace-pre-wrap">${t.tindakan || t.Tindakan || '-'}</div>
                </div>
                <div class="border border-slate-200 rounded-xl p-4 md:col-span-2 bg-slate-50">
                    <div class="text-[10px] font-bold text-amber-600 uppercase mb-2">Laporan Penggantian Suku Cadang (Sparepart)</div>
                    <div class="text-sm text-slate-700">${t.inventaris || t.Inventaris || 'Nihil (Tidak ada penggantian)'}</div>
                </div>
            </div>
        </div>

        <div class="mb-6">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-slate-500">history</span>
                Jejak Audit & Histori Log (Internal)
            </h3>
            <div class="border border-slate-200 rounded-xl p-4 bg-white max-h-[300px] overflow-y-auto custom-scrollbar">
                ${logsHtml}
            </div>
        </div>
    `;

    await GalasusDialog.custom(html, 'max-w-4xl');
}

function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
}

async function exportBAPPDF(id) {
    const t = archiveTickets.find(x => x.id == id);
    if (!t) return GalasusDialog.alert("Data tiket tidak ditemukan.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header (Kop Surat)
    const logo = await loadImage('/public/photos/Logo-Galasus178x40.png');
    if(logo) doc.addImage(logo, 'PNG', 14, 12, 35, 8);
    doc.setFontSize(8); doc.setTextColor(40);
    doc.text("Jl. Raya Puspitek, Panorama Serpong, D2 14, Tangerang Selatan.", 14, 25);
    doc.text("info@galasus.com | WhatsApp: 0813-9977-7247", 14, 29);
    doc.setDrawColor(2, 116, 190); doc.line(14, 33, 196, 33);

    // Title
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(40);
    doc.text("BERITA ACARA PEKERJAAN (BAP)", 105, 45, null, null, "center");
    
    const noTiket = t.no_tiket || t.ticket_id || t.NoTiket || `#${t.id}`;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(`ID Referensi: ${noTiket}`, 105, 52, null, null, "center");

    // Fix Date parsing
    const strCreated = t.create_at || t.created_at || t.CreatedAt;
    const strResolved = t.resolved_at || t.ResolvedAt || strCreated;
    const dCreated = strCreated ? new Date(strCreated) : new Date();
    const dResolved = strResolved ? new Date(strResolved) : new Date();

    const durationMs = Math.abs(dResolved - dCreated);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationText = hours > 0 ? `${hours} Jam ${minutes} Menit` : `${minutes} Menit`;

    // Info Table
    doc.autoTable({
        startY: 62,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2, textColor: [80, 80, 80] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 5 }, 2: { cellWidth: 140 } },
        body: [
            ['Klien / Pelanggan', ':', t.pelanggan || t.Pelanggan || '-'],
            ['Teknisi Bertugas', ':', t.teknisi_name || 'Tidak diketahui'],
            ['Waktu Pelaporan', ':', dCreated.toLocaleString('id-ID')],
            ['Waktu Penyelesaian', ':', dResolved.toLocaleString('id-ID')],
            ['Durasi Pengerjaan', ':', durationText],
            ['Status Akhir', ':', 'SELESAI (CLOSED)']
        ]
    });

    let currentY = doc.lastAutoTable.finalY + 10;

    const printText = (title, content, startY) => {
        doc.setFont("helvetica", "bold"); doc.setTextColor(40); doc.setFontSize(10);
        doc.text(title, 14, startY);
        doc.setFont("helvetica", "normal"); doc.setTextColor(80);
        const splitContent = doc.splitTextToSize(content || '-', 180);
        doc.text(splitContent, 14, startY + 6);
        return startY + 6 + (splitContent.length * 5) + 5;
    };

    currentY = printText("1. Keluhan Awal / Masalah", t.masalah || t.Masalah || t.issue_description, currentY);
    currentY = printText("2. Hasil Diagnostik", t.diagnostik || t.Diagnostik, currentY);
    currentY = printText("3. Tindakan Perbaikan yang Dilakukan", t.tindakan || t.Tindakan, currentY);
    currentY = printText("4. Laporan Penggantian Suku Cadang (Sparepart)", t.inventaris || t.Inventaris || 'Nihil (Tidak ada penggantian)', currentY);

    if (currentY > 230) { doc.addPage(); currentY = 20; }

    // Visual Evidence
    currentY += 5;
    doc.setFillColor(2, 116, 190); doc.rect(14, currentY, 182, 9, 'F');
    doc.setTextColor(255); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("LAMPIRAN BUKTI VISUAL (DOKUMENTASI)", 18, currentY + 6);
    currentY += 9;
    
    doc.setDrawColor(220); doc.rect(14, currentY, 91, 9); doc.rect(105, currentY, 91, 9);
    doc.setTextColor(40); doc.text("Kondisi Awal (Terdampak)", 34, currentY + 6); doc.text("Hasil Akhir (Telah Dipulihkan)", 125, currentY + 6);
    currentY += 9;

    const base = "";
    let imgB = null;
    let imgA = null;
    
    const fb = t.foto_before || t.FotoBefore || '';
    if (fb && fb !== '-') imgB = await loadImage(base + fb);
    
    const fa = t.foto_after || t.FotoAfter || '';
    if (fa && fa !== '-') imgA = await loadImage(base + fa);

    if(imgB) doc.addImage(imgB, 'JPEG', 15, currentY + 1, 89, 58);
    else { doc.setFont("helvetica", "italic"); doc.setTextColor(150); doc.text("Berkas Tidak Dilampirkan", 34, currentY + 30); }

    if(imgA) doc.addImage(imgA, 'JPEG', 106, currentY + 1, 89, 58);
    else { doc.setFont("helvetica", "italic"); doc.setTextColor(150); doc.text("Berkas Tidak Dilampirkan", 125, currentY + 30); }
    
    doc.setDrawColor(220); doc.rect(14, currentY, 91, 60); doc.rect(105, currentY, 91, 60);
    currentY += 65;

    // Fetch Logs
    try {
        const token = localStorage.getItem('galasus_token');
        const res = await fetch(`/tickets/${id}/logs`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const logs = await res.json();
            if (logs && logs.length > 0) {
                if (currentY > 230) { doc.addPage(); currentY = 20; }
                
                currentY += 5;
                doc.setFillColor(2, 116, 190); doc.rect(14, currentY, 182, 9, 'F');
                doc.setTextColor(255); doc.setFontSize(9); doc.setFont("helvetica", "bold");
                doc.text("JEJAK AUDIT & HISTORI LOG", 18, currentY + 6);
                currentY += 9;

                doc.autoTable({
                    startY: currentY,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
                    head: [['Waktu', 'Pengguna', 'Aksi', 'Deskripsi']],
                    body: logs.map(l => [
                        new Date(l.created_at).toLocaleString('id-ID'),
                        l.user_name,
                        l.action_type || 'UPDATE',
                        l.description
                    ])
                });
                currentY = doc.lastAutoTable.finalY + 10;
            }
        }
    } catch(e) {}

    if (currentY > 240) { doc.addPage(); currentY = 20; }

    // Signatures
    currentY += 10;
    doc.setFont("helvetica", "normal"); doc.setTextColor(40); doc.setFontSize(10);
    doc.text("Mengetahui & Menyetujui,", 55, currentY, { align: "center" });
    doc.text("Dilaporkan Oleh,", 155, currentY, { align: "center" });
    
    currentY += 25;
    doc.setFont("helvetica", "bold");
    doc.text(`( ${t.pelanggan || t.Pelanggan || 'Klien'} )`, 55, currentY, { align: "center" });
    doc.text(`( ${t.teknisi_name || 'Teknisi'} )`, 155, currentY, { align: "center" });
    
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150);
    doc.text("Perwakilan Klien", 55, currentY + 5, { align: "center" });
    doc.text("Tim Support Galasus", 155, currentY + 5, { align: "center" });

    // Waktu Cetak
    const printTime = new Date().toLocaleString('id-ID');
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Waktu Cetak Dokumen: ${printTime}`, 14, 290);
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}${d.toLocaleString('id-ID', { month: 'short' }).replace('.', '')}${d.getFullYear()}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    doc.save(`BAP_Internal_${noTiket.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`);
}

window.deleteArchive = async function(id) {
    if (!await GalasusDialog.confirm('AWAS! Apakah kamu yakin ingin menghapus Arsip Tiket (BAP) ini secara permanen?\n\nSemua foto bukti kerusakan dan perbaikan akan ikut terhapus dari harddisk server dan tidak bisa dikembalikan.')) {
        return;
    }

    const token = localStorage.getItem('galasus_token');
    try {
        const response = await fetch(`/tickets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showNotification('Arsip BAP dan foto-foto terkait berhasil dilenyapkan dari server.', 'success');
            loadInitialData(); // Muat ulang data
            closeDetailTiket(); // Tutup modal jika sedang terbuka
        } else {
            const data = await response.json();
            showNotification(data.message || 'Gagal menghapus arsip.', 'error');
        }
    } catch (error) {
        console.error('Error deleting archive:', error);
        showNotification('Terjadi kesalahan jaringan saat menghapus arsip.', 'error');
    }
};

// FUNGSI: Kontrol Sidebar Mobile
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
