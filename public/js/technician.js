/**
 * technician.js - Galasus Technician Portal
 * UPDATED: Responsive Mobile Navbar & Enterprise Wording
 */

let allTickets = [];
let currentFilter = 'active'; 
let searchQuery = ''; 

document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    setupMobileSidebar(); // INISIALISASI: Fungsionalitas Navigasi Layar Sentuh
    handlePreview('upload-before', 'preview-before');
    handlePreview('upload-after', 'preview-after');

    document.getElementById('nav-active').onclick = () => switchTab('active', 'nav-active');
    document.getElementById('nav-history').onclick = () => switchTab('closed', 'nav-history');

    const reportForm = document.getElementById('tech-report-form');
    if (reportForm) {
        reportForm.onsubmit = (e) => { e.preventDefault(); submitFinalWork(); };
    }

    const techLogForm = document.getElementById('tech-log-form');
    if (techLogForm) {
        techLogForm.onsubmit = handleAddLog;
    }

    const searchInput = document.getElementById('search-ticket');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderTicketList(); 
        });
    }

    loadTickets();
    setInterval(checkNotifications, 30000); 
});

// LOGIKA: Pengontrol navigasi sidebar untuk perangkat seluler
function setupMobileSidebar() {
    const btnOpen = document.getElementById('open-sidebar-btn');
    const btnClose = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    const toggleMenu = () => {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    };

    if(btnOpen) btnOpen.onclick = toggleMenu;
    if(btnClose) btnClose.onclick = toggleMenu;
    if(overlay) overlay.onclick = toggleMenu;
}

function setupHeader() {
    const name = localStorage.getItem('galasus_name') || 'Teknisi';
    const role = localStorage.getItem('galasus_role') || 'Teknisi';
    if(document.getElementById('user-name')) document.getElementById('user-name').textContent = name; 
    let displayRole = role;
    if (role === 'super admin' || role === 'super_admin') displayRole = 'Administrator Utama';
    else if (role === 'technician') displayRole = 'Teknisi Lapangan';
    else if (role === 'finance') displayRole = 'Keuangan';
    else if (role === 'admin') displayRole = 'Admin Sistem';

    if(document.getElementById('user-role')) document.getElementById('user-role').textContent = displayRole;
    if(document.getElementById('user-initials')) document.getElementById('user-initials').textContent = name.substring(0, 2).toUpperCase();
}

function switchTab(status, navId) {
    currentFilter = status;
    
    searchQuery = '';
    const searchInput = document.getElementById('search-ticket');
    if (searchInput) searchInput.value = '';

    ['nav-active', 'nav-history'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-500";
    });
    document.getElementById(navId).className = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-galasus-blue text-white";
    
    // Menutup menu otomatis setelah navigasi pada perangkat seluler
    if(window.innerWidth < 768) {
        document.getElementById('mobile-sidebar').classList.add('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    }

    renderTicketList(); 
}

async function loadTickets() {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch('/tickets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        allTickets = Array.isArray(data) ? data : [];
        
        renderTicketList();
        checkNotifications();
    } catch (err) { console.error(err); }
}

function renderTicketList() {
    const container = document.getElementById('technician-ticket-list');
    if (!container) return;
    container.innerHTML = ''; 

    const filtered = allTickets.filter(t => {
        const s = (t.status || t.Status || 'open').toLowerCase();
        let matchTab = false;
        
        if (currentFilter === 'active') matchTab = (s === 'open' || s === 'on-progress');
        if (currentFilter === 'closed') matchTab = (s === 'closed' || s === 'resolved' || s === 'success');

        let matchSearch = true;
        if (searchQuery !== '') {
            const keywords = searchQuery.split(/\s+/);
            const searchableString = `
                ${t.no_tiket || t.NoTiket || t.ticket_id || ''} 
                ${t.pelanggan || t.Pelanggan || ''} 
                ${t.masalah || t.Masalah || ''} 
                ${t.status || t.Status || ''}
            `.toLowerCase();
            matchSearch = keywords.every(kw => searchableString.includes(kw));
        }

        return matchTab && matchSearch;
    });

    const ticketCount = document.getElementById('ticket-count');
    if (ticketCount) ticketCount.textContent = `${filtered.length} Penugasan`;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400 italic text-sm">Tidak ada catatan penugasan yang ditemukan.</div>';
        return;
    }

    filtered.forEach(t => {
        const pelanggan = t.pelanggan || t.Pelanggan || 'Tanpa Identitas';
        const noTiket = t.no_tiket || t.NoTiket || t.ticket_id || `#T-${t.id}`;
        const statusStr = (t.status || 'open').toLowerCase();
        
        const myName = localStorage.getItem('galasus_name');
        const isMyTicket = (!t.teknisi_name || t.teknisi_name === myName);
        
        let actionBtn = '';
        let statusBadge = '';

        if (!isMyTicket && statusStr !== 'closed' && statusStr !== 'resolved' && statusStr !== 'success') {
            statusBadge = `<span class="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">Didelegasikan ke ${t.teknisi_name}</span>`;
            actionBtn = `<button type="button" onclick="viewLogOnly('${t.id}', '${noTiket}', '${pelanggan}')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md transition-all">Lihat Riwayat</button>`;
        } else {
            if (statusStr === 'open') {
                statusBadge = `<span class="px-2 py-1 bg-orange-100 text-orange-600 rounded-md text-[10px] font-bold">Menunggu Alokasi</span>`;
                actionBtn = `<button type="button" onclick="takeTicket('${t.id}')" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md transition-all">Terima Penugasan</button>`;
            } else if (statusStr === 'on-progress') {
                statusBadge = `<span class="px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-[10px] font-bold">Tahap Pengerjaan</span>`;
                actionBtn = `
                    <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button type="button" onclick="finishTicket('${t.id}', '${noTiket}', '${pelanggan}')" class="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md transition-all">Buka Ruang Kerja</button>
                    </div>`;
            } else {
                statusBadge = `<span class="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-md text-[10px] font-bold">Selesai</span>`;
                actionBtn = `<button onclick="generatePDF('${t.id}')" class="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-md transition-all"><span class="material-symbols-outlined text-sm">download</span> Unduh Bukti</button>`;
            }
        }

        container.insertAdjacentHTML('beforeend', `
            <div class="glass-card p-4 md:p-5 rounded-xl border-l-4 ${statusStr === 'on-progress' ? 'border-l-blue-500 bg-blue-50/50' : 'border-l-slate-300'} mb-3 md:mb-4">
                <div class="flex justify-between items-start mb-3 md:mb-4">
                    <div class="flex gap-3 md:gap-4 w-full">
                        <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black text-xs uppercase shrink-0">${pelanggan.substring(0,2)}</div>
                        <div class="overflow-hidden">
                            <h3 class="font-bold text-slate-900 text-sm md:text-base truncate">${t.masalah || t.Masalah || 'Penanganan Kendala Teknis'}</h3>
                            <p class="text-xs text-slate-500 truncate">${pelanggan}</p>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 md:mt-4 border-t border-slate-100 pt-3 md:pt-4">
                    <div class="flex items-center gap-2 text-slate-500 text-xs">
                        <span class="font-bold">${noTiket}</span> • ${statusBadge}
                    </div>
                    ${actionBtn}
                </div>
            </div>
        `);
    });
}

async function takeTicket(dbId) {
    const isConfirmed = await GalasusDialog.confirm("Konfirmasi Penerimaan: Apakah Anda siap untuk mengambil tanggung jawab penyelesaian pada tiket ini?");
    if(!isConfirmed) return;
    const token = localStorage.getItem('galasus_token');
    
    try {
        const res = await fetch(`/tickets/take/${dbId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            loadTickets(); 
        } else {
            await GalasusDialog.alert("Operasi ditolak: Gagal mengalokasikan tiket.");
        }
    } catch(e) { await GalasusDialog.alert("Kegagalan pada server internal."); }
}

function viewLogOnly(dbId, noTiket, pelanggan) {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('tech-timeline-section').classList.remove('hidden');
    document.getElementById('tech-report-form').classList.add('hidden'); 
    
    const logForm = document.getElementById('tech-log-form');
    if (logForm) logForm.classList.remove('hidden');
    
    const delegBtn = document.querySelector('button[onclick="promptHandoff()"]');
    if (delegBtn) delegBtn.classList.add('hidden');

    loadTicketLogs(dbId);
    
    const titleElem = document.getElementById('active-ticket-title');
    if (titleElem) {
        titleElem.textContent = `Akses Riwayat BAP: ${noTiket} - ${pelanggan}`;
        titleElem.setAttribute('data-active-id', dbId);
    }
}

function finishTicket(dbId, noTiket, pelanggan) {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('tech-timeline-section').classList.remove('hidden');
    document.getElementById('tech-report-form').classList.remove('hidden');
    
    const logForm = document.getElementById('tech-log-form');
    if (logForm) logForm.classList.remove('hidden');
    const delegBtn = document.querySelector('button[onclick="promptHandoff()"]');
    if (delegBtn) delegBtn.classList.remove('hidden');
    
    loadTicketLogs(dbId);
    
    const titleElem = document.getElementById('active-ticket-title');
    if (titleElem) {
        titleElem.textContent = `Penyusunan BAP: ${noTiket} - ${pelanggan}`;
        titleElem.setAttribute('data-active-id', dbId);
        document.getElementById('tech-report-form').reset();
        
        const pb = document.getElementById('preview-before');
        const pa = document.getElementById('preview-after');
        if(pb) { pb.classList.add('hidden'); pb.querySelector('img').src = ''; }
        if(pa) { pa.classList.add('hidden'); pa.querySelector('img').src = ''; }
        
        // Eksekusi auto-scroll untuk optimalisasi antarmuka seluler
        if(window.innerWidth < 768) {
            document.getElementById('tech-report-form').scrollIntoView({behavior: 'smooth'});
        }
    }
}

async function submitFinalWork() {
    const token = localStorage.getItem('galasus_token');
    const ticketId = document.getElementById('active-ticket-title').getAttribute('data-active-id');
    if (!ticketId) return GalasusDialog.alert("Peringatan: Silakan pilih tiket penugasan terlebih dahulu.");
    
    const isConfirmed = await GalasusDialog.confirm("Anda yakin ingin memverifikasi dan menyimpan laporan ini? Setelah disahkan, tiket ini akan ditutup secara permanen.");
    if (!isConfirmed) return;
    
    const formData = new FormData();
    formData.append('lokasi', document.getElementById('input-lokasi').value);
    formData.append('diagnostik', document.getElementById('input-diagnostik').value);
    formData.append('tindakan', document.getElementById('input-tindakan').value);
    formData.append('inventaris', document.getElementById('input-inventaris').value);
    
    const fb = document.getElementById('upload-before').files[0];
    const fa = document.getElementById('upload-after').files[0];
    if (fb) formData.append('foto_before', fb);
    if (fa) formData.append('foto_after', fa);
    
    try {
        const res = await fetch(`/tickets/report/${ticketId}`, {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` }, 
            body: formData 
        });
        if (res.ok) { 
            await GalasusDialog.alert("Sistem: Dokumen penyelesaian tugas berhasil disahkan dan tiket resmi ditutup."); 
            window.location.reload(); 
        } else {
            await GalasusDialog.alert("Operasi Gagal: Laporan gagal terekam pada basis data.");
        }
    } catch (err) { await GalasusDialog.alert("Kegagalan pada server internal."); }
}

async function loadTicketLogs(id) {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`/tickets/${id}/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const logs = await res.json();
        const tl = document.getElementById('tech-timeline');
        tl.innerHTML = '';
        
        if (!logs || logs.length === 0) {
            tl.innerHTML = '<div class="text-xs text-slate-400 italic pl-4 py-2">Belum ada riwayat aktivitas.</div>';
        } else {
            logs.forEach(log => {
                const date = new Date(log.created_at).toLocaleString('id-ID');
                let badgeClass = "bg-blue-50 text-galasus-blue";
                if (log.action_type === 'Handoff') badgeClass = "bg-amber-50 text-amber-600";
                
                tl.insertAdjacentHTML('beforeend', `
                    <div class="relative pl-6 pb-4">
                        <div class="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold text-slate-800">${log.user_name}</span>
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${badgeClass}">${log.action_type}</span>
                            <span class="text-[10px] text-slate-400 ml-auto font-mono">${date}</span>
                        </div>
                        <p class="text-xs text-slate-600 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 shadow-sm mt-1.5">${log.description}</p>
                    </div>
                `);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function handleAddLog(e) {
    e.preventDefault();
    const ticketId = document.getElementById('active-ticket-title').getAttribute('data-active-id');
    if (!ticketId) return;

    const token = localStorage.getItem('galasus_token');
    const desc = document.getElementById('tech-log-desc').value;

    try {
        const res = await fetch(`/tickets/${ticketId}/logs`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: desc })
        });
        
        if (res.ok) {
            document.getElementById('tech-log-form').reset();
            loadTicketLogs(ticketId);
        }
    } catch (e) {
        await GalasusDialog.alert("Gagal mengirim catatan progres.");
    }
}

async function promptHandoff() {
    const ticketId = document.getElementById('active-ticket-title').getAttribute('data-active-id');
    if (!ticketId) return;

    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch('/technicians', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const techs = await res.json();
        
        let options = techs.map(t => {
            let label = t.full_name;
            let disabled = false;
            if (t.status === 'suspended') {
                label += ' (Ditangguhkan)';
                disabled = true;
            }
            return { value: t.user_id, label: label, disabled: disabled };
        });
        
        let selectedId = await GalasusDialog.promptSelect("Pilih Teknisi Tujuan untuk melanjutkan delegasi:", options);
        
        if (selectedId) {
            const assignRes = await fetch(`/tickets/${ticketId}/assign`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_user_id: parseInt(selectedId) })
            });
            if (assignRes.ok) {
                await GalasusDialog.alert("Tiket berhasil dipindahtangankan.");
                window.location.reload(); 
            } else {
                await GalasusDialog.alert("Gagal memindahtangankan tiket.");
            }
        }
    } catch (e) {
        await GalasusDialog.alert("Gagal memuat daftar teknisi.");
    }
}

/**
 * PDF GENERATOR - Enterprise Template
 */
async function generatePDF(ticketId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const t = allTickets.find(ticket => ticket.id == ticketId);
    if (!t) return;

    const loadImage = (src) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    };

    const getVal = (keys) => {
        for (let key of keys) {
            for (let prop in t) {
                if (prop.toLowerCase() === key.toLowerCase() && t[prop]) return t[prop];
            }
        }
        return "-";
    };

    const logo = await loadImage('/public/photos/Logo-Galasus178x40.png');
    if(logo) doc.addImage(logo, 'PNG', 15, 12, 35, 8);
    doc.setFontSize(8); doc.setTextColor(40);
    doc.text("Jl. Raya Puspitek, Panorama Serpong, D2 14, Tangerang Selatan.", 15, 25);
    doc.text("info@galasus.com | WhatsApp: 0813-9977-7247", 15, 29);
    doc.setDrawColor(2, 116, 190); doc.line(15, 33, 195, 33);

    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(40);
    doc.text("BERITA ACARA PENYELESAIAN TUGAS (BAP)", 105, 45, { align: 'center' });

    let y = 55;
    const drawRow = (label, value, isHeader = false) => {
        const valStr = value ? value.toString() : "-";
        const txt = doc.splitTextToSize(valStr, 110);
        const h = isHeader ? 9 : (txt.length * 5) + 4;
        
        if(isHeader) {
            doc.setFillColor(2, 116, 190); doc.rect(15, y, 180, h, 'F');
            doc.setTextColor(255); doc.setFontSize(9);
            doc.text(label, 20, y + 6); doc.text("URAIAN DOKUMEN", 70, y + 6);
        } else {
            doc.setDrawColor(220); doc.rect(15, y, 180, h);
            doc.setFont("helvetica", "bold"); doc.setTextColor(50);
            doc.text(label, 20, y + 6);
            doc.setFont("helvetica", "normal"); doc.text(txt, 70, y + 6);
        }
        y += h;
    };

    drawRow("INDEKS", "", true);
    drawRow("No. Registrasi Tiket", getVal(['NoTiket', 'no_tiket', 'ticket_id']));
    drawRow("Entitas Pelanggan", getVal(['Pelanggan', 'pelanggan']));
    drawRow("Sifat Penanganan", getVal(['LokasiPengerjaan', 'lokasi', 'lokasi_pengerjaan']));
    drawRow("Keluhan/Insiden", getVal(['Masalah', 'masalah', 'issue_description']));
    drawRow("Hasil Diagnostik", getVal(['Diagnostik', 'diagnostik']));
    drawRow("Tindakan Korektif", getVal(['Tindakan', 'tindakan']));
    drawRow("Alokasi Perangkat", getVal(['Inventaris', 'inventaris']));

    y += 10;
    doc.setFillColor(2, 116, 190); doc.rect(15, y, 180, 9, 'F');
    doc.setTextColor(255); doc.text("LAMPIRAN BUKTI VISUAL (DOKUMENTASI)", 20, y + 6);
    y += 9;
    doc.setDrawColor(220); doc.rect(15, y, 90, 9); doc.rect(105, y, 90, 9);
    doc.setTextColor(40); doc.text("Kondisi Awal (Terdampak)", 35, y + 6); doc.text("Hasil Akhir (Telah Dipulihkan)", 120, y + 6);
    y += 9;

    const base = "";
    const imgB = await loadImage(base + getVal(['FotoBefore', 'foto_before']));
    const imgA = await loadImage(base + getVal(['FotoAfter', 'foto_after']));

    if(imgB) doc.addImage(imgB, 'JPEG', 16, y + 1, 88, 58);
    else doc.text("Berkas Tidak Dilampirkan", 40, y + 30);

    if(imgA) doc.addImage(imgA, 'JPEG', 106, y + 1, 88, 58);
    else doc.text("Berkas Tidak Dilampirkan", 130, y + 30);
    
    doc.rect(15, y, 90, 60); doc.rect(105, y, 90, 60);

    const printTime = new Date().toLocaleString('id-ID');
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Waktu Cetak Dokumen: ${printTime}`, 15, 290);
    }

    doc.save(`BAP_Teknisi_${getVal(['NoTiket', 'no_tiket', 'ticket_id'])}.pdf`);
}

function handlePreview(id, pid) {
    const i = document.getElementById(id), c = document.getElementById(pid);
    if(i) i.onchange = () => {
        if(!i.files[0]) return;
        const r = new FileReader();
        r.onload = (e) => { c.querySelector('img').src = e.target.result; c.classList.remove('hidden'); };
        r.readAsDataURL(i.files[0]);
    };
}

function resetUpload(type) {
    const input = document.getElementById(`upload-${type}`);
    const preview = document.getElementById(`preview-${type}`);
    if (input) input.value = '';
    if (preview) {
        preview.classList.add('hidden');
        preview.querySelector('img').src = '';
    }
}

function checkNotifications() {
    const hasOpen = allTickets.some(t => (t.status || t.Status || 'open').toLowerCase() === 'open');
    const dot = document.getElementById('notif-dot');
    if(dot) dot.classList.toggle('hidden', !hasOpen);
}
