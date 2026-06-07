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
        const response = await fetch('http://127.0.0.1:8081/api/dashboard', {
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