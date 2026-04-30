import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import pdfParse from 'pdf-parse';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Convert file to buffer and extract text via pdfParse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const parsedData = await pdfParse(buffer);
    const extractedText = parsedData.text;

    // Upload the file to Supabase Storage
    // Generate a unique filename to prevent overrides
    const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('pdfs')
      .upload(uniqueFileName, buffer, {
        contentType: file.type,
      });

    if (storageError) {
      console.error('Supabase Storage Error:', storageError);
      return NextResponse.json({ error: 'Failed to upload physical file to Supabase Storage.' }, { status: 500 });
    }

    // Get the public URL for the newly uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('pdfs')
      .getPublicUrl(uniqueFileName);
    
    // Save metadata and extracted text to Database
    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert([
        {
          filename: file.name,
          content: extractedText,
          file_url: publicUrlData.publicUrl
        }
      ]);

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return NextResponse.json({ error: 'Failed to save document data to database.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'PDF successfully uploaded and processed.' });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
