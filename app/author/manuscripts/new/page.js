'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Send,
  Plus,
  Trash2,
  GripVertical,
  BookOpen,
  FileText,
  Heart,
  Users,
  User,
  Quote,
  Type,
  Sparkles,
  Feather,
  BookText,
  Scroll,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { RichTextArea } from '@/components/RichTextArea';

// Book types available for selection
const BOOK_TYPES = [
  { value: 'POETRY', label: 'Poetry Collection', icon: Feather, defaultBlock: 'POETRY' },
  { value: 'SHORT_STORY', label: 'Short Stories', icon: FileText, defaultBlock: 'SHORT_STORY' },
  { value: 'NOVEL', label: 'Novel', icon: BookOpen, defaultBlock: 'CHAPTER' },
  { value: 'NON_FICTION', label: 'Non-Fiction', icon: BookText, defaultBlock: 'CHAPTER' },
  { value: 'SHAYARI', label: 'Shayari', icon: Scroll, defaultBlock: 'POETRY' },
  { value: 'QUOTES', label: 'Quotes Collection', icon: MessageCircle, defaultBlock: 'CUSTOM' },
];

const BLOCK_TYPES = [
  { value: 'CHAPTER', label: 'Chapter', icon: BookOpen },
  { value: 'POETRY', label: 'Poetry', icon: Sparkles },
  { value: 'SHORT_STORY', label: 'Short Story', icon: FileText },
  { value: 'SHAYARI', label: 'Shayari', icon: Scroll },
  { value: 'QUOTE', label: 'Quote', icon: MessageCircle },
  { value: 'DEDICATION', label: 'Dedication', icon: Heart, required: true },
  { value: 'ACKNOWLEDGEMENTS', label: 'Acknowledgements', icon: Users, required: true },
  { value: 'ABOUT_AUTHOR', label: 'About the Author', icon: User, required: true },
  { value: 'BACK_COVER', label: 'Back Cover Blurb', icon: Quote, required: true },
  { value: 'CUSTOM', label: 'Custom Section', icon: Type },
];

export default function NewManuscriptPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Book Type, 2: Formatter
  const [selectedBookType, setSelectedBookType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  const [manuscript, setManuscript] = useState({
    title: '',
    subtitle: '',
    bookType: '',
    category: '',
    blocks: [],
  });

  useEffect(() => {
    fetchCategories();
    // Load from localStorage if exists
    const saved = localStorage.getItem('manuscript_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setManuscript(parsed);
        if (parsed.bookType) {
          setSelectedBookType(parsed.bookType);
          setStep(2);
        }
      } catch (e) {}
    }
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (manuscript.title || manuscript.blocks.length > 0) {
        localStorage.setItem('manuscript_draft', JSON.stringify(manuscript));
        console.log('Auto-saved draft');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [manuscript]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const selectBookType = (type) => {
    setSelectedBookType(type.value);
    
    // Initialize with required sections plus content blocks
    const requiredBlocks = [
      { id: 'dedication', type: 'DEDICATION', title: 'Dedication', content: '', required: true },
      { id: 'ack', type: 'ACKNOWLEDGEMENTS', title: 'Acknowledgements', content: '', required: true },
    ];
    
    // Add initial content block based on book type
    const contentBlock = {
      id: Date.now().toString(),
      type: type.defaultBlock,
      title: type.defaultBlock === 'CHAPTER' ? 'Chapter 1' : '',
      content: '',
    };
    
    // Add ending required sections
    const endingBlocks = [
      { id: 'about', type: 'ABOUT_AUTHOR', title: 'About the Author', content: '', required: true },
      { id: 'backcover', type: 'BACK_COVER', title: 'Back Cover Blurb', content: '', required: true },
    ];

    setManuscript({
      ...manuscript,
      bookType: type.value,
      blocks: [...requiredBlocks, contentBlock, ...endingBlocks],
    });
    
    setStep(2);
  };

  const addBlock = (type = null) => {
    const defaultType = selectedBookType 
      ? BOOK_TYPES.find(t => t.value === selectedBookType)?.defaultBlock || 'CHAPTER'
      : 'CHAPTER';
    
    // Find position before About Author section
    const aboutIndex = manuscript.blocks.findIndex(b => b.type === 'ABOUT_AUTHOR');
    const insertIndex = aboutIndex > -1 ? aboutIndex : manuscript.blocks.length;
    
    const newBlock = {
      id: Date.now().toString(),
      type: type || defaultType,
      title: '',
      content: '',
    };
    
    const newBlocks = [...manuscript.blocks];
    newBlocks.splice(insertIndex, 0, newBlock);
    setManuscript({ ...manuscript, blocks: newBlocks });
  };

  const updateBlock = (id, field, value) => {
    setManuscript({
      ...manuscript,
      blocks: manuscript.blocks.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    });
  };

  const removeBlock = (id) => {
    const block = manuscript.blocks.find(b => b.id === id);
    if (block?.required) {
      toast({ title: 'Cannot Remove', description: 'This section is required', variant: 'destructive' });
      return;
    }
    setManuscript({
      ...manuscript,
      blocks: manuscript.blocks.filter((b) => b.id !== id),
    });
  };

  const moveBlock = (index, direction) => {
    const block = manuscript.blocks[index];
    if (block?.required) {
      toast({ title: 'Cannot Move', description: 'Required sections have fixed positions', variant: 'destructive' });
      return;
    }
    
    const newBlocks = [...manuscript.blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Don't allow moving into required section positions
    const targetBlock = newBlocks[newIndex];
    if (targetBlock?.required) return;
    
    if (newIndex >= 0 && newIndex < newBlocks.length) {
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      setManuscript({ ...manuscript, blocks: newBlocks });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('manuscript_draft', JSON.stringify(manuscript));
      toast({ title: 'Saved', description: 'Draft saved locally' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!manuscript.title) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' });
      return;
    }
    
    // Check required sections have content
    const requiredBlocks = manuscript.blocks.filter(b => b.required);
    const emptyRequired = requiredBlocks.filter(b => !b.content?.trim());
    if (emptyRequired.length > 0) {
      toast({ 
        title: 'Required Sections', 
        description: `Please fill in: ${emptyRequired.map(b => b.title).join(', ')}`, 
        variant: 'destructive' 
      });
      return;
    }

    const contentBlocks = manuscript.blocks.filter(b => !b.required);
    if (contentBlocks.length === 0 || !contentBlocks.some(b => b.content?.trim())) {
      toast({ title: 'Error', description: 'Please add at least one content block with content', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch('/api/author/manuscripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manuscript.title,
          subtitle: manuscript.subtitle,
          bookType: manuscript.bookType,
          category: manuscript.category,
          authorId: user?.id,
          content: manuscript.blocks,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit manuscript');

      localStorage.removeItem('manuscript_draft');
      toast({ title: 'Success', description: 'Manuscript submitted for review!' });
      router.push('/author/manuscripts');
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setConfirmSubmitOpen(false);
    }
  };

  const getBlockIcon = (type) => {
    const block = BLOCK_TYPES.find((b) => b.value === type);
    return block ? block.icon : Type;
  };

  // Step 1: Book Type Selection
  if (step === 1) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Submit Your Manuscript</h1>
          <p className="text-muted-foreground">What type of book are you writing?</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {BOOK_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Card
                key={type.value}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                onClick={() => selectBookType(type)}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{type.label}</h3>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Select the type that best describes your work. You can add different content types later.
        </p>
      </div>
    );
  }

  // Step 2: Manuscript Formatter
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Manuscript Formatter</h1>
          <p className="text-muted-foreground mt-1">
            {BOOK_TYPES.find(t => t.value === selectedBookType)?.label || 'Create'} your manuscript
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => setConfirmSubmitOpen(true)} disabled={submitting}>
            <Send className="mr-2 h-4 w-4" /> Submit
          </Button>
        </div>
      </div>

      {/* Book Details */}
      <Card>
        <CardHeader>
          <CardTitle>Book Details</CardTitle>
          <CardDescription>Enter your book information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Your book title"
                value={manuscript.title}
                onChange={(e) => setManuscript({ ...manuscript, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                placeholder="Optional subtitle"
                value={manuscript.subtitle}
                onChange={(e) => setManuscript({ ...manuscript, subtitle: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={manuscript.category || 'none'}
              onValueChange={(v) => setManuscript({ ...manuscript, category: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
                {categories.length === 0 && (
                  <>
                    <SelectItem value="Fiction">Fiction</SelectItem>
                    <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                    <SelectItem value="Poetry">Poetry</SelectItem>
                    <SelectItem value="Self-Help">Self-Help</SelectItem>
                    <SelectItem value="Biography">Biography</SelectItem>
                    <SelectItem value="Children">Children</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Blocks */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>Add your content blocks. Required sections are pre-filled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {manuscript.blocks.map((block, index) => {
              const Icon = getBlockIcon(block.type);
              const isRequired = block.required;
              return (
                <Card key={block.id} className={`border-l-4 ${isRequired ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-primary'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {!isRequired && (
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveBlock(index, 'up')}
                            disabled={index === 0 || manuscript.blocks[index - 1]?.required}
                          >
                            ↑
                          </Button>
                          <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveBlock(index, 'down')}
                            disabled={index === manuscript.blocks.length - 1 || manuscript.blocks[index + 1]?.required}
                          >
                            ↓
                          </Button>
                        </div>
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${isRequired ? 'text-amber-600' : 'text-primary'}`} />
                          {isRequired ? (
                            <span className="font-medium">{block.title} <span className="text-xs text-amber-600">(Required)</span></span>
                          ) : (
                            <>
                              <Select
                                value={block.type}
                                onValueChange={(v) => updateBlock(block.id, 'type', v)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BLOCK_TYPES.filter(bt => !bt.required).map((bt) => (
                                    <SelectItem key={bt.value} value={bt.value}>
                                      {bt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Section title (optional)"
                                value={block.title}
                                onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                                className="flex-1"
                              />
                            </>
                          )}
                          {!isRequired && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBlock(block.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <RichTextArea
                          placeholder={isRequired ? `Write your ${block.title.toLowerCase()} here...` : "Write your content here..."}
                          value={block.content}
                          onChange={(val) => updateBlock(block.id, 'content', val)}
                          rows={isRequired ? 4 : 8}
                          className="font-serif"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Add Block Button */}
          <div className="flex justify-center pt-4 border-t">
            <Button onClick={() => addBlock()} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Content Block
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-save indicator */}
      <p className="text-center text-sm text-muted-foreground">
        Your work is auto-saved every 30 seconds
      </p>

      {/* Confirm Submit Dialog */}
      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Manuscript?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Your manuscript will be submitted for review. Once submitted, you won't be able to edit it until the review is complete.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
            <p><strong>Title:</strong> {manuscript.title || 'Untitled'}</p>
            <p><strong>Type:</strong> {BOOK_TYPES.find(t => t.value === manuscript.bookType)?.label}</p>
            <p><strong>Content Blocks:</strong> {manuscript.blocks.filter(b => !b.required).length}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
