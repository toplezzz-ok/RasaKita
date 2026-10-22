# RasaKita — Web E-Commerce Pemesanan Makanan

Starter project berbasis HTML, CSS, JavaScript modules, Firebase Authentication, Firebase Realtime Database, dan Vercel. Antarmuka dibuat responsif untuk ponsel.

## Fitur dalam starter
- Katalog menu dengan pencarian dan filter kategori.
- Keranjang belanja.
- Registrasi/login Customer.
- Checkout dengan alamat dan metode pembayaran manual.
- Riwayat/status pesanan.
- Dashboard Admin: produk, stok, pesanan, verifikasi/status, penugasan driver.
- Halaman tugas Driver.
- Mode tampilan demo menu ketika Firebase belum dikonfigurasi (data demo tidak menyimpan transaksi).

## 1. Persiapan Firebase
1. Buka https://console.firebase.google.com/ dan buat project.
2. Tambahkan aplikasi Web, salin konfigurasi ke `firebase-config.js`.
3. Authentication → Sign-in method → aktifkan Email/Password.
4. Realtime Database → buat database. Pastikan `databaseURL` pada konfigurasi sama persis dengan URL yang ditampilkan Firebase Console.
5. Deploy rules dari `database.rules.example.json` setelah meninjau dan mengujinya di Firebase Rules Simulator.
6. Buat akun admin dan driver melalui form registrasi Customer, lalu ubah `users/{UID}/role` di Firebase Console menjadi `admin` atau `driver`. Jangan menyediakan cara bagi pengguna publik untuk menaikkan role mereka sendiri.

**Penting:** aturan contoh ini adalah titik awal untuk tugas kuliah, bukan audit keamanan lengkap. Uji setiap role dengan akun terpisah. Untuk produksi, validasi data pesanan/harga/stok dan transisi status dengan backend tepercaya; jangan mengandalkan nilai harga dari browser.

## 2. Menjalankan lokal
Gunakan VS Code dan ekstensi Live Server, lalu klik kanan `index.html` → Open with Live Server. Modul Firebase membutuhkan server lokal; membuka `file://` langsung tidak disarankan.

## 3. Deploy ke Vercel
1. Upload folder proyek ke repository GitHub.
2. Import repository di https://vercel.com/.
3. Framework Preset: Other; Build Command dan Output Directory dapat dikosongkan atau Output Directory `.`.
4. Deploy. Setiap perubahan yang di-push ke branch production akan memicu deployment baru.

## 4. Pembayaran manual
Starter ini tidak memproses uang secara otomatis. Customer memilih metode, pesanan berstatus menunggu verifikasi, dan admin memperbarui status setelah memeriksa pembayaran secara nyata. Tambahkan instruksi rekening/QRIS restoran yang valid sebelum dipakai.

## 5. Catatan sebelum demo
- Konfigurasi Firebase belum diisi; ganti semua `GANTI_DENGAN_...`.
- Seed menu awal di `app.js` hanya data fallback tampilan. Untuk mengelola produk lewat admin, masukkan data menu ke node `products` di Realtime Database terlebih dahulu (atau buat produk dari dashboard admin setelah akun admin dan rules siap).
- Pastikan aturan database melindungi data pribadi dan pesanan.
- Tidak ada live tracking GPS, rating, voucher, chat, atau integrasi POS, sesuai ruang lingkup proposal.
