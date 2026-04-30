"use client";

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setAiSummary(null);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.data || []);
        if (data.ai_summary) {
            setAiSummary(data.ai_summary);
        }
      } else {
        setSearchError(data.error || 'Pencarian gagal.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSearching(false);
    }
  };

  const extractMetadata = (filename) => {
    let jenis = "Dokumen";
    let nomor = "-";
    let tahun = "-";
    
    const jenisMatch = filename.match(/(Permenkop|Permendagri|Permendag|Peraturan\sMenteri|UU|Undang[ -]Undang|Keppres|Inpres|SE|Surat\sEdaran|SK|Keputusan|PMK)/i);
    if (jenisMatch) jenis = jenisMatch[1].toUpperCase();

    const nomorMatch = filename.match(/(?:Nomor|Nom|No\.?)\s*([\w\/-]+)/i);
    if (nomorMatch && nomorMatch[1].length < 15) nomor = nomorMatch[1]; // Hindari match ngawur

    const tahunMatch = filename.match(/(?:Th|Thn|Tahun)\.?\s*(\d{4})/i);
    if (tahunMatch) tahun = tahunMatch[1];
    else {
      // Coba tebak tahun 4 digit di rentang 1990-2050
      const guessYear = filename.match(/\b(19\d{2}|20\d{2})\b/);
      if (guessYear) tahun = guessYear[1];
    }

    return { jenis, nomor, tahun };
  };

  // Utility to highlight keyword in snippet
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    // Split by query case insensitive
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="highlight">{part}</span> 
            : part
        )}
      </span>
    );
  };

  const isLanding = !hasSearched;

  // Search Bar UI Extracted for reuse
  const SearchBox = (
    <motion.form 
      layout
      onSubmit={handleSearch} 
      className="search-pill-container" 
      style={{ 
         width: '100%', 
         padding: '0.4rem', 
         background: 'rgba(255,255,255,0.9)', 
         backdropFilter: 'blur(12px)',
         WebkitBackdropFilter: 'blur(12px)',
         border: '1px solid rgba(0,80,102,0.1)',
         boxShadow: '0 8px 32px 0 rgba(0,0,0,0.05)',
         borderRadius: '24px'
      }}
    >
      <div className="search-input-group" style={{ background: 'transparent' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(0,80,102,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          placeholder="Tanya sesuatu atau cari pasal..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ color: '#005066' }}
        />
      </div>
      <button type="submit" className="search-btn-primary" disabled={isSearching || !searchQuery.trim()} style={{ background: '#005066', color: 'white', borderRadius: '18px', padding: '0 2rem' }}>
        {isSearching ? <div className="loader" style={{borderTopColor: 'white'}}></div> : 'Cari'}
      </button>
    </motion.form>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#005066', overflowX: 'hidden' }}>
      
      {/* Grid Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: 'linear-gradient(rgba(0, 80, 102, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 80, 102, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none' }} />

      {/* Decorative Rings */}
      <motion.div animate={{ rotate: 360, scale: [1, 1.05, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'fixed', top: '-15%', right: '-10%', width: '600px', height: '600px', border: '1px solid rgba(157,195,39,0.2)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <motion.div animate={{ rotate: -360, scale: [1, 1.05, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '700px', height: '700px', border: '1px dashed rgba(0,80,102,0.1)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />

      {/* Dynamic Ambient Orbs */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 150, repeat: Infinity, ease: "linear" }} style={{ position: 'fixed', top: '-20%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(157,195,39,0.1) 0%, rgba(248,250,252,0) 60%)', zIndex: 0, borderRadius: '50%', pointerEvents: 'none' }} />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 180, repeat: Infinity, ease: "linear" }} style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(245,160,0,0.1) 0%, rgba(248,250,252,0) 60%)', zIndex: 0, borderRadius: '50%', pointerEvents: 'none' }} />
      <motion.div animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'fixed', top: '30%', left: '30%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(0,80,102,0.05) 0%, rgba(248,250,252,0) 60%)', zIndex: 0, borderRadius: '50%', pointerEvents: 'none' }} />
      
      {/* Floating Particles */}
      <motion.div animate={{ y: [0, -40, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'fixed', top: '20%', right: '25%', width: '4px', height: '4px', background: '#9DC327', borderRadius: '50%', boxShadow: '0 0 15px 3px rgba(157,195,39,0.6)', zIndex: 0 }} />
      <motion.div animate={{ y: [0, 50, 0], opacity: [0.1, 0.6, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} style={{ position: 'fixed', bottom: '30%', left: '15%', width: '6px', height: '6px', background: '#9DC327', borderRadius: '50%', boxShadow: '0 0 15px 3px rgba(157,195,39,0.6)', zIndex: 0 }} />
      <motion.div animate={{ x: [0, 30, 0], opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }} style={{ position: 'fixed', top: '40%', right: '10%', width: '5px', height: '5px', background: '#F5A000', borderRadius: '50%', boxShadow: '0 0 12px 2px rgba(245,160,0,0.5)', zIndex: 0 }} />
      <motion.div animate={{ y: [0, -20, 0], x: [0, -20, 0], opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }} style={{ position: 'fixed', top: '70%', left: '25%', width: '3px', height: '3px', background: '#005066', borderRadius: '50%', boxShadow: '0 0 10px 2px rgba(0,80,102,0.3)', zIndex: 0 }} />

      <main style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          
          {isLanding ? (
            <motion.div 
               key="landing"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -40, scale: 0.95 }}
               transition={{ duration: 0.5, ease: "easeOut" }}
               style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  width: '100%', 
                  maxWidth: '800px', 
                  padding: '2rem',
                  marginTop: '-10vh' 
               }}
            >
              <motion.div layoutId="header-text" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 className="main-title" style={{ fontSize: '3rem', fontWeight: 800, color: '#005066', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: '1.2' }}>
                  Sistem Informasi Pencarian<br/>Peraturan Koperasi
                </h1>
                <p className="main-subtitle" style={{ color: '#475569', fontSize: '1.1rem' }}>
                  Eksplorasi regulasi dan kebijakan secara semantik, ditenagai Kecerdasan Buatan.
                </p>
              </motion.div>
              
              <motion.div layoutId="search-bar" style={{ width: '100%', zIndex: 2 }}>
                 {SearchBox}
                 
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                 >
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>Coba tanyakan hal berikut</p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px' }}>
                      {['Syarat mendirikan koperasi merah putih', 'Fokus penggunaan dana desa 2026', 'Pengesahan Koperasi menurut Kemenkumham', 'Tata cara pinjaman'].map((suggestion, i) => (
                        <motion.button 
                          key={i}
                          className="suggestion-button"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + (i * 0.1) }}
                          onClick={(e) => {
                            e.preventDefault();
                            setSearchQuery(suggestion);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.8)',
                            border: '1px solid rgba(0,80,102,0.1)',
                            color: '#005066',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '99px',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backdropFilter: 'blur(4px)'
                          }}
                          onMouseEnter={(e) => {
                             e.currentTarget.style.background = 'rgba(157,195,39,0.15)';
                             e.currentTarget.style.borderColor = 'rgba(157,195,39,0.3)';
                             e.currentTarget.style.color = '#005066';
                             e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                             e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                             e.currentTarget.style.borderColor = 'rgba(0,80,102,0.1)';
                             e.currentTarget.style.color = '#005066';
                             e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'14px', height:'14px'}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                 </motion.div>
              </motion.div>
            </motion.div>

          ) : (
            <motion.div 
               key="results"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               style={{ width: '100%', maxWidth: '1000px', padding: '3rem 1rem' }}
            >
              <div className="results-top-bar" style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem' }}>
                 <div className="top-logo-container" style={{ display: 'flex', alignItems: 'center' }}>
                 <motion.button
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.3 }}
                   onClick={() => {
                      setHasSearched(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      setAiSummary(null);
                      setSearchError(null);
                   }}
                   style={{
                      background: 'rgba(255,255,255,0.8)',
                      border: '1px solid rgba(0,80,102,0.1)',
                      color: '#005066',
                      borderRadius: '50%',
                      width: '42px',
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginRight: '1rem'
                   }}
                   onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#F5A000';
                      e.currentTarget.style.borderColor = 'rgba(0,80,102,0.2)';
                   }}
                   onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                      e.currentTarget.style.color = '#005066';
                      e.currentTarget.style.borderColor = 'rgba(0,80,102,0.1)';
                   }}
                   title="Kembali ke Beranda"
                 >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                 </motion.button>
                 
                 <motion.h2 
                   layoutId="header-text" 
                   onClick={() => {
                      setHasSearched(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      setAiSummary(null);
                      setSearchError(null);
                   }}
                   style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#005066', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                   title="Kembali ke Beranda"
                 >
                    JDIH<span style={{color: '#9DC327'}}>.Kemenkop</span>
                 </motion.h2>
                 </div>
                 
                 <div style={{ flex: 1 }} />
                 
                 <motion.div layoutId="search-bar" className="top-search-bar" style={{ width: '60%' }}>
                    {SearchBox}
                 </motion.div>
              </div>

              {searchError && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="status-message status-error" style={{marginBottom: '2rem'}}>
                  {searchError}
                </motion.div>
              )}

              {/* Gemini AI Summary Box */}
              {aiSummary && (
                <motion.div 
                  className="ai-summary-box"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{
                     marginBottom: '2.5rem', 
                     padding: '2rem', 
                     background: 'rgba(255, 255, 255, 0.8)',
                     backdropFilter: 'blur(16px)',
                     WebkitBackdropFilter: 'blur(16px)',
                     border: '1px solid rgba(157, 195, 39, 0.3)',
                     borderTop: '2px solid #9DC327',
                     borderRadius: '16px',
                     color: '#334155',
                     boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)',
                     position: 'relative',
                     overflow: 'hidden'
                  }}
                >
                   {/* Glow accent inside card */}
                   <div style={{position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(157,195,39,0.15) 0%, rgba(255,255,255,0) 70%)', transform: 'translate(50%, -50%)', borderRadius: '50%'}} />

                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', color: '#005066', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                      Analisis Kecerdasan Buatan
                   </div>
                   <div className="ai-markdown" style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#0f172a' }}>
                      <ReactMarkdown 
                        components={{
                          a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                        }}
                      >
                        {aiSummary}
                      </ReactMarkdown>
                   </div>
                </motion.div>
              )}

              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="results-header" style={{ color: '#475569', fontSize: '1.1rem', fontWeight: 500, borderBottom: '1px solid rgba(0,80,102,0.1)', paddingBottom: '1rem' }}>
                    Ditemukan <span style={{color: '#005066', fontWeight: 600}}>{searchResults.length}</span> dokumen dari repositori
                  </h3>
                  
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem'}}>
                    {searchResults.map((result, idx) => {
                      const meta = extractMetadata(result.filename);
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + (idx * 0.05) }}
                          key={result.id || idx} 
                          className="result-item" 
                          style={{
                             background: 'rgba(255, 255, 255, 0.9)',
                             backdropFilter: 'blur(10px)',
                             border: '1px solid rgba(0,80,102,0.1)',
                             borderRadius: '16px',
                             overflow: 'hidden',
                             boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                             transition: 'transform 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          {/* Header Premium Style */}
                          <div style={{ background: 'rgba(0,80,102,0.03)', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,80,102,0.05)' }}>
                            <h4 style={{ fontSize: '1.2rem', color: '#005066', fontWeight: 'bold', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
                              {meta.jenis} {meta.nomor !== '-' ? `Nomor ${meta.nomor}` : ''} {meta.tahun !== '-' ? `Tahun ${meta.tahun}` : ''}
                            </h4>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                              {result.filename}
                            </div>
                          </div>

                          <div className="result-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 30%) 1fr', gap: '2rem', padding: '1.5rem' }}>
                            {/* Left: Metadata */}
                            <div className="result-metadata" style={{ borderRight: '1px solid rgba(0,80,102,0.05)', paddingRight: '1.5rem' }}>
                              <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: '0.75rem 0', color: '#64748b', borderBottom: '1px solid rgba(0,80,102,0.05)' }}>Jenis</td>
                                    <td style={{ padding: '0.75rem 0', fontWeight: '500', textAlign: 'right', borderBottom: '1px solid rgba(0,80,102,0.05)', color: '#0f172a' }}>{meta.jenis}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '0.75rem 0', color: '#64748b', borderBottom: '1px solid rgba(0,80,102,0.05)' }}>Nomor</td>
                                    <td style={{ padding: '0.75rem 0', fontWeight: '500', textAlign: 'right', borderBottom: '1px solid rgba(0,80,102,0.05)', color: '#0f172a' }}>{meta.nomor}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '0.75rem 0', color: '#64748b' }}>Tahun</td>
                                    <td style={{ padding: '0.75rem 0', fontWeight: '500', textAlign: 'right', color: '#0f172a' }}>{meta.tahun}</td>
                                  </tr>
                                </tbody>
                              </table>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
                                <a href={result.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#005066', color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'background 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.background='#003d4d'} onMouseLeave={(e)=>e.currentTarget.style.background='#005066'}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                                  Buka PDF
                                </a>
                                <a href={`${result.file_url}?download=`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(157,195,39,0.8)', color: '#005066', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'background 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(157,195,39,0.1)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                                  Unduh Berkas
                                </a>
                              </div>
                            </div>

                            {/* Right: Preview Snippet */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                                Sorotan Konten Terkait
                              </div>
                              <div className="result-snippet" style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', color: '#334155', background: 'rgba(0,80,102,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(0,80,102,0.05)', lineHeight: '1.7', flexGrow: 1 }}>
                                {highlightText(result.snippet, searchQuery)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!isSearching && hasSearched && searchResults.length === 0 && !searchError && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} style={{textAlign: 'center', padding: '4rem 0'}}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(0,80,102,0.2)" strokeWidth="1" style={{margin: '0 auto 1rem auto', display: 'block'}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <h3 style={{fontSize: '1.2rem', color: '#005066', fontWeight: 500}}>Tidak menemukan apa-apa</h3>
                  <p style={{color: '#475569'}}>Coba gunakan ejaan atau kata kunci yang berbeda.</p>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
