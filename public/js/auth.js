const token = localStorage.getItem('galasus_token');
const userRole = localStorage.getItem('galasus_role');
const currentPath = window.location.pathname.toLowerCase();

if (token) {
    const originalFetch = window.fetch;
    window.fetch = async function() {
        const response = await originalFetch.apply(this, arguments);
        if (response.status === 401) {
            await GalasusDialog.alert("Sesi Anda telah berakhir atau akun dinonaktifkan. Silakan melakukan otentikasi kembali.");
            logoutPaksa();
        }
        return response;
    };

    setInterval(() => {
        const liveToken = localStorage.getItem('galasus_token');
        if (liveToken) {
            fetch('/heartbeat', {
                headers: { 'Authorization': `Bearer ${liveToken}` }
            }).catch(e => console.error("Heartbeat error:", e));
        }
    }, 15000);
}

if (!token) {
    if (!currentPath.includes('login.html')) {
        window.location.replace('/views/login.html');
    }
} else {
    if (currentPath.includes('login.html') || currentPath === '/' || currentPath === '/views/') {
        pindahinKeDashboard(userRole);
    } else {
        cekHakAksesRuangan(currentPath, userRole);
    }
}

function pindahinKeDashboard(role) {
    const r = (role || '').toLowerCase().trim();
    if (r === 'technician' || r === 'teknisi') {
        window.location.replace('/views/technician.html');
    } else if (r === 'finance') {
        window.location.replace('/views/financemng.html');
    } else if (r === 'super admin' || r === 'super_admin' || r === 'admin') {
        window.location.replace('/views/superadmin.html');
    } else {
        logoutPaksa();
    }
}

async function cekHakAksesRuangan(path, role) {
    const currentRole = (role || '').toLowerCase().trim();
    const isSuperAdmin = currentRole === 'super admin' || currentRole === 'super_admin' || currentRole === 'admin';
    
    if (path.includes('superadmin') || path.includes('systemadmin') || path.includes('sysadmin') || path.includes('clientmanagement')) {
        if (!isSuperAdmin) {
            await GalasusDialog.alert('Akses Ditolak: Area ini dibatasi khusus untuk Administrator Utama.');
            pindahinKeDashboard(currentRole); 
            return;
        }
    } else if (path.includes('financemng')) {
        if (!isSuperAdmin && currentRole !== 'finance') {
            await GalasusDialog.alert('Akses Ditolak: Anda tidak memiliki otoritas untuk mengakses data Keuangan.');
            pindahinKeDashboard(currentRole);
            return;
        }
    } else if (path.includes('technician') || path.includes('servicedesk') || path.includes('ticketarchive')) {
        if (!isSuperAdmin && currentRole !== 'technician' && currentRole !== 'teknisi') {
            await GalasusDialog.alert('Akses Ditolak: Halaman ini khusus diperuntukkan bagi operasional Lapangan.');
            pindahinKeDashboard(currentRole);
            return;
        }
    }
}

function logoutPaksa() {
    localStorage.removeItem('galasus_token');
    localStorage.removeItem('galasus_role');
    window.location.replace('/views/login.html');
}

document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logoutPaksa();
        });
    }

    const btnDasbor = document.getElementById('btn-dasbor');
    const roleSekarang = (localStorage.getItem('galasus_role') || '').toLowerCase().trim();

    if (btnDasbor) {
        if (roleSekarang !== 'super admin' && roleSekarang !== 'super_admin' && roleSekarang !== 'admin') {
            btnDasbor.style.display = 'none'; 
        } 
        else {
            btnDasbor.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.replace('/views/superadmin.html');
            });
        }
    }
});
