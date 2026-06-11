document.addEventListener('DOMContentLoaded', async () => {
    console.log('[SISTEM] Menginisialisasi modul Dasbor Eksekutif...');
    setupMobileSidebar();

    const token = localStorage.getItem('galasus_token');
    if (!token) return; 

    // Set Header Info
    const userName = localStorage.getItem('galasus_name') || 'Administrator';
    if(document.getElementById('user-name')) document.getElementById('user-name').textContent = userName;
    const role = localStorage.getItem('galasus_role') || '';
    let displayRole = role;
    if (role === 'super admin' || role === 'super_admin') displayRole = 'Administrator Utama';
    else if (role === 'technician') displayRole = 'Teknisi Lapangan';
    else if (role === 'finance') displayRole = 'Keuangan';
    else if (role === 'admin') displayRole = 'Admin Sistem';

    if(document.getElementById('user-role')) document.getElementById('user-role').textContent = displayRole;
    if(document.getElementById('user-initials')) document.getElementById('user-initials').textContent = userName.substring(0, 2).toUpperCase();

    try {
        // Memanggil API Aggregator Utama
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Penolakan akses atau asinkronisasi API');
        const data = await response.json();

        // 1. Inisialisasi Modul Metrik Statistik
        document.getElementById('stat-proyek').textContent = data.statistik.proyek_aktif;
        document.getElementById('stat-tiket').textContent = data.statistik.tiket_bantuan;
        document.getElementById('stat-insiden').textContent = data.statistik.insiden_kritis;
        
        // Konversi nilai integer ke format mata uang IDR (Cth: Rp 15.000.000)
        const formatRupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.statistik.pendapatan);
        document.getElementById('stat-pendapatan').textContent = formatRupiah;

        // 2. Inisialisasi Tabel Kuota Klien
        const tbody = document.getElementById('tabel-klien-terbaru');
        tbody.innerHTML = ''; 

        // Iterasi dan render baris klien dari basis data
        if(data.klien_terbaru && data.klien_terbaru.length > 0) {
            data.klien_terbaru.forEach(klien => {
                
                // Kalkulasi persentase kuota (menghindari pembagian dengan nol)
                const persen = klien.ticket_quota > 0 ? (klien.ticket_used / klien.ticket_quota) * 100 : 0;
                // Validasi ambang batas kuota (>80%) untuk peringatan visual
                const warnaBar = persen > 80 ? 'bg-error' : 'bg-galasus-blue';
                const statusBadge = klien.status === 'active' 
                    ? '<span class="px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">Aktif</span>' 
                    : '<span class="px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-red-50 text-error border border-red-100">Ditangguhkan</span>';

                const tr = `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <td class="px-4 md:px-6 py-3 md:py-4">
                            <p class="text-xs md:text-sm font-bold text-slate-900">${klien.name}</p>
                            <p class="text-[9px] md:text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wide">${klien.package_type}</p>
                        </td>
                        <td class="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-slate-600">${klien.pic}</td>
                        <td class="px-4 md:px-6 py-3 md:py-4">${statusBadge}</td>
                        <td class="px-4 md:px-6 py-3 md:py-4">
                            <div class="flex items-center gap-3">
                                <div class="flex-1 bg-slate-100 h-1.5 md:h-2 rounded-full overflow-hidden border border-slate-200">
                                    <div class="${warnaBar} h-full transition-all duration-1000 shadow-sm" style="width: ${persen}%"></div>
                                </div>
                                <span class="text-[10px] md:text-[11px] font-black text-slate-700 w-12 text-right">${klien.ticket_used} / ${klien.ticket_quota}</span>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 text-sm font-medium italic">Direktori klien kosong. Belum ada rekam jejak kemitraan.</td></tr>`;
        }

    } catch (error) {
        console.error('[SISTEM ERROR] Sinkronisasi telemetri gagal:', error);
        const tbody = document.getElementById('tabel-klien-terbaru');
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-error text-xs md:text-sm font-bold bg-red-50/50">Peringatan Kritis: Terputus dari peladen utama basis data.</td></tr>`;
    }

    // 3. Fetch Audit Logs (CCTV)
    try {
        const resAudit = await fetch('/audit-logs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resAudit.ok) {
            const logs = await resAudit.json();
            const logBody = document.getElementById('tabel-audit-log');
            if (logBody) {
                logBody.innerHTML = '';
                if (logs.length > 0) {
                    logs.forEach(log => {
                        const dateObj = new Date(log.created_at);
                        const timeStr = dateObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        let actionBadge = `<span class="text-slate-900 font-bold text-xs">${log.action}</span>`;
                        if (log.action.includes('Delete')) actionBadge = `<span class="text-error font-bold text-xs">${log.action}</span>`;
                        if (log.action.includes('Create') || log.action.includes('Login')) actionBadge = `<span class="text-emerald-600 font-bold text-xs">${log.action}</span>`;

                        const tr = `
                            <tr class="hover:bg-slate-50/50 border-b border-slate-50">
                                <td class="px-4 md:px-6 py-2 text-[10px] md:text-xs text-slate-500 font-medium whitespace-nowrap">${timeStr}</td>
                                <td class="px-4 md:px-6 py-2">
                                    <p class="text-xs font-bold text-slate-900">${log.user_name}</p>
                                    <p class="text-[9px] text-slate-400 uppercase tracking-wide">${log.role}</p>
                                </td>
                                <td class="px-4 md:px-6 py-2 text-xs font-semibold text-slate-600"><span class="bg-slate-100 px-2 py-1 rounded-md text-[10px] uppercase border border-slate-200">${log.module}</span></td>
                                <td class="px-4 md:px-6 py-2">
                                    ${actionBadge}
                                    <p class="text-[10px] md:text-xs text-slate-500 mt-0.5">${log.description}</p>
                                </td>
                            </tr>
                        `;
                        logBody.insertAdjacentHTML('beforeend', tr);
                    });
                } else {
                    logBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 text-sm italic">Belum ada rekaman aktivitas.</td></tr>`;
                }
            }
        }
    } catch (error) {
        console.error('[CCTV ERROR]', error);
        const logBody = document.getElementById('tabel-audit-log');
        if(logBody) logBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-error text-xs md:text-sm font-bold bg-red-50/50">Gagal memuat log.</td></tr>`;
    }
});

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

// FUNGSI: CCTV Filter UI
function toggleCustomDates() {
    const filter = document.getElementById('cctv-filter').value;
    const customDiv = document.getElementById('custom-date-inputs');
    if (filter === 'custom') {
        customDiv.classList.remove('hidden');
        customDiv.classList.add('flex');
    } else {
        customDiv.classList.add('hidden');
        customDiv.classList.remove('flex');
    }
}

function getCCTVFilterDates() {
    const filter = document.getElementById('cctv-filter').value;
    const end = new Date();
    let start = new Date();

    if (filter === '1month') {
        start.setMonth(start.getMonth() - 1);
    } else if (filter === '3months') {
        start.setMonth(start.getMonth() - 3);
    } else if (filter === '1year') {
        start.setFullYear(start.getFullYear() - 1);
    } else if (filter === 'custom') {
        const startVal = document.getElementById('cctv-start').value;
        const endVal = document.getElementById('cctv-end').value;
        if (!startVal || !endVal) {
            alert("Harap masukkan tanggal mulai dan tanggal akhir untuk rentang spesifik.");
            return null;
        }
        start = new Date(startVal);
        const endD = new Date(endVal);
        if (start > endD) {
            alert("Tanggal akhir harus setelah tanggal mulai.");
            return null;
        }
        return { start: startVal, end: endVal };
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return { start: startStr, end: endStr };
}

// FUNGSI: Unduh Log CCTV
async function downloadCCTVLogs() {
    const dates = getCCTVFilterDates();
    if (!dates) return;

    const token = localStorage.getItem('galasus_token');
    const btn = document.getElementById('btn-unduh-cctv');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Memproses...`;
    btn.disabled = true;

    try {
        const url = `/audit-logs?start_date=${dates.start}&end_date=${dates.end}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Gagal memuat log untuk PDF");
        const logs = await res.json();

        if (!logs || logs.length === 0) {
            alert("Tidak ada rekaman aktivitas pada rentang waktu tersebut.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Laporan Log Aktivitas Sistem (CCTV)", 14, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Rentang Waktu: ${dates.start} s/d ${dates.end}`, 14, 28);
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 33);
        doc.text(`Total Rekaman: ${logs.length} entri`, 14, 38);

        // Siapkan Data Tabel
        const tableColumn = ["Waktu", "Pengguna (Peran)", "Modul", "Aksi", "Deskripsi"];
        const tableRows = [];

        logs.forEach(log => {
            const dateObj = new Date(log.created_at);
            const timeStr = dateObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            tableRows.push([
                timeStr,
                `${log.user_name} (${log.role})`,
                log.module,
                log.action,
                log.description
            ]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 }, // Slate-900
            styles: { fontSize: 8, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 40 },
                2: { cellWidth: 25 },
                3: { cellWidth: 30 },
                4: { cellWidth: 'auto' }
            }
        });

        // Simpan File
        doc.save(`CCTV_Logs_${dates.start}_to_${dates.end}.pdf`);

    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan saat memproses laporan PDF.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
