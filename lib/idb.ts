"use client";

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// This now defines the structure for a SINGLE file record.
export interface FileRecord {
  id: number;
  persona?: string; // Changed to optional
  jobToBeDone?: string; // Changed to optional
  name: string;
  url:string;
  createdAt: Date;
}

interface AdobeHackathonDB extends DBSchema {
  files: {
    key: number;
    value: FileRecord;
    indexes: { 'createdAt': Date };
  };
}

let dbPromise: Promise<IDBPDatabase<AdobeHackathonDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AdobeHackathonDB>('adobe-hackathon-db', 2, { // Version 2
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          // If a 'documents' store from an old version exists, delete it
          if (db.objectStoreNames.contains('documents')) {
            db.deleteObjectStore('documents');
          }
          // Create the new 'files' store
          const store = db.createObjectStore('files', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

// Adds a SINGLE file record to the database
// The 'data' parameter now correctly reflects the optional fields.
export async function addFileRecord(data: Omit<FileRecord, 'id' | 'createdAt'>): Promise<FileRecord> {
  const db = await getDb();
  const record = {
    ...data,
    createdAt: new Date(),
  };
  // 'as any' is used here because the partial record doesn't match the full value type until the id is added.
  const newId = await db.add('files', record as any); 
  return { ...record, id: newId };
}

// Gets all individual file records
export async function getAllFileRecords(): Promise<FileRecord[]> {
  const db = await getDb();
  // Sorting in reverse chronological order to get newest first
  return db.getAllFromIndex('files', 'createdAt').then(items => items.reverse());
}

// Deletes a SINGLE file record by its ID
export async function deleteFileRecord(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('files', id);
}

// (Optional) A function to update a record, for instance, to add persona/job later
export async function updateFileRecord(id: number, data: Partial<FileRecord>): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const record = await store.get(id);
    if (record) {
        Object.assign(record, data);
        await store.put(record);
    }
    await tx.done;
}