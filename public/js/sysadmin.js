/**
 * sysadmin.js - V12 (ENTERPRISE EDITION)
 * FIXED: Security Protocols, Responsive Handlers, and Formal UI Dialect.
 */

let allUsersData = []; 

function setupUI() {
    setupMobileSidebar(); // INISIALISASI: Fungsionalitas Navigasi Layar Sentuh

    const name = localStorage.getItem('galasus_name') || 'Administrator';
    const role = localStorage.getItem('galasus_role') || 'System Admin';
    
    document.getElementById('user-name').textContent = name;
    
    let displayRole = role;
    if (role === 'super admin' || role === 'super_admin') displayRole = 'Administrator Utama';
    else if (role === 'technician') displayRole = 'Teknisi Lapangan';
    else if (role === 'finance') displayRole = 'Keuangan';
    else if (role === 'admin') displayRole = 'Admin Sistem';

    document.getElementById('user-role').textContent = displayRole;
    document.getElementById('user-initials').textContent = name.substring(0, 2).toUpperCase();
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

function updateStatistics(data) {
    const activeCount = data.filter(u => u.status === 'active').length;
    const statActive = document.getElementById('stat-active-users');
    if (statActive) statActive.textContent = activeCount;

    const suspendCount = data.filter(u => u.status === 'suspended').length;
    const statSuspend = document.getElementById('stat-suspended');
    if (statSuspend) statSuspend.textContent = suspendCount;

    // Data Statis: Metrik Infrastruktur 
    const statDb = document.getElementById('stat-db');
    if (statDb) statDb.innerHTML = `45.8% <span class="text-[10px] md:text-xs font-normal text-slate-400">/ 500GB</span>`;
    
    const statUptime = document.getElementById('stat-uptime');
    if (statUptime) statUptime.textContent = "99.99%";
}

async function loadUsers() {
    const token = localStorage.getItem('galasus_token');
    try {
        const response = await fetch('http://127.0.0.1:8081/users', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Koneksi ke peladen utama terputus atau sesi otentikasi Anda telah berakhir.');
        
        allUsersData = await response.json();
        
        // Pengecekan Dual Search Bar
        const kwDesktop = document.getElementById('search-user')?.value || '';
        const kwMobile = document.getElementById('search-user-mobile')?.value || '';
        const kw = (kwDesktop || kwMobile).toLowerCase();
        
        const role = document.getElementById('filter-role')?.value || 'all';
        
        let filtered = allUsersData;
        if (role !== 'all') filtered = filtered.filter(u => u.role === role);
        if (kw) filtered = filtered.filter(u => u.full_name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw));
        
        renderTable(filtered); 
        updateStatistics(allUsersData);
    } catch (error) {
        const table = document.getElementById('user-table-body');
        if(table) table.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-error font-medium text-sm border-2 border-dashed border-red-100 rounded-lg">Peringatan Kritis: ${error.message}</td></tr>`;
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('user-table-body');
    if(!tableBody) return;
    tableBody.innerHTML = ''; 

    let currentUserId = null;
    const token = localStorage.getItem('galasus_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.user_id;
        } catch (e) {}
    }

    if(data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-slate-400 font-medium text-sm italic">Direktori pengguna kosong atau filter tidak cocok.</td></tr>`;
        return;
    }

    data.forEach(user => {
        const isActive = user.status === 'active';
        const initial = (user.full_name || "??").substring(0, 2).toUpperCase();
        const isCurrentUser = (user.user_id === currentUserId);
        
        // Perhitungan Sesi Aktif Berdasarkan Timestamp
        const lastActiveDate = user.last_active ? new Date(user.last_active) : new Date(0);
        const diffMinutes = Math.abs((new Date() - lastActiveDate) / 1000 / 60);
        const isOnline = (diffMinutes <= 2 || (diffMinutes >= 418 && diffMinutes <= 422)) && isActive;

        const onlineBadge = isOnline 
            ? `<span class="relative flex h-2.5 w-2.5 md:h-3 md:w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-full w-full bg-emerald-500 border border-white"></span></span>` 
            : `<span class="relative flex h-2.5 w-2.5 md:h-3 md:w-3"><span class="relative inline-flex rounded-full h-full w-full bg-slate-300 border border-white"></span></span>`;
        
        // Penyesuaian nama peran agar terlihat formal
        let displayedRole = user.role.toUpperCase();
        if(user.role === 'super admin' || user.role === 'super_admin') displayedRole = "SYS ADMIN";
        
        const tr = `
            <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="px-4 md:px-6 py-3 md:py-4">
                    <div class="flex items-center gap-3">
                        <div class="relative shrink-0">
                            <div class="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[10px] md:text-xs text-slate-600 border border-slate-200 shadow-sm">${initial}</div>
                            <div class="absolute -bottom-1 -right-1 shadow-sm border-[1.5px] border-white rounded-full bg-white">${onlineBadge}</div>
                        </div>
                        <div class="overflow-hidden">
                            <p class="font-bold text-xs md:text-sm text-slate-900 truncate">
                                ${user.full_name} 
                                ${isCurrentUser ? '<span class="ml-1 text-[8px] md:text-[9px] bg-galasus-blue/10 text-galasus-blue px-1.5 py-0.5 rounded font-black tracking-widest border border-blue-200/50">AUTHOR</span>' : ''}
                            </p>
                            <p class="text-[9px] md:text-[11px] text-slate-400 truncate mt-0.5">${user.email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4"><span class="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1 rounded">${displayedRole}</span></td>
                <td class="px-4 md:px-6 py-3 md:py-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider border ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-error border-red-100'}">
                        <span class="w-1.5 h-1.5 ${isActive ? 'bg-emerald-500' : 'bg-error'} rounded-full shadow-sm"></span> 
                        ${user.status === 'suspended' ? 'DIBLOKIR' : 'AKTIF'}
                    </span>
                </td>
                <td class="px-4 md:px-6 py-3 md:py-4 text-right flex justify-end gap-1.5 md:gap-2">
                    <button onclick="editUser(${user.user_id})" class="text-slate-400 hover:bg-blue-50 hover:text-galasus-blue p-1.5 md:p-2 rounded-lg border border-transparent hover:border-blue-200 transition-all" title="Modifikasi Konfigurasi Identitas"><span class="material-symbols-outlined text-base md:text-lg">edit_square</span></button>
                    
                    ${isCurrentUser ? `
                        <button disabled class="text-slate-200 cursor-not-allowed p-1.5 md:p-2" title="Protokol Keamanan: Restriksi aksi pada profil yang sedang berjalan"><span class="material-symbols-outlined text-base md:text-lg">vpn_key_off</span></button>
                        <button disabled class="text-slate-200 cursor-not-allowed p-1.5 md:p-2" title="Protokol Keamanan: Pencegahan penguncian sistem mandiri"><span class="material-symbols-outlined text-base md:text-lg">lock_person</span></button>
                        <button disabled class="text-slate-200 cursor-not-allowed p-1.5 md:p-2" title="Protokol Keamanan: Pencegahan penghapusan root access"><span class="material-symbols-outlined text-base md:text-lg">delete_forever</span></button>
                    ` : `
                        <button onclick="resetSandi(${user.user_id})" class="text-slate-400 hover:bg-amber-50 hover:text-amber-600 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-amber-200 transition-all" title="Pembaruan Sandi Darurat (Force Reset)"><span class="material-symbols-outlined text-base md:text-lg">key</span></button>
                        <button onclick="toggleStatus(${user.user_id})" class="text-slate-400 hover:bg-slate-100 p-1.5 md:p-2 rounded-lg border border-transparent transition-all ${isActive ? 'hover:border-red-200 hover:text-error hover:bg-red-50' : 'hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50'}" title="${isActive ? 'Tangguhkan Otoritas Sistem (Suspend)' : 'Pulihkan Otoritas Sistem (Activate)'}"><span class="material-symbols-outlined text-base md:text-lg">${isActive ? 'block' : 'verified_user'}</span></button>
                        <button onclick="deleteUser(${user.user_id})" class="text-slate-400 hover:bg-red-50 hover:text-error p-1.5 md:p-2 rounded-lg border border-transparent hover:border-red-200 transition-all" title="Hapus Kredensial Permanen"><span class="material-symbols-outlined text-base md:text-lg">delete</span></button>
                    `}
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', tr);
    });
}

// --- LOGIKA PROTOKOL KEAMANAN ---
window.resetSandi = async function(userId) {
    if(!await GalasusDialog.confirm("Konfirmasi Keamanan: Apakah Anda bermaksud untuk mengatur ulang kata sandi pengguna ini kembali ke pengaturan pabrik (Galasus123!)?\n\nSistem akan memaksa pengguna untuk merubah sandi kembali saat sesi login berikutnya.")) return;
    
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/users/${userId}/reset-password`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Akses ditolak. Kegagalan komunikasi dengan peladen.");
        await GalasusDialog.alert("Pembaruan Berhasil: Dekripsi kata sandi pengguna telah dinormalkan ke pengaturan sistem utama.");
    } catch (err) { await GalasusDialog.alert("Peringatan Sistem: " + err.message); }
}

async function toggleStatus(userId) {
    const user = allUsersData.find(u => u.user_id === userId);
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const actionText = newStatus === 'suspended' ? 'menangguhkan' : 'memulihkan';
    
    if(!await GalasusDialog.confirm(`Otorisasi Akses: Konfirmasi untuk ${actionText} seluruh akses sistem pada entitas pengguna ini?`)) return;

    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/users/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: user.full_name, email: user.email, role: user.role, status: newStatus })
        });
        if (!res.ok) throw new Error("Terjadi hambatan saat memperbarui status di basis data utama.");
        await loadUsers();
    } catch (err) { await GalasusDialog.alert("Peringatan Sistem: " + err.message); }
}

async function editUser(userId) {
    const user = allUsersData.find(u => u.user_id === userId);
    const newName = await GalasusDialog.prompt("Modifikasi Identitas: Masukkan nama entitas yang direvisi sesuai dengan direktori kepegawaian.", user.full_name);
    
    if (!newName || newName.trim() === user.full_name) return;
    
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/users/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: newName, email: user.email, role: user.role, status: user.status })
        });
        if (!res.ok) throw new Error("Sinkronisasi pembaruan nama pengguna dibatalkan oleh server.");
        await GalasusDialog.alert("Sinkronisasi Selesai: Identitas pengguna telah disesuaikan di seluruh topologi sistem.");
        await loadUsers(); 
    } catch (err) { await GalasusDialog.alert("Peringatan Sistem: " + err.message); }
}

async function deleteUser(userId) {
    if(!await GalasusDialog.confirm("Tindakan Destruktif Lapisan 1: Apakah Anda menyetujui pemusnahan total data kredensial pengguna ini?\n\nPERINGATAN: Sangat direkomendasikan untuk menggunakan opsi penangguhan (Suspend) guna menjaga rekam jejak audit (Audit Trail).")) return;
    
    const token = localStorage.getItem('galasus_token');
    try {
        const res = await fetch(`http://127.0.0.1:8081/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Kegagalan modifikasi tabel basis data.");
        await GalasusDialog.alert("Penghapusan Berhasil: Seluruh jejak direktori milik pengguna bersangkutan telah ditiadakan.");
        await loadUsers(); 
    } catch (err) { await GalasusDialog.alert("Peringatan Sistem: " + err.message); }
}

// --- INISIALISASI KEJADIAN (EVENT HANDLERS) ---
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    loadUsers();
    
    // Auto-refresh interval (10 Detik)
    setInterval(() => { loadUsers(); }, 10000);

    const searchInputDesk = document.getElementById('search-user');
    const searchInputMob = document.getElementById('search-user-mobile');
    
    const triggerSearch = () => {
        const kw = ((searchInputDesk ? searchInputDesk.value : '') || (searchInputMob ? searchInputMob.value : '')).toLowerCase();
        renderTable(allUsersData.filter(u => u.full_name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)));
    };

    if(searchInputDesk) searchInputDesk.addEventListener('input', triggerSearch);
    if(searchInputMob) searchInputMob.addEventListener('input', triggerSearch);

    const filterRole = document.getElementById('filter-role');
    if(filterRole) {
        filterRole.addEventListener('change', (e) => {
            const role = e.target.value;
            renderTable(role === 'all' ? allUsersData : allUsersData.filter(u => u.role === role));
        });
    }

    const formReg = document.getElementById('form-register');
    if(formReg) {
        formReg.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('reg-email').value;
            
            // VALIDASI DOMAIN EKSEKUTIF (Front-End)
            if(!emailInput.endsWith('@galasus.com')) {
                await GalasusDialog.alert("Penolakan Keamanan: Registrasi akses eksklusif hanya diperuntukkan bagi alamat surel dengan domain korporat tervalidasi (@galasus.com).");
                return;
            }

            const body = {
                full_name: document.getElementById('reg-name').value,
                email: emailInput,
                role: document.getElementById('reg-role').value
            };
            
            const token = localStorage.getItem('galasus_token');
            try {
                const res = await fetch('http://127.0.0.1:8081/register', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || "Pembuatan kredensial sistem ditolak.");
                }
                
                await GalasusDialog.alert("Provisi Berhasil: Entitas operasional baru telah didaftarkan ke pusat data dengan sandi dekripsi bawaan (Galasus123!).");
                formReg.reset();
                await loadUsers();
            } catch (err) { 
                await GalasusDialog.alert("Peringatan Sistem: " + err.message); 
            }
        });
    }
});