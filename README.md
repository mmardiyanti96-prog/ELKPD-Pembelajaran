# POLYA-MATCH QUEST — versi peningkatan

E-LKPD Matematika kelas VI/Fase C. Aplikasi memuat latihan bertahap dengan scaffolding Polya, 4 soal HOTS tambahan (C4–C6) pada level sulit, efek suara, musik opsional, animasi pencapaian, hasil per siswa, ekspor CSV, dan dukungan Supabase untuk penyimpanan daring.

## Isi paket

- `index.html` — halaman aplikasi.
- `style.css` — desain responsif dan animasi.
- `script.js` — bank soal, penilaian, audio, dan koneksi Supabase.
- `supabase-schema.sql` — struktur basis data dan kebijakan akses.
- `tests.js` — pengujian logika matematika dan bank soal.

## Jalankan untuk uji coba lokal

1. Ekstrak semua file ke satu folder.
2. Jalankan server lokal, misalnya dengan Python: `python -m http.server 8000`.
3. Buka `http://localhost:8000`.
4. Isi kode siswa, kelas, dan sesi dengan minimal 3 karakter; gunakan kode, bukan nama lengkap.
5. Mode lokal menyimpan data pada browser/perangkat tersebut saja. Data lokal tidak otomatis terlihat di perangkat guru.

Musik latar dan efek suara memiliki tombol hidup/mati di banner atas. Browser biasanya hanya mengizinkan audio setelah pengguna menekan tombol, jadi siswa perlu menekan tombol Musik untuk memulainya.

## Mengaktifkan penyimpanan daring dan Dashboard Guru

Aplikasi statis ini tidak dapat menyimpan hasil lintas perangkat sampai proyek Supabase dibuat dan dikonfigurasi. Ikuti urutan berikut:

1. Buat proyek di Supabase.
2. Di **Authentication → Sign In / Providers**, aktifkan **Anonymous Sign-Ins** untuk siswa.
3. Di **Authentication → Users**, buat akun guru dengan email dan kata sandi. Simpan UUID akun guru dari daftar Users.
4. Buka **SQL Editor**, jalankan seluruh isi `supabase-schema.sql`.
5. Buat kelas dan sesi untuk guru tersebut dengan mengganti UUID di bawah sesuai UUID akun guru:

   ```sql
   insert into public.classes(code, teacher_id)
   values ('VI-A', 'GANTI_DENGAN_UUID_GURU');

   insert into public.sessions(code, class_code, title)
   values ('PERTEMUAN1', 'VI-A', 'Pertemuan 1 POLYA-MATCH QUEST');
   ```

   Kode kelas dan sesi yang dimasukkan siswa harus cocok persis dengan data di tabel `classes` dan `sessions`.
6. Buka `script.js` dan temukan bagian paling atas:

   ```js
   const CONFIG = { supabaseUrl: '', supabaseAnonKey: '' };
   ```

   Isi `supabaseUrl` dengan **Project URL** dan `supabaseAnonKey` dengan **publishable/anon key** dari pengaturan API proyek Supabase. Jangan pernah memasukkan `service_role` key ke file web publik.
7. Publikasikan folder berisi file-file aplikasi ke hosting statis, misalnya Netlify, Cloudflare Pages, atau GitHub Pages. Unggah isi folder (bukan hanya `index.html`), lalu bagikan URL hasil hosting kepada siswa.
8. Buka URL publik tersebut di perangkat siswa, masukkan kode siswa, kelas, dan sesi, lalu kerjakan soal. Pada halaman hasil, tekan **Kirim hasil**.
9. Guru membuka URL yang sama → **Dashboard Guru**, lalu masuk memakai email dan kata sandi guru. Data siswa yang tersimpan di server dapat difilter dan diekspor ke CSV yang dapat dibuka dengan Excel.

### Cara memastikan sinkronisasi berhasil

- Banner atas menandakan konfigurasi tersedia, tetapi status itu bukan bukti bahwa server telah menerima data.
- Bukti penyimpanan adalah pesan **“Server mengonfirmasi penyimpanan”** setelah siswa menekan **Kirim hasil**.
- Jika muncul pesan gagal, periksa Project URL/key, status Anonymous Sign-Ins, keberadaan kode kelas/sesi, kebijakan RLS, dan koneksi internet. Jangan menganggap data lokal sudah terkirim.
- Setelah publikasi, uji dari dua perangkat berbeda: satu sebagai siswa, satu sebagai guru. Pastikan rekaman siswa muncul di Dashboard Guru sebelum aplikasi dipakai satu kelas penuh.

## Fitur HOTS yang ditambahkan

Setiap misi kini memiliki dua soal level sulit:

- **Misi 1 — perkalian/pembagian pecahan dengan bilangan asli:** analisis kecukupan persediaan dan evaluasi jawaban dua siswa.
- **Misi 2 — perbandingan pecahan/desimal:** analisis dua nilai tertinggi dan merancang urutan papan peringkat.

Setiap soal HOTS melewati empat tahap Polya. Pilihan pada tahap pelaksanaan dan pemeriksaan menilai pemilihan solusi dan alasan matematis. Karena bentuknya pilihan ganda, fitur ini belum menggantikan penilaian uraian terbuka oleh guru.

## Pengujian

Jalankan dari folder proyek:

```bash
node tests.js
```

Paket ini memiliki tes otomatis untuk operasi pecahan, parser desimal koma, skor Polya, validasi kode, ekspor CSV, dan bank soal HOTS. Tes otomatis tidak menguji kredensial, jaringan Supabase, RLS pada proyek nyata, atau semua ukuran layar. Uji manual lintas perangkat tetap wajib dilakukan sebelum dibagikan kepada siswa.

## Privasi dan keamanan

- Gunakan kode siswa, bukan nama lengkap atau data pribadi sensitif.
- Publishable/anon key memang digunakan di browser; keamanan bergantung pada kebijakan Row Level Security. Jangan masukkan service-role key.
- Guru hanya seharusnya dapat membaca rekaman kelas yang terhubung ke akun guru. Uji kebijakan akses di proyek Supabase sebelum penggunaan nyata.
- Siswa memakai sesi anonim dan kode siswa; ini bukan sistem verifikasi identitas yang kuat. Untuk penggunaan formal/bernilai tinggi, pertimbangkan akun siswa terkelola dan daftar peserta yang tervalidasi.
- Tidak ada klaim peningkatan hasil belajar. Dampak pembelajaran harus dinilai berdasarkan data pretest–posttest atau bukti lain yang sesuai.

## Status yang perlu diketahui

Kode telah disiapkan untuk koneksi backend dan publikasi, tetapi aplikasi **belum otomatis online**: URL hosting, Project URL/key Supabase, akun guru, tabel kelas, dan sesi harus dibuat oleh pemilik proyek. Pengujian otomatis yang tersedia tidak membuktikan konfigurasi server berhasil sampai uji lintas perangkat selesai.
