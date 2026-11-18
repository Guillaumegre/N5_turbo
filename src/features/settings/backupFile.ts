/**
 * Saving and opening a backup file on iOS / Android: the file is written to the cache, then
 * the share sheet lets the user put it in Files, Drive, a message… Opening uses the document
 * picker. backupFile.web.ts does the same with a download and a file input.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { strings } from '@/strings';

/** Shares the backup. Resolves once the share sheet is closed. */
export async function saveBackupFile(name: string, text: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: strings.backup.exportTitle });
}

/** The chosen file's text, or null when the user cancels. */
export async function pickBackupFile(): Promise<string | null> {
  // Android often labels .json files as octet-stream: accept that too, the content is checked anyway.
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
