import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const extensionDir = path.join(process.cwd(), 'extension');
    
    // Check if the directory exists
    if (!fs.existsSync(extensionDir)) {
      return NextResponse.json({ error: 'Extension directory not found' }, { status: 404 });
    }

    const zip = new AdmZip();
    zip.addLocalFolder(extensionDir);
    const zipBuffer = zip.toBuffer();

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="securevault-extension.zip"',
      },
    });
  } catch (error) {
    console.error('Error zipping extension:', error);
    return NextResponse.json({ error: 'Failed to create zip file' }, { status: 500 });
  }
}
