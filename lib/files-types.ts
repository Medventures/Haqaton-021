export type FileView = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  category: string;
  documentId: string | null;
  uploaderName: string;
  createdAt: string;
  canDelete: boolean;
};
