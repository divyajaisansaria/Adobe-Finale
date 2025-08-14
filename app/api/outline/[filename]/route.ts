import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;

  // Basic security: prevent directory traversal attacks
  if (filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    // Construct the full path to the JSON file in your `public/model1` directory
    const jsonDirectory = path.join(process.cwd(), 'public', 'model1');
    const filePath = path.join(jsonDirectory, filename);

    // Read the file content
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Return the JSON data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    // If the file doesn't exist or there's an error, return a 404
    return NextResponse.json({ error: 'Outline not found' }, { status: 404 });
  }
}