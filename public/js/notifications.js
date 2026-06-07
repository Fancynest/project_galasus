/**
 * notifications.js
 * Sistem Notifikasi Real-time Galasus
 */

let notificationInterval = null;

// Template untuk popover notifikasi
const notifPopoverHTML = `
<div id="notif-dropdown" class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 hidden z-50 transform origin-top-right transition-all duration-200 opacity-0 scale-95">
    <div class="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
        <h3 class="font-bold text-slate-800 text-sm">Notifikasi</h3>
    </div>
    <div id="notif-list" class="max-h-[350px] overflow-y-auto custom-scrollbar">
        <!-- List will be injected here -->
        <div class="p-8 text-center text-slate-400 text-xs font-medium">Memuat notifikasi...</div>
    </div>
</div>
`;

function initNotifications() {
    const bellContainer = document.querySelector('button .material-symbols-outlined:contains("notifications")')?.parentElement;
    if (!bellContainer) return;

    // Inject popover ke dalam DOM
    bellContainer.classList.add('relative');
    bellContainer.insertAdjacentHTML('beforeend', notifPopoverHTML);

    const popover = document.getElementById('notif-dropdown');

    // Toggle popover saat bel diklik
    bellContainer.addEventListener('click', (e) => {
        // Prevent event bubbling if clicking inside popover
        if (e.target.closest('#notif-dropdown')) return;

        if (popover.classList.contains('hidden')) {
            popover.classList.remove('hidden');
            // Force reflow
            void popover.offsetWidth;
            popover.classList.remove('opacity-0', 'scale-95');
            popover.classList.add('opacity-100', 'scale-100');
            fetchNotifications(); // Segarkan saat dibuka
        } else {
            closeNotifPopover();
        }
    });

    // Tutup jika klik di luar
    document.addEventListener('click', (e) => {
        if (!bellContainer.contains(e.target)) {
            closeNotifPopover();
        }
    });

    // Mulai polling
    fetchNotifications();
    notificationInterval = setInterval(fetchNotifications, 15000); // Tiap 15 detik
}

function closeNotifPopover() {
    const popover = document.getElementById('notif-dropdown');
    if (!popover || popover.classList.contains('hidden')) return;
    
    popover.classList.remove('opacity-100', 'scale-100');
    popover.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        popover.classList.add('hidden');
    }, 200);
}

async function fetchNotifications() {
    const token = localStorage.getItem('galasus_token');
    if (!token) return;

    try {
        const res = await fetch('http://127.0.0.1:8081/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        const notifs = await res.json();
        renderNotifications(notifs);
    } catch (e) {
        console.error("Gagal memuat notifikasi", e);
    }
}

function renderNotifications(notifs) {
    const list = document.getElementById('notif-list');
    const dot = document.getElementById('notif-dot');
    if (!list) return;

    if (!notifs || notifs.length === 0) {
        list.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
            <span class="material-symbols-outlined text-3xl opacity-50">notifications_paused</span>
            Belum ada notifikasi baru.
        </div>`;
        if (dot) dot.classList.add('hidden');
        return;
    }

    const unreadCount = notifs.filter(n => !n.is_read).length;
    
    if (dot) {
        if (unreadCount > 0) {
            dot.classList.remove('hidden');
        } else {
            dot.classList.add('hidden');
        }
    }

    list.innerHTML = '';
    notifs.forEach(n => {
        const date = new Date(n.created_at);
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        let bgClass = n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50';
        let iconClass = n.is_read ? 'text-slate-400' : 'text-galasus-blue';
        let dotHTML = n.is_read ? '' : `<div class="w-2 h-2 rounded-full bg-galasus-blue flex-shrink-0 mt-1.5"></div>`;

        const html = `
        <div class="px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors flex items-start gap-3 ${bgClass}" onclick="handleNotifClick(${n.id}, ${n.ticket_id})">
            <div class="p-2 rounded-full bg-white shadow-sm border border-slate-100 flex-shrink-0 mt-0.5">
                <span class="material-symbols-outlined text-[18px] ${iconClass}">chat_bubble</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-slate-900 mb-0.5">${n.title}</p>
                <p class="text-[10px] text-slate-600 line-clamp-2 leading-relaxed mb-1">${n.message}</p>
                <p class="text-[9px] font-semibold text-slate-400">${timeStr}</p>
            </div>
            ${dotHTML}
        </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    });
}

async function handleNotifClick(notifId, ticketId) {
    const token = localStorage.getItem('galasus_token');
    
    // Tandai sebagai dibaca
    try {
        await fetch(`http://127.0.0.1:8081/notifications/${notifId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        console.error("Gagal update status notifikasi", e);
    }

    // Refresh UI
    fetchNotifications();

    // Jika ini teknisi dan ada fungsi buka tiket, panggil
    if (typeof openDetailTiket === 'function') {
        closeNotifPopover();
        openDetailTiket(ticketId); // Untuk servicedesk
    } else if (typeof finishTicket === 'function') {
        // Untuk technician, kita perlu mencari data tiket dari tabel untuk mendapatkan no_tiket dan pelanggan
        // Demi kesederhanaan, kita reload saja list tiket jika belum diload
        closeNotifPopover();
        if (typeof GalasusDialog !== 'undefined') {
            GalasusDialog.alert("Notifikasi ditandai sebagai dibaca. Silakan cari tiket tersebut di daftar.");
        } else {
            alert("Notifikasi ditandai sebagai dibaca. Silakan cari tiket tersebut di daftar.");
        }
    }
}

// Polyfill untuk selector contains text
jQueryContainsPolyfill = function() {
    // Karena kita tidak pakai jQuery, kita cari element manual
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }
}

function initBell() {
    const buttons = document.querySelectorAll('button .material-symbols-outlined');
    for (let icon of buttons) {
        if (icon.textContent.trim() === 'notifications') {
            const bellContainer = icon.parentElement;
            
            // Hindari inisialisasi ganda
            if (bellContainer.dataset.notifInitialized) return;
            bellContainer.dataset.notifInitialized = "true";

            bellContainer.classList.add('relative');
            bellContainer.insertAdjacentHTML('beforeend', notifPopoverHTML);

            const popover = document.getElementById('notif-dropdown');

            bellContainer.addEventListener('click', (e) => {
                if (e.target.closest('#notif-dropdown')) return;

                if (popover.classList.contains('hidden')) {
                    popover.classList.remove('hidden');
                    void popover.offsetWidth;
                    popover.classList.remove('opacity-0', 'scale-95');
                    popover.classList.add('opacity-100', 'scale-100');
                    fetchNotifications();
                } else {
                    closeNotifPopover();
                }
            });

            document.addEventListener('click', (e) => {
                if (!bellContainer.contains(e.target)) {
                    closeNotifPopover();
                }
            });

            fetchNotifications();
            notificationInterval = setInterval(fetchNotifications, 15000);
            break;
        }
    }
}

document.addEventListener('DOMContentLoaded', initBell);

// Jika file JS ini dimuat setelah DOM siap (karena cache atau async), panggil paksa:
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initBell();
}

