import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: Request,
  context: { params: { filename: string } } // Keep params here
) {
  // Await the params before using
  const params = await context.params;
  const filename = params?.filename;

  if (!filename) {
    return NextResponse.json({ error: 'Filename not provided' }, { status: 400 });
  }

  // Basic security: prevent directory traversal
  if (filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    // Path to JSON files
    const jsonDirectory = path.join(process.cwd(), 'public', 'model1');
    const filePath = path.join(jsonDirectory, filename);

    // Read file content
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return NextResponse.json({ error: 'Outline not found' }, { status: 404 });
  }
}
