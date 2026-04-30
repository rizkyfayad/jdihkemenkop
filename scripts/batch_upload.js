require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');

// Setup Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: Kredensial Supabase tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Direktori
const PDF_DIR = path.join(__dirname, '../data/pdfs');

async function processBatch() {
  console.log("==========================================");
  console.log("🚀 MEMULAI PROSES UPLOAD BATCH PDF...");
  console.log("==========================================\n");

  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
    console.log(`📂 Folder '${PDF_DIR}' belum ada. Sudah dibuatkan otomatis.`);
    console.log(`⏳ Tolong letakkan file-file PDF Anda di folder tersebut lalu jalankan ulang skrip ini.`);
    return;
  }

  const files = fs.readdirSync(PDF_DIR).filter(file => file.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.log(`⚠️ Tidak ada file PDF ditemukan di folder: ${PDF_DIR}`);
    console.log(`Tolong salin PDF Anda ke folder tersebut dan coba lagi.`);
    return;
  }

  console.log(`Ditemukan ${files.length} file PDF. Memulai unggahan...\n`);

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(PDF_DIR, filename);

    console.log(`(${i + 1}/${files.length}) Memproses: ${filename}...`);

    try {
      // 1. Ekstrak teks dari PDF
      const dataBuffer = fs.readFileSync(filepath);
      const parsedData = await pdfParse(dataBuffer);
      const extractedText = parsedData.text;

      // 2. Upload fisik PDF ke Supabase Storage
      const uniqueFileName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from('pdfs')
        .upload(uniqueFileName, dataBuffer, {
          contentType: 'application/pdf',
        });

      if (storageError) {
        console.error(`  ❌ Gagal mengunggah file ke Storage:`, storageError.message);
        continue;
      }

      // 3. Dapatkan Public URL
      const { data: publicUrlData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(uniqueFileName);
      
      // 4. Simpan ke database
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            filename: filename,
            content: extractedText,
            file_url: publicUrlData.publicUrl
          }
        ]);

      if (dbError) {
        console.error(`  ❌ Gagal menyimpan teks ke Database:`, dbError.message);
        continue;
      }

      console.log(`  ✅ Berhasil diunggah dan dibaca!`);

    } catch (error) {
      console.error(`  ❌ Terjadi kesalahan pada file ini:`, error);
    }
  }

  console.log("\n==========================================");
  console.log("🎉 SEMUA PROSES SELESAI!");
  console.log("Anda sudah bisa mencari data tersebut di web.");
  console.log("==========================================");
}

processBatch();
