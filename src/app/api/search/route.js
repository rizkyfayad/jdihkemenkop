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

    // 1. Exact Phrase Search
    const exactSearchQuery = supabase
      .from('documents')
      .select('id, filename, file_url, content')
      .ilike('content', `%${query.trim()}%`)
      .limit(10);

    // 2. Search by filename — OR logic
    const filenameOrFilter = effectiveKeywords.map(w => `filename.ilike.%${w}%`).join(',');
    const filenameSearchQuery = supabase
      .from('documents')
      .select('id, filename, file_url, content')
      .or(filenameOrFilter)
      .limit(20);

    // 3. Search by content — OR logic menggunakan ilike agar lebih persis (fallback)
    // Batasi maksimum 5 keyword agar query tidak terlalu berat
    const topKeywords = effectiveKeywords.slice(0, 5);
    const contentOrFilter = topKeywords.map(w => `content.ilike.%${w}%`).join(',');
    const contentSearchQuery = supabase
      .from('documents')
      .select('id, filename, file_url, content')
      .or(contentOrFilter)
      .limit(100); // Naikkan limit agar dokumen yang relevan tidak terpotong sebelum di-ranking JS

    // Run queries concurrently
    const [exactRes, filenameRes, contentRes] = await Promise.all([exactSearchQuery, filenameSearchQuery, contentSearchQuery]);

    // Handle possible errors
    if (exactRes.error && filenameRes.error && contentRes.error) {
       console.error('All searches failed:', exactRes.error);
       throw contentRes.error;
    }

    // Merge results uniquely by ID
    let mergedData = [];
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

    addDocs(exactRes.data);
    addDocs(filenameRes.data);
    addDocs(contentRes.data);

    // Rank results based on relevance to the query
    // Normalisasi spasi (menghapus spasi ganda) untuk mencocokkan teks hasil ekstrak PDF
    const exactPhraseLower = query.toLowerCase().replace(/\s+/g, ' ').trim();
    mergedData.forEach(doc => {
        let score = 0;
        const contentLower = (doc.content || "").toLowerCase().replace(/\s+/g, ' ');
        const filenameLower = (doc.filename || "").toLowerCase().replace(/\s+/g, ' ');
        
        if (contentLower.includes(exactPhraseLower)) score += 1000;
        if (filenameLower.includes(exactPhraseLower)) score += 1000;

        effectiveKeywords.forEach(kw => {
            if (filenameLower.includes(kw)) score += 10;
            if (contentLower.includes(kw)) score += 1;
        });

        doc._relevanceScore = score;
    });

    // Sort descending by score
    mergedData.sort((a, b) => b._relevanceScore - a._relevanceScore);

    // === Integrasi RAG dengan Gemini AI ===
    let ai_summary = null;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (GEMINI_API_KEY) {
      if (query.split(' ').length > 2 || query.toLowerCase().includes('bagaimana') || query.toLowerCase().includes('apa') || query.toLowerCase().includes('syarat') || query.toLowerCase().includes('jelaskan')) {
          try {
              const { GoogleGenerativeAI } = require('@google/generative-ai');
              const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
              
              let model;
              try {
                  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
              } catch (e) {
                  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
              }

              let prompt = "";

              if (mergedData.length > 0) {
                  const topDocsContext = mergedData.slice(0, 4).map(d => {
                      return `DOKUMEN_SUMBER: ${d.filename}\nURL_BERKAS: ${d.file_url}\nISI:\n${(d.content || "").substring(0, 4000)}`;
                  }).join('\n\n---\n\n');

                  prompt = `
Kamu adalah Asisten Hukum Ahli untuk portal web Peraturan/JDIH. 
Tugasmu adalah menjawab pertanyaan pengguna secara ringkas, elegan, dan profesional berdasarkan dokumen referensi di bawah ini.

PERTANYAAN PENGGUNA: "${query}"

DOKUMEN REFERENSI:
${topDocsContext}

ATURAN MENJAWAB:
1. Jawab langsung pada intinya secara terstruktur (bisa pakai bullet points).
2. JANGAN mengulang-ulang menempelkan tautan dokumen di setiap poin jawaban.
3. Sebagai gantinya, sediakan bagian khusus "**Sumber Referensi:**" di bagian paling bawah dari seluruh jawabanmu. Di sana, buat daftar (bullet points) tautan ke dokumen yang kamu gunakan menggunakan format Markdown murni: [📄 NAMA DAN NOMOR PERATURAN](URL_BERKAS). Tampilkan setiap dokumen HANYA SATU KALI, meskipun dipakai di banyak poin.
4. Jika jawaban tidak ada dalam teks referensi, katakan bahwa informasi spesifik tidak ditemukan di database peraturan, lalu berikan jawaban umum terbaikmu sebagai asisten AI.
                  `;
              } else {
                  prompt = `
Kamu adalah Asisten Hukum Ahli untuk portal web Peraturan/JDIH Kemenkop. 
Pengguna menanyakan hal berikut: "${query}"

Namun, sistem database tidak menemukan dokumen spesifik yang cocok dengan kata kunci tersebut.
Tugasmu: 
1. Beritahu pengguna dengan sopan bahwa dokumen resminya tidak ditemukan di sistem saat ini.
2. Berikan jawaban umum yang informatif dan profesional sesuai dengan pengetahuan umum yang kamu miliki mengenai hukum, koperasi, atau pemerintahan di Indonesia.
                  `;
              }

              const aiResult = await model.generateContent(prompt);
              ai_summary = aiResult.response.text();
          } catch (aiError) {
              console.error("Gemini AI Error:", aiError);
              ai_summary = "⚠️ *Maaf, AI sedang sibuk merangkum atau kunci API bermasalah. Anda tetap bisa membaca dokumen aslinya di bawah.*";
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
        const queryLower = query.toLowerCase().replace(/\s+/g, ' ');
        const keywords = queryLower.split(' ').filter(w => w.length > 3);
        
        let matchIdx = -1;
        // Cari exact phrase match
        for (let i = 0; i < sentences.length; i++) {
            if (sentences[i].toLowerCase().replace(/\s+/g, ' ').includes(queryLower)) {
                matchIdx = i;
                break;
            }
        }
        
        // Kalau tidak ketemu, cari kalimat yang mengandung keyword terbanyak
        if (matchIdx === -1 && keywords.length > 0) {
            let maxHits = 0;
            for (let i = 0; i < sentences.length; i++) {
                const sLower = sentences[i].toLowerCase();
                let hits = 0;
                keywords.forEach(kw => {
                    if (sLower.includes(kw)) hits++;
                });
                if (hits > maxHits) {
                    maxHits = hits;
                    matchIdx = i;
                }
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
