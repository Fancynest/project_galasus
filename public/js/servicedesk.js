/**
 * servicedesk.js
 * Pusat Kendali Layanan Bantuan Galasus (Enterprise Grade)
 * FIX: UI Responsif Handlers, Retensi Logika Klien & Penghapusan Tiket.
 */

/**
 * servicedesk.js
 * [MAINTENANCE] Modul Sistem Tiket Layanan (ITSM).
 * State/Status Tiket: 'Open' -> 'In Progress' -> 'Solved' -> 'Closed' (diarsipkan).
 * Fungsi updateStatus menangani perpindahan status ini serta pencatatan log resolusi.
 */
let allTickets = [];

async function loadInitialData() {
    setupHeader();
    setupMobileSidebar(); // INISIALISASI UI MOBILE
    await loadClientsForDropdown(); 
    await loadTickets();
}

function setupHeader() {
    const name = localStorage.getItem('galasus_name') || 'Administrator';
    const role = localStorage.getItem('galasus_role') || 'Admin';
    if(document.getElementById('user-name')) document.getElementById('user-name').textContent = name;
    if(document.getElementById('welcome-name')) document.getElementById('welcome-name').textContent = name.split(' ')[0];
    let displayRole = role;
    if (role === 'super admin' || role === 'super_admin') displayRole = 'Administrator Utama';
    else if (role === 'technician') displayRole = 'Teknisi Lapangan';
    else if (role === 'finance') displayRole = 'Keuangan';
    else if (role === 'admin') displayRole = 'Admin Sistem';

    if(document.getElementById('user-role')) document.getElementById('user-role').textContent = displayRole;
    if(document.getElementById('user-initials')) document.getElementById('user-initials').textContent = name.substring(0, 2).toUpperCase();
}

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

// LOGIKA UTAMA: Mengambil data klien aktif untuk dropdown
async function loadClientsForDropdown() {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch('http://127.0.0.1:8081/clients', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if(!res.ok) throw new Error("Akses data klien ditolak peladen.");
        
        const clients = await res.json();
        const sel = document.getElementById('select-klien');
        if (sel) {
            sel.innerHTML = '<option value="">-- Mode Manual (Klien Tidak Terdaftar / Guest) --</option>';
            
            const activeClients = clients.filter(c => (c.status || 'active') === 'active');
            activeClients.forEach(c => {
                sel.insertAdjacentHTML('beforeend', `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`);
            });
        }
    } catch (e) { 
        console.error("Sistem gagal memuat pustaka klien:", e); 
    }
}

// LOGIKA UTAMA: Mengunci form input jika klien dipilih dari dropdown
window.toggleManualClient = function() {
    const sel = document.getElementById('select-klien');
    const inp = document.getElementById('input-pelanggan');
    if (sel.value) {
        inp.value = sel.options[sel.selectedIndex].getAttribute('data-name');
        inp.readOnly = true;
        inp.classList.add('bg-slate-100', 'text-slate-500');
    } else {
        inp.value = '';
        inp.readOnly = false;
        inp.classList.remove('bg-slate-100', 'text-slate-500');
    }
}

async function loadTickets() {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch('http://127.0.0.1:8081/tickets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) throw new Error("Akses daftar tiket ditolak.");
        const data = await res.json();
        allTickets = Array.isArray(data) ? data : [];
        
        updateServiceStats(allTickets);
        filterTable('default');
    } catch (err) {
        console.error("Kegagalan sinkronisasi tiket:", err);
        const tbody = document.getElementById('ticket-table-body');
        if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-error text-xs font-bold bg-red-50/50">Peringatan: Gagal memuat tabel insiden dari basis data utama.</td></tr>`;
    }
}

function filterTable(type) {
    let filtered = [];
    if (type === 'open') {
        filtered = allTickets.filter(t => (t.status || 'open').toLowerCase() === 'open');
    } else if (type === 'active') {
        filtered = allTickets.filter(t => ['assigned', 'on-progress', 'active'].includes((t.status || '').toLowerCase()));
    } else if (type === 'sla') {
        const now = new Date();
        filtered = allTickets.filter(t => !['closed', 'resolved', 'success'].includes((t.status || '').toLowerCase()) && t.sla_target && new Date(t.sla_target) < now);
    } else if (type === 'closed') {
        filtered = allTickets.filter(t => ['closed', 'resolved', 'success'].includes((t.status || '').toLowerCase()));
    } else {
        filtered = allTickets.filter(t => !['closed', 'resolved', 'success'].includes((t.status || 'open').toLowerCase()));
    }
    renderTicketTable(filtered);
}

function renderTicketTable(data) {
    const tbody = document.getElementById('ticket-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400 text-sm font-medium italic">Tidak ditemukan anomali operasional pada klasifikasi ini.</td></tr>`;
        return;
    }

    data.forEach(t => {
        const noTiket = t.no_tiket || t.ticket_id || t.NoTiket || `#SD-${t.id}`;
        const masalah = t.masalah || t.issue_description || "-";
        const pelanggan = t.pelanggan || t.Pelanggan || "Entitas Tidak Terdefinisi";
        const pRaw = (t.prioritas || t.priority || "info").toLowerCase();
        const currentStatus = (t.status || 'open').toLowerCase();
        
        let priorityClass = 'bg-slate-100 text-slate-600';
        if (pRaw === 'kritis' || pRaw === 'critical') priorityClass = 'bg-red-100 text-error border border-red-200';
        if (pRaw === 'tinggi' || pRaw === 'high') priorityClass = 'bg-amber-100 text-amber-700 border border-amber-200';

        let statusBadge = '';
        if (['closed', 'resolved', 'success'].includes(currentStatus)) {
            statusBadge = `<span class="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-wider shadow-sm">Ditutup</span>`;
        } else if (['assigned', 'on-progress', 'active'].includes(currentStatus)) {
            statusBadge = `<span class="px-2.5 py-1 rounded-md bg-blue-50 text-galasus-blue border border-blue-100 text-[9px] font-black uppercase tracking-wider shadow-sm">Dalam Proses</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-1 rounded-md bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black uppercase tracking-wider shadow-sm">Dialokasikan</span>`;
        }

        let slaDisplay = `Sisa ${t.sla || '2j'}`;
        let slaClass = "text-slate-500";
        if (!['closed', 'resolved', 'success'].includes(currentStatus) && t.sla_target) {
            const targetTime = new Date(t.sla_target);
            const now = new Date();
            const diffMs = targetTime - now;
            if (diffMs < 0) {
                const diffHrs = Math.floor(Math.abs(diffMs) / 3600000);
                const diffMins = Math.floor((Math.abs(diffMs) % 3600000) / 60000);
                slaDisplay = `<span class="text-error bg-red-50 px-2 py-1 rounded-md border border-red-100 shadow-sm">Terlambat ${diffHrs}j ${diffMins}m</span>`;
            } else {
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                slaDisplay = `Sisa ${diffHrs}j ${diffMins}m`;
            }
        } else if (['closed', 'resolved', 'success'].includes(currentStatus)) {
            slaDisplay = '-';
        }

        tbody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-50">
                <td class="px-4 md:px-6 py-3 md:py-4 font-bold text-slate-700 text-[11px] md:text-xs tracking-tight">${noTiket}</td>
                <td class="px-4 md:px-6 py-3 md:py-4">
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs md:text-sm font-bold text-slate-900">${pelanggan}</span>
                        <div>${statusBadge}</div>
                    </div>
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs text-slate-600 truncate max-w-[150px] md:max-w-[200px] leading-relaxed" title="${masalah}">${masalah}</td>
                <td class="px-4 md:px-6 py-3 md:py-4 text-center">
                    <span class="px-2 py-1 rounded-[4px] font-black uppercase text-[9px] md:text-[10px] tracking-widest ${priorityClass}">${pRaw}</span>
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4 text-center text-[10px] md:text-xs font-black tracking-tight ${slaClass}">
                    ${slaDisplay}
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4 text-right text-[11px] md:text-xs font-bold text-slate-800">${t.teknisi_name || '<span class="text-slate-400 italic font-medium">Menunggu Alokasi</span>'}</td>
                <td class="px-4 md:px-6 py-3 md:py-4 text-center">
                    <button onclick="openDetailTiket(${t.id})" class="text-galasus-blue hover:text-blue-700 hover:bg-blue-50 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-blue-200 transition-colors cursor-pointer mr-1" title="Detail & Progress Tiket">
                        <span class="material-symbols-outlined text-base md:text-lg">receipt_long</span>
                    </button>
                    <button onclick="deleteTicket(${t.id})" class="text-slate-400 hover:text-error hover:bg-red-50 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer" title="Hapus Dokumen & Kembalikan Kuota Klien">
                        <span class="material-symbols-outlined text-base md:text-lg">delete_sweep</span>
                    </button>
                </td>
            </tr>
        `);
    });
}

// LOGIKA UTAMA: Pengiriman form tiket ke basis data beserta integrasi Client ID
async function handleCreateTicket(e) {
    e.preventDefault();
    const token = localStorage.getItem('galasus_token');
    const tglManual = document.getElementById('input-tanggal-manual').value;
    const clientId = document.getElementById('select-klien').value;

    const body = {
        pelanggan: document.getElementById('input-pelanggan').value,
        masalah: document.getElementById('input-masalah').value,
        prioritas: document.getElementById('input-prioritas').value,
        sla: document.getElementById('input-sla').value + " Jam",
        created_at: (tglManual && tglManual !== new Date().toISOString().split('T')[0]) 
            ? new Date(tglManual + 'T01:00:00Z').toISOString() 
            : new Date().toISOString()
    };

    if (clientId) {
        body.client_id = parseInt(clientId);
    }

    try {
        const res = await fetch('http://127.0.0.1:8081/tickets', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            document.getElementById('form-tambah-tiket').reset();
            toggleManualClient(); 
            closeModal('modal-tambah-tiket');
            await GalasusDialog.alert("Sistem Otorisasi: Dokumen penugasan insiden berhasil diterbitkan ke dalam antrean aktif.");
            await loadTickets();
        } else {
            const errData = await res.json().catch(() => ({}));
            await GalasusDialog.alert("Peringatan Sistem: Gagal meregistrasikan tiket baru. Detail: " + (errData.message || "Unknown error"));
        }
    } catch (err) {
        await GalasusDialog.alert("Peringatan Kritis: Terputus dari peladen utama.");
    }
}

// LOGIKA UTAMA: Penghapusan tiket beserta pengembalian kuota layanan
window.deleteTicket = async function(id) {
    if(!await GalasusDialog.confirm("Konfirmasi Tindakan Destruktif: Apakah Anda menyetujui pemusnahan arsip tiket ini?\n\nCatatan Protokol: Apabila tiket terhubung secara administratif dengan Entitas Klien, sistem akan memulihkan kuota layanan (SLA) secara otomatis.")) return;
    
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/tickets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            await GalasusDialog.alert("Operasi Berhasil: Jejak tiket telah dihapus permanen dari sistem.");
            await loadTickets();
        } else {
            await GalasusDialog.alert("Peringatan Sistem: Otorisasi penghapusan ditolak.");
        }
    } catch (e) {
        await GalasusDialog.alert("Peringatan Kritis: Terputus dari peladen utama.");
    }
}

function updateServiceStats(data) {
    const available = data.filter(t => (t.status || 'open').toLowerCase() === 'open' || (t.status || '').toLowerCase() === 'available').length;
    const active = data.filter(t => ['assigned', 'on-progress', 'active'].includes((t.status || '').toLowerCase())).length;
    const resolved = data.filter(t => ['resolved', 'closed', 'success'].includes((t.status || '').toLowerCase())).length;
    const now = new Date();
    const slaViolations = data.filter(t => !['closed', 'resolved', 'success'].includes((t.status || '').toLowerCase()) && t.sla_target && new Date(t.sla_target) < now).length;
    
    const statOpen = document.getElementById('stat-open');
    const statActive = document.getElementById('stat-active');
    const statResolved = document.getElementById('stat-resolved');
    const statSla = document.getElementById('stat-sla');

    if(statOpen) statOpen.textContent = available;
    if(statActive) statActive.textContent = active;
    if(statResolved) statResolved.textContent = resolved;
    if(statSla) statSla.textContent = slaViolations;

    if(statOpen) {
        const card = statOpen.closest('.bg-white') || statOpen.parentElement;
        card.classList.add('cursor-pointer', 'hover:border-slate-400', 'transition-all');
        card.onclick = () => filterTable('open');
    }
    if(statActive) {
        const card = statActive.closest('.bg-white') || statActive.parentElement;
        card.classList.add('cursor-pointer', 'hover:border-blue-500', 'transition-all');
        card.onclick = () => filterTable('active');
    }
    if(statSla) {
        const card = statSla.closest('.bg-white') || statSla.parentElement;
        card.classList.add('cursor-pointer', 'hover:border-red-500', 'transition-all');
        card.onclick = () => filterTable('sla');
    }
    if(statResolved) {
        const card = statResolved.closest('.bg-white') || statResolved.parentElement;
        card.classList.add('cursor-pointer', 'hover:border-emerald-500', 'transition-all');
        card.onclick = () => filterTable('closed');
    }
}

function closeModal(id) { 
    const modal = document.getElementById(id);
    const content = document.getElementById('modal-content');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
    if(content) content.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function openModal(id) { 
    const modal = document.getElementById(id);
    const content = document.getElementById('modal-content');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if(content) content.classList.remove('scale-95');
        modal.classList.remove('pointer-events-none');
    }, 10);
    const today = new Date().toISOString().split('T')[0];
    const tglManual = document.getElementById('input-tanggal-manual');
    if(tglManual) tglManual.value = today;
    
    if (window.updateSLATarget) window.updateSLATarget();
}

let currentTicketId = null;

async function openDetailTiket(id) {
    const t = allTickets.find(ticket => ticket.id === id);
    if (!t) return;
    currentTicketId = id;

    const noTiket = t.no_tiket || t.ticket_id || t.NoTiket || `#SD-${t.id}`;
    document.getElementById('det-no-tiket').textContent = noTiket;
    document.getElementById('det-status').textContent = t.status || 'Open';
    document.getElementById('det-pelanggan').textContent = t.pelanggan || t.Pelanggan || 'Klien Tidak Terdefinisi';
    document.getElementById('det-masalah').textContent = t.masalah || t.issue_description || '-';

    openModal('modal-detail-tiket');

    // Fetch logs
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/tickets/${id}/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const logs = await res.json();
        const tl = document.getElementById('det-timeline');
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

async function promptHandoff() {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch('http://127.0.0.1:8081/technicians', {
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
            const assignRes = await fetch(`http://127.0.0.1:8081/tickets/${currentTicketId}/assign`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_user_id: parseInt(selectedId) })
            });
            if (assignRes.ok) {
                await GalasusDialog.alert("Tiket berhasil dipindahtangankan.");
                await loadTickets();
                openDetailTiket(currentTicketId); // Refresh logs
            } else {
                await GalasusDialog.alert("Gagal memindahtangankan tiket.");
            }
        }
    } catch (e) {
        await GalasusDialog.alert("Gagal memuat daftar teknisi.");
    }
}

async function promptExtendSLA() {
    if (!currentTicketId) return;

    const options = [
        { value: "2", label: "+2 Jam (Mendesak)" },
        { value: "6", label: "+6 Jam (Setengah Hari Kerja)" },
        { value: "12", label: "+12 Jam" },
        { value: "24", label: "+24 Jam (1 Hari)" },
        { value: "48", label: "+48 Jam (2 Hari)" },
        { value: "72", label: "+72 Jam (3 Hari)" },
        { value: "168", label: "+168 Jam (1 Minggu)" }
    ];

    const selectedHours = await GalasusDialog.promptSelect(
        "Pilih durasi tambahan waktu untuk batas SLA tiket ini:",
        options
    );

    if (selectedHours) {
        const token = localStorage.getItem('galasus_token');
        try {
            const res = await fetch(`http://127.0.0.1:8081/tickets/${currentTicketId}/extend-sla`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ hours: parseInt(selectedHours) })
            });

            if (res.ok) {
                await GalasusDialog.alert("Batas waktu SLA berhasil diperpanjang.");
                await loadTickets();
                openDetailTiket(currentTicketId); // Refresh logs & details
            } else {
                const errData = await res.json().catch(() => ({}));
                await GalasusDialog.alert("Gagal memperpanjang SLA: " + (errData.message || "Unknown error"));
            }
        } catch (e) {
            await GalasusDialog.alert("Terjadi kesalahan jaringan.");
        }
    }
}

async function handleAddLog(e) {
    e.preventDefault();
    if (!currentTicketId) return;

    const token = localStorage.getItem('galasus_token');
    const desc = document.getElementById('input-log-desc').value;

    try {
        const res = await fetch(`http://127.0.0.1:8081/tickets/${currentTicketId}/logs`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: desc })
        });
        
        if (res.ok) {
            document.getElementById('form-tambah-log').reset();
            openDetailTiket(currentTicketId); // Refresh logs
        }
    } catch (e) {
        await GalasusDialog.alert("Gagal mengirim catatan progres.");
    }
}

// INISIALISASI
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();

    // Dual Search Handler (Mobile & Desktop)
    const handleSearch = (e) => {
        const kw = e.target.value.toLowerCase();
        const filtered = allTickets.filter(t => 
            (t.no_tiket || '').toLowerCase().includes(kw) || 
            (t.pelanggan || '').toLowerCase().includes(kw) || 
            (t.masalah || '').toLowerCase().includes(kw)
        );
        renderTicketTable(filtered);
    };

    const searchDesktop = document.getElementById('search-ticket');
    const searchMobile = document.getElementById('search-ticket-mobile');
    
    if(searchDesktop) searchDesktop.addEventListener('input', handleSearch);
    if(searchMobile) searchMobile.addEventListener('input', handleSearch);

    const form = document.getElementById('form-tambah-tiket');
    if (form) form.onsubmit = handleCreateTicket;

    const btnAdd = document.getElementById('btn-tambah-tiket');
    if (btnAdd) btnAdd.onclick = () => openModal('modal-tambah-tiket');

    const formLog = document.getElementById('form-tambah-log');
    if (formLog) formLog.onsubmit = handleAddLog;

    // SLA Automation Logic
    const prioritySelect = document.getElementById('input-prioritas');
    const slaInput = document.getElementById('input-sla');
    const slaTargetText = document.getElementById('sla-target-text');
    const tanggalManual = document.getElementById('input-tanggal-manual');

    window.updateSLATarget = function() {
        if (!slaInput || !slaTargetText) return;
        const hours = parseInt(slaInput.value) || 0;
        
        let targetDate = new Date();
        if (tanggalManual && tanggalManual.value && tanggalManual.value !== new Date().toISOString().split('T')[0]) {
             targetDate = new Date(tanggalManual.value + 'T08:00:00'); 
        }
        targetDate.setHours(targetDate.getHours() + hours);

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        slaTargetText.textContent = `Target Penyelesaian: ${targetDate.toLocaleDateString('id-ID', options)} WIB`;
        slaTargetText.classList.remove('hidden');
    };

    if (prioritySelect) {
        prioritySelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'Kritis') slaInput.value = 2;
            else if (val === 'Tinggi') slaInput.value = 4;
            else if (val === 'Info') slaInput.value = 24;
            
            window.updateSLATarget();
        });
    }

    if (slaInput) {
        slaInput.addEventListener('input', window.updateSLATarget);
    }
    
    if (tanggalManual) {
        tanggalManual.addEventListener('change', window.updateSLATarget);
    }
});