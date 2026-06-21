/**
 * =============================================================================
 * dialog.js — KOMPONEN UI DIALOG GLOBAL (Pengganti alert/confirm/prompt bawaan browser)
 * =============================================================================
 *
 * Digunakan di: SEMUA halaman (dimuat sebelum script lain)
 * Disisipkan di HTML: <script src="/public/js/dialog.js"></script>
 *
 * MENGAPA FILE INI ADA:
 *   Browser bawaan punya alert(), confirm(), prompt() yang jelek dan blocking.
 *   File ini menggantikannya dengan dialog berbasis Promise yang cantik,
 *   menggunakan Tailwind CSS + animasi glassmorphism.
 *
 * METODE YANG TERSEDIA (global via GalasusDialog):
 *   - GalasusDialog.alert(message)           → Notifikasi info (1 tombol OK)
 *   - GalasusDialog.confirm(message)         → Konfirmasi Ya/Tidak (return true/false)
 *   - GalasusDialog.prompt(message, default) → Input teks dari user (return string/null)
 *   - GalasusDialog.promptSelect(msg, opts)  → Pilihan dropdown (return value/null)
 *   - GalasusDialog.custom(html, width)      → Dialog custom HTML (untuk BAP, preview, dll)
 *
 * CARA PAKAI:
 *   const result = await GalasusDialog.confirm("Yakin hapus data ini?");
 *   if (result) { // user klik "Lanjutkan" }
 * =============================================================================
 */
const GalasusDialog = (function() {
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm opacity-0 transition-opacity duration-300';
        document.body.appendChild(overlay);
        // Force reflow
        void overlay.offsetWidth;
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        return overlay;
    }

    function createPanel() {
        const panel = document.createElement('div');
        panel.className = 'glass-panel w-full max-w-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-6 relative transform scale-95 transition-transform duration-300';
        panel.style.background = 'rgba(255, 255, 255, 0.9)';
        panel.style.backdropFilter = 'blur(16px)';
        panel.style.border = '1px solid rgba(255, 255, 255, 0.4)';
        return panel;
    }

    function closeDialog(overlay, panel) {
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        panel.classList.remove('scale-100');
        panel.classList.add('scale-95');
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    }

    return {
        alert: function(message) {
            return new Promise((resolve) => {
                const overlay = createOverlay();
                const panel = createPanel();

                panel.innerHTML = `
                    <div class="flex items-center gap-3 mb-4 text-galasus-blue">
                        <span class="material-symbols-outlined text-[28px]">info</span>
                        <h3 class="text-lg font-bold text-slate-800">Informasi</h3>
                    </div>
                    <p class="text-slate-600 text-sm mb-6 whitespace-pre-wrap">${message}</p>
                    <div class="flex justify-end">
                        <button id="gd-ok-btn" class="px-5 py-2 bg-galasus-blue text-white rounded-lg font-semibold shadow-md shadow-blue-900/20 hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Mengerti
                        </button>
                    </div>
                `;

                overlay.appendChild(panel);
                // Force reflow
                void panel.offsetWidth;
                panel.classList.remove('scale-95');
                panel.classList.add('scale-100');

                const btn = panel.querySelector('#gd-ok-btn');
                btn.focus();
                
                const handler = () => {
                    closeDialog(overlay, panel);
                    resolve();
                };

                btn.addEventListener('click', handler);
            });
        },

        confirm: function(message) {
            return new Promise((resolve) => {
                const overlay = createOverlay();
                const panel = createPanel();

                panel.innerHTML = `
                    <div class="flex items-center gap-3 mb-4 text-amber-500">
                        <span class="material-symbols-outlined text-[28px]">help</span>
                        <h3 class="text-lg font-bold text-slate-800">Konfirmasi</h3>
                    </div>
                    <p class="text-slate-600 text-sm mb-6 whitespace-pre-wrap">${message}</p>
                    <div class="flex justify-end gap-3">
                        <button id="gd-cancel-btn" class="px-5 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 active:scale-[0.98] transition-all">
                            Batal
                        </button>
                        <button id="gd-ok-btn" class="px-5 py-2 bg-galasus-blue text-white rounded-lg font-semibold shadow-md shadow-blue-900/20 hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Lanjutkan
                        </button>
                    </div>
                `;

                overlay.appendChild(panel);
                // Force reflow
                void panel.offsetWidth;
                panel.classList.remove('scale-95');
                panel.classList.add('scale-100');

                const btnOk = panel.querySelector('#gd-ok-btn');
                const btnCancel = panel.querySelector('#gd-cancel-btn');
                
                btnCancel.focus(); // Default to cancel to prevent accidental destructive actions

                btnOk.addEventListener('click', () => {
                    closeDialog(overlay, panel);
                    resolve(true);
                });

                btnCancel.addEventListener('click', () => {
                    closeDialog(overlay, panel);
                    resolve(false);
                });
            });
        },

        prompt: function(message, defaultValue = '') {
            return new Promise((resolve) => {
                const overlay = createOverlay();
                const panel = createPanel();

                panel.innerHTML = `
                    <div class="flex items-center gap-3 mb-4 text-galasus-blue">
                        <span class="material-symbols-outlined text-[28px]">edit_note</span>
                        <h3 class="text-lg font-bold text-slate-800">Input Data</h3>
                    </div>
                    <p class="text-slate-600 text-sm mb-4 whitespace-pre-wrap">${message}</p>
                    <div class="mb-6">
                        <input type="text" id="gd-input" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-galasus-blue/20 focus:border-galasus-blue outline-none transition-all" value="${defaultValue}">
                    </div>
                    <div class="flex justify-end gap-3">
                        <button id="gd-cancel-btn" class="px-5 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 active:scale-[0.98] transition-all">
                            Batal
                        </button>
                        <button id="gd-ok-btn" class="px-5 py-2 bg-galasus-blue text-white rounded-lg font-semibold shadow-md shadow-blue-900/20 hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Simpan
                        </button>
                    </div>
                `;

                overlay.appendChild(panel);
                // Force reflow
                void panel.offsetWidth;
                panel.classList.remove('scale-95');
                panel.classList.add('scale-100');

                const input = panel.querySelector('#gd-input');
                const btnOk = panel.querySelector('#gd-ok-btn');
                const btnCancel = panel.querySelector('#gd-cancel-btn');
                
                input.focus();
                // Select all text if there is default value
                if(defaultValue) {
                    input.select();
                }

                btnOk.addEventListener('click', () => {
                    closeDialog(overlay, panel);
                    resolve(input.value);
                });

                btnCancel.addEventListener('click', () => {
                    closeDialog(overlay, panel);
                    resolve(null);
                });

                // Support pressing Enter key
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        closeDialog(overlay, panel);
                        resolve(input.value);
                    } else if (e.key === 'Escape') {
                        closeDialog(overlay, panel);
                        resolve(null);
                    }
                });
            });
        },

        promptSelect: function(message, options = []) {
            return new Promise((resolve) => {
                const overlay = createOverlay();
                const panel = createPanel();

                let optionsHtml = options.map(opt => `<option value="${opt.value}" ${opt.disabled ? 'disabled' : ''}>${opt.label}</option>`).join('');
                if (optionsHtml === '') {
                    optionsHtml = `<option disabled>Tidak ada opsi tersedia</option>`;
                }

                panel.innerHTML = `
                    <div class="flex items-center gap-3 mb-4 text-galasus-blue">
                        <span class="material-symbols-outlined text-[28px]">assignment_ind</span>
                        <h3 class="text-lg font-bold text-slate-800">Pilih Opsi</h3>
                    </div>
                    <p class="text-slate-600 text-sm mb-4 whitespace-pre-wrap">${message}</p>
                    <div class="mb-6">
                        <select id="gd-select" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-galasus-blue/20 focus:border-galasus-blue outline-none transition-all">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div class="flex justify-end gap-3">
                        <button id="gd-cancel-btn" class="px-5 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 active:scale-[0.98] transition-all">
                            Batal
                        </button>
                        <button id="gd-ok-btn" class="px-5 py-2 bg-galasus-blue text-white rounded-lg font-semibold shadow-md shadow-blue-900/20 hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Simpan
                        </button>
                    </div>
                `;

                overlay.appendChild(panel);
                // Force reflow
                void panel.offsetWidth;
                panel.classList.remove('scale-95');
                panel.classList.add('scale-100');

                const select = panel.querySelector('#gd-select');
                const btnOk = panel.querySelector('#gd-ok-btn');
                const btnCancel = panel.querySelector('#gd-cancel-btn');
                
                select.focus();

                btnOk.addEventListener('click', () => {
                    closeDialog(overlay, panel);
                    resolve(select.value);
                });

                btnCancel.addEventListener('click', () => {
                    closeDialog(overlay, panel);
                    resolve(null);
                });

                // Support pressing Enter key
                select.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        closeDialog(overlay, panel);
                        resolve(select.value);
                    } else if (e.key === 'Escape') {
                        closeDialog(overlay, panel);
                        resolve(null);
                    }
                });
            });
        },

        custom: function(htmlContent, widthClass = 'max-w-4xl') {
            return new Promise((resolve) => {
                const overlay = createOverlay();
                const panel = createPanel();
                
                // Override width for custom modals (like BAP)
                panel.className = `glass-panel w-full ${widthClass} max-h-[90vh] flex flex-col rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-0 relative transform scale-95 transition-transform duration-300`;

                panel.innerHTML = `
                    <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
                        ${htmlContent}
                    </div>
                    <div class="p-4 border-t border-slate-200/50 flex justify-end bg-slate-50/50 rounded-b-2xl">
                        <button id="gd-close-btn" class="px-6 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-md hover:bg-slate-700 active:scale-[0.98] transition-all">
                            Tutup Dokumen
                        </button>
                    </div>
                `;

                overlay.appendChild(panel);
                // Force reflow
                void panel.offsetWidth;
                panel.classList.remove('scale-95');
                panel.classList.add('scale-100');

                const btnClose = panel.querySelector('#gd-close-btn');
                
                btnClose.focus();

                btnClose.addEventListener('click', () => {
                    closeDialog(overlay, panel);
                    resolve();
                });

                // Support pressing Escape key
                document.addEventListener('keydown', function escapeHandler(e) {
                    if (e.key === 'Escape') {
                        document.removeEventListener('keydown', escapeHandler);
                        closeDialog(overlay, panel);
                        resolve();
                    }
                });
            });
        }
    };
})();
