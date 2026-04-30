import './globals.css'

export const metadata = {
  title: 'Pencarian Peraturan Kementerian',
  description: 'Aplikasi pencarian dokumen dan peraturan kementerian berbasis pengenalan teks (Full-Text Search)',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <div className="container">

          {children}
        </div>
      </body>
    </html>
  )
}
