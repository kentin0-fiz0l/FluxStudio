/**
 * DocumentList Component
 *
 * Displays and manages project documents with create/archive/delete actions
 */

import { useEffect, useState } from 'react';
import { FileText, Plus, MoreVertical, Archive, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/lib/toast';

interface Document {
  id: number;
  roomId: string;
  projectId: string;
  title: string;
  documentType: string;
  isArchived: boolean;
  lastEditedBy: string;
  lastEditedByName: string;
  lastEditedAt: string;
  createdAt: string;
  versionCount: number;
  userRole: string;
}

interface DocumentListProps {
  projectId: string;
  onOpenDocument: (documentId: number) => void;
}

export function DocumentList({ projectId, onOpenDocument }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDocument() {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          documentType: 'rich-text',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();

      toast.success('Document created - Opening your new document...');

      // Open the newly created document
      onOpenDocument(data.document.id);
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    }
  }

  async function handleDeleteDocument(document: Document) {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success(`"${document.title}" has been archived`);

      // Refresh the list
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to archive document');
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documents</h2>
          <p className="text-muted-foreground">
            Collaborative documents for this project
          </p>
        </div>
        <Button onClick={handleCreateDocument}>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No documents yet</CardTitle>
            <CardDescription className="max-w-sm mx-auto">
              Get started by creating your first collaborative document. Documents support
              real-time editing, version history, and rich text formatting.
            </CardDescription>
            <div className="pt-4">
              <Button onClick={handleCreateDocument}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Document
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <Card
              key={document.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onOpenDocument(document.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{document.title}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDate(document.lastEditedAt)}
                      </div>
                      <div className="text-xs">
                        Edited by {document.lastEditedByName || 'Unknown'}
                      </div>
                      {document.versionCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {document.versionCount} version{document.versionCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onOpenDocument(document.id);
                      }}>
                        <FileText className="mr-2 h-4 w-4" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(document.userRole === 'manager' || document.userRole === 'contributor') && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentToDelete(document);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{documentToDelete?.title}"?
              This will hide the document from the list, but it can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDeleteDocument(documentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
