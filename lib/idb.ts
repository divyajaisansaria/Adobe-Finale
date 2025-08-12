// lib/idb.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// This now defines the structure for a SINGLE file record.
export interface FileRecord {
  id: number;
  persona: string;
  jobToBeDone: string;
  name: string;
  url: string;
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
    dbPromise = openDB<AdobeHackathonDB>('adobe-hackathon-db', 2, { // Version bumped to 2 for schema change
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          // If a 'documents' store from the old version exists, delete it
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
export async function addFileRecord(data: Omit<FileRecord, 'id' | 'createdAt'>): Promise<FileRecord> {
  const db = await getDb();
  const record = {
    ...data,
    createdAt: new Date(),
  };
  const newId = await db.add('files', record as any);
  return { ...record, id: newId };
}

// Gets all individual file records
export async function getAllFileRecords(): Promise<FileRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('files', 'createdAt');
}

// Deletes a SINGLE file record by its ID
export async function deleteFileRecord(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('files', id);
}