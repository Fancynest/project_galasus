/**
 * =============================================================================
 * client.js — MANAJEMEN KLIEN & KONTRAK (Client Management)
 * =============================================================================
 *
 * Digunakan di: /views/clientmanagement.html
 * Hanya bisa diakses oleh role: "super admin"
 *
 * FUNGSI UTAMA:
 *   1. Menampilkan tabel seluruh klien (aktif & nonaktif) dengan filter & search
 *   2. Registrasi klien baru (nama perusahaan, PIC, paket, kuota tiket, kontrak)
 *   3. Edit profil klien tanpa menghapus data historis
 *   4. Aktivasi / Deaktivasi status klien
 *   5. Menampilkan detail klien + daftar aset + riwayat tiket per bulan
 *   6. Generate laporan bulanan klien ke PDF (menggunakan jsPDF, diproses di browser)
 *
 * API ENDPOINTS YANG DIPANGGIL:
 *   - GET    /clients             → Daftar semua klien
 *   - POST   /clients             → Registrasi klien baru
 *   - PUT    /clients/:id         → Edit profil klien
 *   - PUT    /clients/:id/deactivate → Nonaktifkan klien
 *   - PUT    /clients/:id/activate   → Aktifkan kembali klien
 *   - GET    /clients/:id/report  → Laporan tiket klien per bulan/tahun
 * =============================================================================
 */

/**
 * client.js
 * Modul Manajemen Klien
 * [MAINTENANCE] Modul ini menangani operasi CRUD untuk entitas klien dan lisensi.
 * Saat status klien diubah menjadi 'Inactive', maka otomatis lisensinya tidak akan dihitung di Dashboard Finance.
 */
let allClients = [];

document.addEventListener('DOMContentLoaded', () => {
    setupMobileSidebar();
    loadClients();

    // Set Header Name
    const name = localStorage.getItem('galasus_name') || 'Administrator';
    const role = localStorage.getItem('galasus_role') || 'Admin';
    let displayRole = role;
    if (role === 'super admin' || role === 'super_admin') displayRole = 'Administrator Utama';
    else if (role === 'technician') displayRole = 'Teknisi Lapangan';
    else if (role === 'finance') displayRole = 'Keuangan';
    else if (role === 'admin') displayRole = 'Admin Sistem';

    const headerName = document.getElementById('user-name');
    const headerRole = document.getElementById('user-role');
    const headerInit = document.getElementById('user-initials');
    if(headerName) headerName.textContent = name;
    if(headerRole) headerRole.textContent = displayRole;
    if(headerInit) headerInit.textContent = name.substring(0, 2).toUpperCase();

    const searchInput = document.getElementById('search-client');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderTable(allClients);
                return;
            }
            const keywords = query.split(/\s+/);
            const filtered = allClients.filter(c => {
                const searchableString = `
                    ${c.name || ''} 
                    ${c.pic || ''} 
                    ${c.phone || ''} 
                    ${c.package_type || ''} 
                    ${c.add_on_services || ''} 
                    ${c.assets || ''}
                `.toLowerCase();
                
                return keywords.every(kw => searchableString.includes(kw));
            });
            renderTable(filtered);
        });
    }

    const formAdd = document.getElementById('form-add-client');
    if (formAdd) formAdd.onsubmit = handleAddClient;
    
    const formEdit = document.getElementById('form-edit-client');
    if (formEdit) formEdit.onsubmit = handleEditClient;

    const formReport = document.getElementById('form-report');
    if (formReport) {
        formReport.onsubmit = (e) => {
            e.preventDefault();
            const cid = document.getElementById('report-client-id').value;
            const m = document.getElementById('report-month').value;
            const y = document.getElementById('report-year').value;
            generateMonthlyPDF(cid, m, y);
        };
    }
});

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

async function loadClients() {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch('/clients', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        allClients = Array.isArray(data) ? data : [];
        
        renderTable(allClients);
        updateStats(allClients);
    } catch (err) {
        console.error("Kegagalan memuat data klien:", err);
    }
}

async function handleAddClient(e) {
    e.preventDefault();
    const token = localStorage.getItem('galasus_token');
    
    const body = {
        name: document.getElementById('add-name').value,
        pic: document.getElementById('add-pic').value,
        phone: document.getElementById('add-phone').value,
        package_type: document.getElementById('add-package').value,
        ticket_quota: parseInt(document.getElementById('add-quota').value) || 0,
        ticket_used: 0,
        add_on_services: document.getElementById('add-addons').value,
        contract_end: document.getElementById('add-contract').value + "T00:00:00Z",
        assets: document.getElementById('add-assets').value
    };

    try {
        const res = await fetch('/clients', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            await GalasusDialog.alert("Provisi Klien: Dokumen kemitraan baru berhasil diregistrasikan ke dalam basis data utama.");
            closeAddModal();
            document.getElementById('form-add-client').reset();
            loadClients();
        } else {
            const errData = await res.json();
            await GalasusDialog.alert("Terjadi penolakan sistem:\n" + (errData.message || "Proses eksekusi digagalkan server."));
        }
    } catch (err) {
        await GalasusDialog.alert("Peringatan Kritis: Gagal membangun rute koneksi menuju peladen.");
    }
}

async function handleEditClient(e) {
    e.preventDefault();
    const token = localStorage.getItem('galasus_token');
    const id = document.getElementById('edit-id').value;
    
    const body = {
        name: document.getElementById('edit-name').value,
        pic: document.getElementById('edit-pic').value,
        phone: document.getElementById('edit-phone').value,
        package_type: document.getElementById('edit-package').value,
        ticket_quota: parseInt(document.getElementById('edit-quota').value) || 0,
        add_on_services: document.getElementById('edit-addons').value,
        contract_end: document.getElementById('edit-contract').value + "T00:00:00Z",
        assets: document.getElementById('edit-assets').value
    };

    try {
        const res = await fetch(`/clients/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            await GalasusDialog.alert("Modifikasi Berhasil: Profil entitas klien telah disinkronisasikan ulang dengan basis data.");
            closeEditModal();
            loadClients();
        } else {
            await GalasusDialog.alert("Peringatan Sistem: Gagal merekam perubahan ke dalam log utama.");
        }
    } catch (err) {
        await GalasusDialog.alert("Peringatan Kritis: Gagal membangun rute koneksi menuju peladen.");
    }
}

function renderTable(data) {
    const tbody = document.getElementById('client-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400 text-sm font-medium italic">Hasil kompilasi pencarian nihil. Direktori tidak ditemukan.</td></tr>`;
        return;
    }

    data.forEach(client => {
        const daysLeft = calculateDaysLeft(client.contract_end);
        const isWarning = daysLeft <= 30 && daysLeft > 0;
        const isExpired = daysLeft <= 0;
        const assetsCount = (client.assets && client.assets.trim() !== '') ? client.assets.trim().split(',').length : 0;

        let contractTxt = `<span class="text-slate-600 font-bold">${new Date(client.contract_end).toLocaleDateString('id-ID')}</span>`;
        if (isWarning) contractTxt = `<span class="text-red-500 font-black bg-red-50 px-2 py-1 rounded-md flex items-center justify-center gap-1 shadow-sm border border-red-100"><span class="material-symbols-outlined text-[14px]">warning</span> Tersisa ${daysLeft} Hari</span>`;
        if (isExpired) contractTxt = `<span class="text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md line-through flex items-center justify-center gap-1">Kedaluwarsa</span>`;

        const qTotal = client.ticket_quota || 1; 
        const qUsed = client.ticket_used || 0;
        const percentage = Math.min((qUsed / qTotal) * 100, 100);
        let barColor = 'bg-galasus-blue';
        if(percentage >= 80) barColor = 'bg-orange-500';
        if(percentage >= 100) barColor = 'bg-error';

        const quotaHtml = `
            <div class="text-[10px] md:text-[11px] font-black text-slate-900 mb-1.5 truncate tracking-tight uppercase" title="${client.package_type}">${client.package_type || 'Custom Tier'}</div>
            <div class="flex items-center gap-2">
                <div class="w-full bg-slate-200 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <div class="${barColor} h-full transition-all shadow-sm" style="width: ${percentage}%"></div>
                </div>
                <span class="text-[9px] md:text-[10px] font-black text-slate-500 whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded">${qUsed}/${qTotal}</span>
            </div>
        `;

        tbody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-50/70 transition-colors group">
                <td class="px-3 py-3 md:py-4 truncate">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 border border-slate-200 flex items-center justify-center font-black text-galasus-blue text-xs shadow-sm flex-shrink-0">${client.name ? client.name.substring(0,2).toUpperCase() : 'NA'}</div>
                        <span class="font-bold text-slate-900 text-xs md:text-sm tracking-tight truncate">${client.name || 'Data Kosong'}</span>
                    </div>
                </td>
                <td class="px-3 py-3 md:py-4 truncate">
                    <p class="font-bold text-slate-700 text-[11px] md:text-xs truncate">${client.pic}</p>
                    <p class="text-[9px] md:text-[10px] font-medium text-slate-400 font-mono mt-0.5 truncate">${client.phone}</p>
                </td>
                <td class="px-3 py-3 md:py-4">${quotaHtml}</td>
                <td class="px-3 py-3 md:py-4 text-center text-xs truncate">${contractTxt}</td>
                <td class="px-3 py-3 md:py-4 text-center truncate">
                    <span class="font-black text-slate-600 text-[10px] md:text-xs bg-slate-100 px-2 py-1 rounded-lg shadow-sm border border-slate-200">${assetsCount} Item</span>
                </td>
                <td class="px-3 py-3 md:py-4 text-right flex items-center justify-end gap-1.5 md:gap-2 h-full whitespace-nowrap">
                    ${(client.status || 'active') === 'active' 
                        ? `<span class="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider hidden sm:inline-block">Aktif</span>`
                        : `<span class="bg-slate-200 text-slate-500 border border-slate-300 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider hidden sm:inline-block">Ditangguhkan</span>`
                    }
                    
                    <button onclick="openDetail(${client.id})" class="text-galasus-blue hover:bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-colors shadow-sm uppercase tracking-wider" title="Audit Detail">Detail</button>
                    
                    <button onclick="openEditModal(${client.id})" class="text-amber-600 hover:bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-colors shadow-sm uppercase tracking-wider" title="Edit Data">Edit</button>

                    <button onclick="openReportModal(${client.id})" class="text-slate-600 hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-colors shadow-sm uppercase tracking-wider" title="Cetak Laporan">Laporan</button>

                    ${(client.status || 'active') === 'active' 
                        ? `<button onclick="deactivateClient(${client.id})" class="text-error hover:bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-colors shadow-sm uppercase tracking-wider"><span class="md:hidden material-symbols-outlined text-sm">block</span><span class="hidden md:inline">Blokir</span></button>` 
                        : `<button onclick="activateClient(${client.id})" class="text-emerald-600 hover:bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-colors shadow-sm uppercase tracking-wider"><span class="md:hidden material-symbols-outlined text-sm">verified</span><span class="hidden md:inline">Pulihkan</span></button>`
                    }
                </td>
            </tr>
        `);
    });
}

function calculateDaysLeft(date) {
    const diff = new Date(date) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function updateStats(data) {
    const activeData = data.filter(c => (c.status || 'active') === 'active');

    document.getElementById('stat-total').textContent = activeData.length;
    
    const limitClients = activeData.filter(c => (c.ticket_used / (c.ticket_quota || 1)) >= 0.9).length;
    document.getElementById('stat-limit').textContent = limitClients;
    
    const warningClients = activeData.filter(c => calculateDaysLeft(c.contract_end) <= 30 && calculateDaysLeft(c.contract_end) > 0).length;
    document.getElementById('stat-warning').textContent = warningClients;
    
    const totalAssets = activeData.reduce((sum, c) => sum + ((c.assets && c.assets.trim() !== '') ? c.assets.trim().split(',').length : 0), 0);
    document.getElementById('stat-assets').textContent = totalAssets;
}

function openDetail(id) {
    const c = allClients.find(i => i.id === id);
    if(!c) return;

    document.getElementById('det-name').textContent = c.name;
    document.getElementById('det-pic').textContent = `${c.pic} (${c.phone})`;
    
    document.getElementById('det-addons').textContent = c.add_on_services || 'Tidak ada layanan tambahan yang terdaftar.';
    
    const assetList = (c.assets && c.assets.trim() !== '') ? c.assets.trim().split(',').map(a => `
        <div class="flex items-center gap-3 p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <span class="material-symbols-outlined text-slate-400 text-sm">dns</span>
            <span class="text-sm font-medium text-slate-700">${a.trim()}</span>
        </div>
    `).join('') : '<p class="text-[10px] md:text-xs text-slate-400 italic p-2">Status Kosong: Belum ada aset jaringan (Node) yang diregistrasikan.</p>';
    
    document.getElementById('det-assets').innerHTML = assetList;
    
    const modal = document.getElementById('modal-detail');
    const content = document.getElementById('modal-content');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    void modal.offsetWidth;
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
        if(content) content.classList.remove('scale-95');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('modal-detail');
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

function openAddModal() {
    const modal = document.getElementById('modal-tambah-klien');
    const content = document.getElementById('modal-add-content');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    void modal.offsetWidth;
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
        if(content) content.classList.remove('scale-95');
    }, 10);
}

function closeAddModal() {
    const modal = document.getElementById('modal-tambah-klien');
    const content = document.getElementById('modal-add-content');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
    if(content) content.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function openEditModal(id) {
    const c = allClients.find(i => i.id === id);
    if(!c) return;

    document.getElementById('edit-id').value = c.id;
    document.getElementById('edit-name').value = c.name;
    document.getElementById('edit-pic').value = c.pic;
    document.getElementById('edit-phone').value = c.phone;
    document.getElementById('edit-package').value = c.package_type;
    document.getElementById('edit-quota').value = c.ticket_quota;
    document.getElementById('edit-contract').value = c.contract_end ? c.contract_end.split('T')[0] : '';
    document.getElementById('edit-addons').value = c.add_on_services || '';
    document.getElementById('edit-assets').value = c.assets || '';

    const modal = document.getElementById('modal-edit-klien');
    const content = document.getElementById('modal-edit-content');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    void modal.offsetWidth;
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
        if(content) content.classList.remove('scale-95');
    }, 10);
}

function closeEditModal() {
    const modal = document.getElementById('modal-edit-klien');
    const content = document.getElementById('modal-edit-content');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
    if(content) content.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

window.deactivateClient = async function(id) {
    if(!await GalasusDialog.confirm("Protokol Keamanan: Apakah Anda menyetujui penangguhan (Suspend) hak akses layanan kepada klien ini?\n\nCatatan: Direktori klien tetap tersimpan, namun operasional tiket bantuan akan dihentikan sementara.")) return;
    
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`/clients/${id}/deactivate`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            await GalasusDialog.alert("Operasi Dieksekusi: Status klien resmi ditangguhkan.");
            await loadClients(); 
        } else {
            await GalasusDialog.alert("Peringatan Sistem: Eksekusi penangguhan ditolak peladen utama.");
        }
    } catch (e) {
        await GalasusDialog.alert("Peringatan Kritis: Kehilangan interkoneksi ke peladen lokal.");
    }
}

window.activateClient = async function(id) {
    if(!await GalasusDialog.confirm("Protokol Pemulihan: Otorisasi re-aktivasi status operasional klien ini?\n\nAkses layanan bantuan dan penugasan tiket akan dikembalikan ke kondisi normal.")) return;
    
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`/clients/${id}/activate`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            await GalasusDialog.alert("Operasi Dieksekusi: Hak operasional klien telah dipulihkan.");
            await loadClients(); 
        } else {
            await GalasusDialog.alert("Peringatan Sistem: Kegagalan dalam proses pemulihan akses.");
        }
    } catch (e) {
        await GalasusDialog.alert("Peringatan Kritis: Kehilangan interkoneksi ke peladen lokal.");
    }
}

window.openReportModal = function(id) {
    document.getElementById('report-client-id').value = id;
    const now = new Date();
    document.getElementById('report-month').value = now.getMonth() + 1;
    document.getElementById('report-year').value = now.getFullYear();

    const modal = document.getElementById('modal-report');
    const content = document.getElementById('modal-report-content');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    void modal.offsetWidth;
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
        if(content) content.classList.remove('scale-95');
    }, 10);
}

window.closeReportModal = function() {
    const modal = document.getElementById('modal-report');
    const content = document.getElementById('modal-report-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
    if(content) content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

async function generateMonthlyPDF(clientId, month, year) {
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`/clients/${clientId}/report?month=${month}&year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            await GalasusDialog.alert("Gagal mengambil data laporan dari peladen.");
            return;
        }
        const data = await res.json();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const loadImage = (src) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            });
        };

        const logo = await loadImage('/public/photos/Logo-Galasus178x40.png');
        if(logo) doc.addImage(logo, 'PNG', 15, 12, 35, 8);
        doc.setFontSize(8); doc.setTextColor(40);
        doc.text("Jl. Raya Puspitek, Panorama Serpong, D2 14, Tangerang Selatan.", 15, 25);
        doc.text("info@galasus.com | WhatsApp: 0813-9977-7247", 15, 29);
        doc.setDrawColor(2, 116, 190); doc.line(15, 33, 195, 33);

        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(40);
        doc.text("REKAPITULASI TIKET BULANAN KLIEN", 105, 45, { align: 'center' });

        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const monthName = monthNames[parseInt(month) - 1];

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

        drawRow("INFORMASI UMUM", "", true);
        drawRow("Periode Laporan", `${monthName} ${year}`);
        drawRow("Entitas Pelanggan", data.client_name);
        drawRow("Total Kuota (Bulan Ini)", `${data.quota} Tiket`);
        drawRow("Pemakaian Tiket", `${data.used} Kasus`);
        drawRow("Sisa Kuota", `${data.remaining} Tiket`);

        y += 10;
        doc.setFillColor(2, 116, 190); doc.rect(15, y, 180, 9, 'F');
        doc.setTextColor(255); doc.text("DAFTAR TIKET PENUGASAN (REKAPITULASI)", 20, y + 6);
        y += 9;

        if (!data.tickets || data.tickets.length === 0) {
            doc.setDrawColor(220); doc.rect(15, y, 180, 10);
            doc.setTextColor(100); doc.setFont("helvetica", "italic");
            doc.text("Tidak ada tiket yang tercatat pada periode ini.", 20, y + 6);
            y += 10;
        } else {
            doc.setFillColor(240); doc.rect(15, y, 180, 8, 'F');
            doc.setTextColor(50); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
            doc.text("No Tiket", 18, y + 5);
            doc.text("Tanggal", 45, y + 5);
            doc.text("Masalah / Keluhan", 80, y + 5);
            doc.text("Status", 165, y + 5);
            y += 8;

            doc.setFont("helvetica", "normal");
            data.tickets.forEach(ticket => {
                const dateStr = new Date(ticket.created_at).toLocaleDateString('id-ID');
                const issueTxt = doc.splitTextToSize(ticket.masalah || '-', 80);
                const h = (issueTxt.length * 4) + 4;
                
                doc.setDrawColor(220); doc.rect(15, y, 180, h);
                doc.text(ticket.no_tiket || '-', 18, y + 5);
                doc.text(dateStr, 45, y + 5);
                doc.text(issueTxt, 80, y + 5);
                
                let status = ticket.status || 'open';
                doc.text(status.toUpperCase(), 165, y + 5);
                
                y += h;

                // Add new page if y is near bottom
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
        }

        const printTime = new Date().toLocaleString('id-ID');
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8); doc.setTextColor(150);
            doc.text(`Waktu Cetak Dokumen: ${printTime}`, 15, 290);
        }

        doc.save(`Laporan_Bulanan_${data.client_name.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`);
        closeReportModal();
    } catch (e) {
        await GalasusDialog.alert("Kegagalan pada peladen saat membuat dokumen PDF.");
    }
}
