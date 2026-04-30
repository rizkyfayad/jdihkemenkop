import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
    }

    // ── Kata-kata tidak bermakna dalam pencarian (stop words Bahasa Indonesia) ──
    const STOP_WORDS = new Set([
      'bagaimana','cara','apa','siapa','dimana','kapan','mengapa','apakah',
      'yang','dan','atau','di','ke','dari','untuk','dengan','adalah','ini',
      'itu','juga','pada','akan','oleh','dalam','sudah','bisa','dapat',
      'lebih','agar','ada','serta','jika','baru','tentang','tidak','no',
      'nomor','tahun','tentang','mengenai','peraturan','menteri','kepada'
    ]);

    // Filter query jadi kata-kata bermakna saja
    const allWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const keywords = allWords.filter(w => !STOP_WORDS.has(w));
    // Jika semua kata habis difilter (misal query sangat pendek), gunakan kata terpanjang
    const effectiveKeywords = keywords.length > 0 ? keywords : allWords.sort((a,b) => b.length - a.length).slice(0, 3);

    // 1. Search by filename — OR logic: cocok jika ADA SATU kata yang cocok
    const filenameOrFilter = effectiveKeywords.map(w => `filename.ilike.%${w}%`).join(',');
    const filenameSearchQuery = supabase
      .from('documents')
      .select('id, filename, file_url, content')
      .or(filenameOrFilter)
      .limit(20);

    // 2. Search by content — gunakan kata kunci pertama yang paling relevan untuk FTS
    // Gabungkan dengan operator OR (|) untuk websearch PostgreSQL
    const ftsQuery = effectiveKeywords.join(' | ');
    const contentSearchQuery = supabase
      .from('documents')
      .select('id, filename, file_url, content')
      .textSearch('content', ftsQuery, {
        type: 'websearch',
        config: 'simple'
      })
      .limit(20);

    // Run both queries concurrently
    const [filenameRes, contentRes] = await Promise.all([filenameSearchQuery, contentSearchQuery]);

    // Handle possible errors
    if (filenameRes.error && contentRes.error) {
       console.error('Both searches failed:', filenameRes.error, contentRes.error);
       throw contentRes.error;
    }

    // Merge results uniquely by ID
    const mergedData = [];
    const seenIds = new Set();

    const addDocs = (docs) => {
       if (!docs) return;
       for (const doc of docs) {
         if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            mergedData.push(doc);
         }
       }
    };

    // Prioritize filename matches, then content matches
    addDocs(filenameRes.data);
    addDocs(contentRes.data);

    // === Integrasi RAG dengan Gemini AI ===
    let ai_summary = null;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (GEMINI_API_KEY && mergedData.length > 0) {
      // Hanya panggil AI jika query terlihat seperti pertanyaan natural (bukan cuma "UU 2 2024")
      if (query.split(' ').length > 2 || query.toLowerCase().includes('bagaimana') || query.toLowerCase().includes('apa') || query.toLowerCase().includes('syarat')) {
          try {
              const { GoogleGenerativeAI } = require('@google/generative-ai');
              const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
              const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

              // Ambil maksimal 3 dokumen teratas untuk jadi konteks
              const topDocsContext = mergedData.slice(0, 3).map(d => {
                  return `DOKUMEN_SUMBER: ${d.filename}\nURL_BERKAS: ${d.file_url}\nISI:\n${(d.content || "").substring(0, 5000)}`;
              }).join('\n\n---\n\n');

              const prompt = `
Kamu adalah Asisten Hukum Ahli untuk portal web Peraturan/JDIH. 
Tugasmu adalah menjawab pertanyaan pengguna secara ringkas, elegan, dan profesional berdasarkan dokumen referensi di bawah ini.

PERTANYAAN PENGGUNA: "${query}"

DOKUMEN REFERENSI:
${topDocsContext}

ATURAN MENJAWAB:
1. Jawab langsung pada intinya secara terstruktur (bisa pakai bullet points).
2. Di setiap akhir poin/kalimat yang bersumber spesifik pada satu peraturan, WAJIB tempelkan tombol tautannya dengan format Markdown murni: [📄 NAMA DAN NOMOR PERATURAN](URL_BERKAS) . 
   Ganti isi 'NAMA DAN NOMOR PERATURAN' dengan keterangan aslinya (misal: "Permenkop Nomor 2 Tahun 2024").
   Ganti nilai 'URL_BERKAS' dengan *URL_BERKAS* relevan milik dokumen tersebut (jangan mengarang URL sendiri).
3. Jika jawaban tidak ada dalam teks referensi, cukup menolak dengan sopan tanpa memberikan referensi ngawur.
              `;

              const aiResult = await model.generateContent(prompt);
              ai_summary = aiResult.response.text();
          } catch (aiError) {
              console.error("Gemini AI Error:", aiError);
              ai_summary = "⚠️ *Sistem AI Visi sedang sibuk atau mengalami kendala saat merangkum dokumen.*";
          }
      }
    }

    const finalData = processResults(mergedData, query);
    return NextResponse.json({ data: finalData, ai_summary: ai_summary });

  } catch (error) {

    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

// Function to find snippets around the keyword for highlight
function processResults(data, query) {
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safeQuery = escapeRegExp(query);

  const result = data.map(doc => {
    // Bersihkan header dan spasi
    let text = String(doc.content || "")
      .replace(/-\s*\d+\s*-.*?WAMENKOP\s*Catt:/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    // Handle dokumen hasil scan gambar yang tidak punya teks
    if (text.length === 0) {
        return {
            id: doc.id,
            filename: doc.filename,
            file_url: doc.file_url,
            snippet: "⚠️ Penjelasan tidak tersedia. Dokumen ini merupakan hasil scan gambar/foto sehingga isinya tidak dapat dibaca oleh sistem. Dokumen ini dimunculkan karena judul filenya cocok kriteria pencarian."
        };
    }
    
    // Coba temukan Tujuan Peraturan dari struktur resmi Kementerian (Menimbang: a. bahwa...)
    const tujuanMatch = text.match(/Menimbang\s*:\s*(?:a\.\s*)?bahwa\s*(.*?)(?:;|(?=\s*[bc]\.))/i);
    // Coba temukan subjek peraturannya
    const tentangMatch = text.match(/TENTANG\s+([A-Z0-9\s/,\.\-]+?)\s+(?:DENGAN RAHMAT|Menimbang|Mengingat|DALAM RANGKA)/i);

    let snippet = "";
    
    // Jika format peraturannya terdeteksi, kita kembalikan Tujuannya saja sesuai perintah
    if (tujuanMatch && tujuanMatch[1]) {
        if (tentangMatch && tentangMatch[1]) {
           snippet = `ATURAN TENTANG:\n${tentangMatch[1].trim()}\n\nTUJUAN PERATURAN:\nBahwa ${tujuanMatch[1].trim()}.`;
        } else {
           snippet = `TUJUAN PERATURAN:\nBahwa ${tujuanMatch[1].trim()}.`;
        }
    } else {
        // Jika tidak berformat Peraturan Kementerian standar (misal PDF panduan/bebas), gunakan pencari kalimat
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const queryLower = query.toLowerCase();
        
        let matchIdx = -1;
        for (let i = 0; i < sentences.length; i++) {
            if (sentences[i].toLowerCase().includes(queryLower)) {
                matchIdx = i;
                break;
            }
        }
        
        if (matchIdx !== -1) {
            let summarySentences = [sentences[matchIdx].trim()];
            let currentLength = summarySentences[0].length;
            
            let rightIdx = matchIdx + 1;
            while (currentLength < 300 && rightIdx < sentences.length) {
                let nextSent = sentences[rightIdx].trim();
                summarySentences.push(nextSent);
                currentLength += nextSent.length;
                rightIdx++;
            }
            
            let leftIdx = matchIdx - 1;
            while (currentLength < 150 && leftIdx >= 0) {
                let prevSent = sentences[leftIdx].trim();
                summarySentences.unshift(prevSent);
                currentLength += prevSent.length;
                leftIdx--;
            }

            snippet = summarySentences.join(" ");
            
            if (leftIdx >= 0) snippet = "... " + snippet;
            if (rightIdx < sentences.length) snippet = snippet + " ...";
            if (snippet.length > 500) snippet = snippet.substring(0, 500) + "...";
        } else {
            // Jika pencarian cocok karena judul tapi di dalam teks tidak ada kata itu persis, ambil awalan dokumen
            snippet = text.substring(0, 400).trim() + "...";
        }
    }

    return {
      id: doc.id,
      filename: doc.filename,
      file_url: doc.file_url,
      snippet: snippet
    }
  });

  return result;
}
