'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Send,
  Plus,
  Trash2,
  File,
  FileUp,
  Edit3,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Simple Rich Text Editor Component
function RichTextEditor({ value, onChange, placeholder, rows = 6 }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const execCommand = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className={`border rounded-md overflow-hidden ${isFocused ? 'ring-2 ring-ring' : ''}`}>
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('bold')}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('italic')}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('underline')}>
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyLeft')}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyCenter')}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyRight')}>
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-3 min-h-[150px] focus:outline-none prose prose-sm max-w-none"
        style={{ minHeight: `${rows * 24}px` }}
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedStages, setExpandedStages] = useState({});
  
  // Manuscript state
  const [manuscript, setManuscript] = useState(null);
  const [manuscriptMode, setManuscriptMode] = useState('formatter'); // 'formatter' or 'upload'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Formatter blocks
  const [blocks, setBlocks] = useState([]);
  
  // Query form
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryForm, setQueryForm] = useState({ subject: '', description: '' });

  useEffect(() => {
    fetchBook();
  }, [params.id]);

  const fetchBook = async () => {
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const res = await fetch(`/api/books/${params.id}?authorId=${user?.id}`);
      const data = await res.json();
      if (data.book) {
        setBook(data.book);
        
        // Load manuscript if exists
        if (data.book.manuscripts?.length > 0) {
          const ms = data.book.manuscripts[0];
          setManuscript(ms);
          if (ms.content) {
            setBlocks(ms.content);
          }
          if (ms.isWordUpload) {
            setManuscriptMode('upload');
            setUploadedFile({ name: ms.fileName, url: ms.fileUrl });
          }
        } else {
          // Initialize default blocks based on book type
          initializeBlocks(data.book.category);
        }
        
        // Auto-expand first active stage
        const stages = data.book.publishingStages || [];
        const firstActive = stages.find(s => s.status === 'IN_PROGRESS');
        if (firstActive) setExpandedStages({ [firstActive.id]: true });
      }
    } catch (error) {
      console.error('Error fetching book:', error);
      toast({ title: 'Error', description: 'Failed to load book', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const initializeBlocks = (category) => {
    const defaultBlocks = [
      { id: '1', type: 'dedication', title: 'Dedication', content: '', required: true },
      { id: '2', type: 'preface', title: 'Preface', content: '', required: false },
      { id: '3', type: 'acknowledgements', title: 'Acknowledgements', content: '', required: false },
      { id: '4', type: 'chapter', title: 'Chapter 1', content: '', required: true },
    ];
    setBlocks(defaultBlocks);
  };

  const addBlock = (type = 'chapter') => {
    const chapterCount = blocks.filter(b => b.type === 'chapter').length;
    const newBlock = {
      id: Date.now().toString(),
      type,
      title: type === 'chapter' ? `Chapter ${chapterCount + 1}` : type.charAt(0).toUpperCase() + type.slice(1),
      content: '',
      required: false,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id, field, value) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBlock = (id) => {
    const block = blocks.find(b => b.id === id);
    if (block?.required) {
      toast({ title: 'Cannot remove', description: 'This section is required', variant: 'destructive' });
      return;
    }
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file', description: 'Please upload a Word document (.doc or .docx)', variant: 'destructive' });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // In a real implementation, this would upload to a file storage service
      // For now, we'll create a local URL and store the file info
      const fileUrl = URL.createObjectURL(file);
      setUploadedFile({ name: file.name, url: fileUrl, size: file.size, file });
      setManuscriptMode('upload');
      toast({ title: 'File selected', description: 'Click Save to upload your manuscript' });
    } catch (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const saveManuscript = async (submit = false) => {
    setSaving(true);
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      // If uploading a Word file, use FormData
      if (manuscriptMode === 'upload' && uploadedFile?.file) {
        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        formData.append('bookId', book.id);
        formData.append('authorId', user?.id);
        formData.append('notes', submit ? 'Submitted for review' : 'Draft');

        const res = await fetch('/api/manuscripts', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to upload');
        }
        
        const data = await res.json();
        
        // Update the manuscript status if submitting
        if (submit && data.manuscript) {
          await fetch('/api/author/manuscripts', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': user?.id,
            },
            body: JSON.stringify({
              id: data.manuscript.id,
              bookId: book.id,
              status: 'SUBMITTED',
            }),
          });
        }
        
        setManuscript(data.manuscript);
        setUploadedFile({ name: data.manuscript.fileName, url: data.manuscript.fileUrl });
        toast({ 
          title: submit ? 'Submitted!' : 'Uploaded', 
          description: submit ? 'Your manuscript has been submitted for review' : 'File uploaded successfully' 
        });
        
        fetchBook();
        return;
      }

      // Formatter mode - save content via JSON
      const payload = {
        bookId: book.id,
        authorId: user?.id,
        isWordUpload: false,
        content: blocks,
        fileName: `${book.title}-manuscript`,
        fileUrl: '',
        status: submit ? 'SUBMITTED' : 'UPLOADED',
      };

      // Use PUT if updating, POST if creating
      const method = manuscript?.id ? 'PUT' : 'POST';
      const bodyData = manuscript?.id ? { ...payload, id: manuscript.id } : payload;

      const res = await fetch('/api/author/manuscripts', {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id,
        },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) throw new Error('Failed to save');
      
      const data = await res.json();
      setManuscript(data.manuscript);
      toast({ 
        title: submit ? 'Submitted!' : 'Saved', 
        description: submit ? 'Your manuscript has been submitted for review' : 'Draft saved successfully' 
      });
      
      if (submit) {
        fetchBook();
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const submitQuery = async () => {
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch('/api/author/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id },
        body: JSON.stringify({
          bookId: book.id,
          subject: queryForm.subject,
          description: queryForm.description,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit query');
      
      toast({ title: 'Query submitted', description: 'We will respond shortly' });
      setQueryDialogOpen(false);
      setQueryForm({ subject: '', description: '' });
      fetchBook();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-gray-100 text-gray-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-green-100 text-green-700',
      AWAITING_APPROVAL: 'bg-yellow-100 text-yellow-700',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const calculateProgress = () => {
    if (!book?.publishingStages?.length) return 0;
    const completed = book.publishingStages.filter(s => s.status === 'COMPLETED').length;
    return Math.round((completed / book.publishingStages.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Book not found</p>
        <Link href="/author/books">
          <Button className="mt-4">Back to My Books</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/author/books">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <p className="text-muted-foreground">{book.category || 'Uncategorized'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(book.status)}
          <Button variant="outline" onClick={() => setQueryDialogOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-2" /> Raise Query
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Publishing Progress</span>
            <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manuscript">
            <Edit3 className="h-4 w-4 mr-1" /> Manuscript
          </TabsTrigger>
          <TabsTrigger value="stages">Stages ({book.publishingStages?.length || 0})</TabsTrigger>
          <TabsTrigger value="queries">Queries ({book.queries?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Book Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ISBN (Paperback)</span>
                  <span className="font-mono">{book.isbnPaperback || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ISBN (Hardcover)</span>
                  <span className="font-mono">{book.isbnHardcover || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ISBN (Ebook)</span>
                  <span className="font-mono">{book.isbnEbook || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(book.status)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manuscript Status</CardTitle>
              </CardHeader>
              <CardContent>
                {manuscript ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span>{manuscript.fileName}</span>
                    </div>
                    <Badge className={manuscript.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      {manuscript.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(manuscript.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No manuscript yet</p>
                    <Button className="mt-2" onClick={() => setActiveTab('manuscript')}>
                      Start Writing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Manuscript Tab */}
        <TabsContent value="manuscript" className="space-y-4">
          {/* Mode Selection */}
          {!manuscript?.status || manuscript.status === 'UPLOADED' ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant={manuscriptMode === 'formatter' ? 'default' : 'outline'}
                      onClick={() => setManuscriptMode('formatter')}
                    >
                      <Edit3 className="h-4 w-4 mr-2" /> Use Formatter
                    </Button>
                    {book.allowWordUpload && (
                      <Button
                        variant={manuscriptMode === 'upload' ? 'default' : 'outline'}
                        onClick={() => setManuscriptMode('upload')}
                      >
                        <FileUp className="h-4 w-4 mr-2" /> Upload Word Document
                      </Button>
                    )}
                    {!book.allowWordUpload && (
                      <p className="text-sm text-muted-foreground">
                        Word upload is not enabled for this project
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Formatter Mode */}
              {manuscriptMode === 'formatter' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Manuscript Formatter</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => saveManuscript(false)} disabled={saving}>
                          <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button onClick={() => saveManuscript(true)} disabled={saving}>
                          <Send className="h-4 w-4 mr-2" /> Submit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {blocks.map((block, idx) => (
                      <div key={block.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={block.title}
                              onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                              className="font-semibold w-48"
                            />
                            {block.required && <Badge variant="outline">Required</Badge>}
                          </div>
                          {!block.required && (
                            <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <RichTextEditor
                          value={block.content}
                          onChange={(val) => updateBlock(block.id, 'content', val)}
                          placeholder={`Write your ${block.title.toLowerCase()} here...`}
                          rows={block.type === 'chapter' ? 10 : 4}
                        />
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => addBlock('chapter')}>
                        <Plus className="h-4 w-4 mr-2" /> Add Chapter
                      </Button>
                      <Select onValueChange={(type) => addBlock(type)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Add Section..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preface">Preface</SelectItem>
                          <SelectItem value="prologue">Prologue</SelectItem>
                          <SelectItem value="epilogue">Epilogue</SelectItem>
                          <SelectItem value="afterword">Afterword</SelectItem>
                          <SelectItem value="appendix">Appendix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Mode */}
              {manuscriptMode === 'upload' && book.allowWordUpload && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Upload Word Document</CardTitle>
                      <div className="flex gap-2">
                        <Button onClick={() => saveManuscript(true)} disabled={!uploadedFile || saving}>
                          <Send className="h-4 w-4 mr-2" /> {saving ? 'Uploading...' : 'Submit'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    
                    {uploadedFile ? (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <File className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {uploadedFile.size ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                        </p>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                          Choose Different File
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">Click to upload your manuscript</p>
                        <p className="text-sm text-muted-foreground">Word documents only (.doc, .docx) • Max 10MB</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-semibold mb-2">Manuscript Submitted</h3>
                <p className="text-muted-foreground mb-4">
                  Your manuscript has been submitted and is being reviewed.
                </p>
                {manuscript?.isWordUpload && manuscript?.fileUrl && (
                  <Button variant="outline" asChild>
                    <a href={manuscript.fileUrl} download={manuscript.fileName}>
                      <Download className="h-4 w-4 mr-2" /> Download Your Submission
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-4">
          {book.publishingStages?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No publishing stages assigned yet
              </CardContent>
            </Card>
          ) : (
            book.publishingStages?.map((stage) => (
              <Collapsible
                key={stage.id}
                open={expandedStages[stage.id]}
                onOpenChange={(open) => setExpandedStages({ ...expandedStages, [stage.id]: open })}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {stage.status === 'COMPLETED' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : stage.status === 'IN_PROGRESS' ? (
                            <Clock className="h-5 w-5 text-blue-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <CardTitle className="text-base">{stage.name || stage.stageType?.replace(/_/g, ' ')}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(stage.status)}
                          {expandedStages[stage.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {stage.notes && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          <p className="text-sm">{stage.notes}</p>
                        </div>
                      )}
                      {stage.assignedTo && (
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {stage.assignedTo.name}
                        </p>
                      )}
                      {stage.completedAt && (
                        <p className="text-sm text-muted-foreground">
                          Completed: {new Date(stage.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </TabsContent>

        {/* Queries Tab */}
        <TabsContent value="queries" className="space-y-4">
          {book.queries?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No queries yet</p>
                <Button className="mt-4" onClick={() => setQueryDialogOpen(true)}>
                  Raise a Query
                </Button>
              </CardContent>
            </Card>
          ) : (
            book.queries?.map((query) => (
              <Card key={query.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{query.subject}</CardTitle>
                    <Badge className={query.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      {query.status}
                    </Badge>
                  </div>
                  <CardDescription>{new Date(query.createdAt).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{query.description}</p>
                  {query.response && (
                    <div className="mt-3 bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Response:</p>
                      <p className="text-sm">{query.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Query Dialog */}
      <Dialog open={queryDialogOpen} onOpenChange={setQueryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a Query</DialogTitle>
            <DialogDescription>Have a question about your book? We're here to help.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input
                value={queryForm.subject}
                onChange={(e) => setQueryForm({ ...queryForm, subject: e.target.value })}
                placeholder="Brief subject"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={queryForm.description}
                onChange={(e) => setQueryForm({ ...queryForm, description: e.target.value })}
                placeholder="Describe your query in detail"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQueryDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitQuery} disabled={!queryForm.subject || !queryForm.description}>
              Submit Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
