/**
 * =============================================================================
 * login.js — HALAMAN LOGIN & AUTENTIKASI AWAL
 * =============================================================================
 *
 * Digunakan di: /views/login.html
 *
 * FUNGSI UTAMA:
 *   1. Mengirim email & password ke POST /login (backend)
 *   2. Menyimpan JWT token & role ke localStorage
 *   3. Mendeteksi first-login → memaksa user ganti password default
 *   4. Redirect ke dashboard sesuai role (Super Admin / Teknisi / Finance)
 *
 * ALUR LOGIN:
 *   User input email+password → POST /login → Dapat JWT token
 *   → Cek is_first_login → Jika true, muncul dialog ganti password
 *   → Simpan token ke localStorage → Redirect ke dashboard sesuai role
 *
 * KEAMANAN:
 *   - Password default "Galasus123!" wajib diganti saat first login
 *   - Token JWT kedaluwarsa otomatis setelah 24 jam (diatur di backend)
 * =============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const alertBox = document.getElementById('alert-box');
    const alertMessage = document.getElementById('alert-message');
    const btnSubmit = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    
    const inputEmail = document.getElementById('email');
    const btnLupa = document.getElementById('lupa-sandi');

    // FITUR LUPA KATA SANDI
    if (btnLupa) {
        btnLupa.addEventListener('click', async (e) => {
            e.preventDefault();
            await GalasusDialog.alert("Waduh lupa sandi? Tenang, langsung kontak divisi Super Admin aja ya buat di-reset sandinya ke Galasus123!");
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = inputEmail.value;
        const password = document.getElementById('password').value;

        btnText.textContent = "Memproses...";
        btnIcon.textContent = "sync";
        btnIcon.classList.add("animate-spin");
        btnSubmit.disabled = true;
        btnSubmit.classList.add("opacity-70", "cursor-not-allowed");
        alertBox.classList.add('hidden'); 

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, password: password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Terjadi kesalahan saat login.');
            }

            // FITUR PEMBARUAN KATA SANDI MANDATORI (LOGIN PERTAMA)
            if (data.is_first_login) {
                const newPass = await GalasusDialog.prompt("⚠️ PERINGATAN KEAMANAN ⚠️\n\nIni adalah login pertama Anda atau sandi baru saja direset.\nAnda WAJIB mengganti kata sandi bawaan.\n\nMasukkan kata sandi BARU Anda di bawah ini:");
                
                // Pengalihan kembali jika form kata sandi tidak valid atau dibatalkan
                if (!newPass || newPass.trim() === "") {
                    throw new Error("Login dibatalkan. Anda wajib mengganti kata sandi baru demi keamanan.");
                }

                // Mengirimkan request ke backend untuk pembaruan kata sandi
                const changeRes = await fetch('/change-password', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${data.token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ new_password: newPass })
                });

                if (changeRes.ok) {
                    await GalasusDialog.alert("Mantap! Kata sandi berhasil diamankan. Silakan masuk ke dashboard.");
                } else {
                    const errData = await changeRes.json();
                    throw new Error(errData.message || "Gagal menyimpan kata sandi baru.");
                }
            }

            // OTENTIKASI BERHASIL: Menyimpan Token & Peran Pengguna
            localStorage.setItem('galasus_token', data.token);
            localStorage.setItem('galasus_role', data.role);
            localStorage.setItem('galasus_name', data.name);

            // PENGALIHAN OTOMATIS BERDASARKAN PERAN
            const userRole = data.role.toLowerCase(); 
            if (userRole === 'technician') {
                window.location.replace('/views/technician.html');
            } else if (userRole === 'finance') {
                window.location.replace('/views/financemng.html');
            } else if (userRole === 'super_admin' || userRole === 'super admin') {
                window.location.replace('/views/superadmin.html'); 
            } else {
                window.location.replace('/views/login.html');
            }

        } catch (error) {
            alertMessage.textContent = error.message;
            alertBox.classList.remove('hidden');
        } finally {
            btnText.textContent = "Masuk ke Sistem";
            btnIcon.textContent = "login";
            btnIcon.classList.remove("animate-spin");
            btnSubmit.disabled = false;
            btnSubmit.classList.remove("opacity-70", "cursor-not-allowed");
        }
    });
});
