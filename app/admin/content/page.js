'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Eye,
  Edit2,
  Plus,
  Trash2,
  Home,
  BookOpen,
  Award,
  Library,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const CONTENT_PAGES = [
  { key: 'home', label: 'Homepage', icon: Home },
  { key: 'free-publishing', label: 'Free Publishing', icon: BookOpen },
  { key: 'writing-challenge', label: 'Writing Challenge', icon: Award },
  { key: 'anthology', label: 'Anthology', icon: Library },
  { key: 'faqs', label: 'FAQs', icon: HelpCircle },
];

export default function AdminContentPage() {
  const { toast } = useToast();
  const [contents, setContents] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeKey, setActiveKey] = useState('home');
  const [editMode, setEditMode] = useState(false);

  // FAQ specific state
  const [faqItems, setFaqItems] = useState([]);
  const [newFaqOpen, setNewFaqOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/admin/content');
      const data = await res.json();
      const contentMap = {};
      (data.contents || []).forEach(c => {
        contentMap[c.key] = c;
      });
      setContents(contentMap);
      if (contentMap.faqs?.content?.items) {
        setFaqItems(contentMap.faqs.content.items);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load content', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key, content) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, content }),
      });
      if (!res.ok) throw new Error('Failed to save content');
      toast({ title: 'Saved', description: 'Content updated successfully' });
      setEditMode(false);
      fetchContent();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFaqs = async () => {
    await handleSave('faqs', { items: faqItems });
  };

  const addFaq = () => {
    if (!newFaq.question || !newFaq.answer) {
      toast({ title: 'Error', description: 'Question and answer are required', variant: 'destructive' });
      return;
    }
    setFaqItems([...faqItems, { ...newFaq, id: Date.now().toString() }]);
    setNewFaq({ question: '', answer: '' });
    setNewFaqOpen(false);
  };

  const removeFaq = (id) => {
    setFaqItems(faqItems.filter(f => f.id !== id));
  };

  const updateFaq = (id, field, value) => {
    setFaqItems(faqItems.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const currentContent = contents[activeKey]?.content || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading content...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground mt-1">Manage website content and pages</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Page Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pages</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {CONTENT_PAGES.map((page) => {
                  const Icon = page.icon;
                  return (
                    <Button
                      key={page.key}
                      variant={activeKey === page.key ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveKey(page.key);
                        setEditMode(false);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {page.label}
                      {contents[page.key] && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {contents[page.key].isActive ? 'Active' : 'Draft'}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Editor */}
        <div className="lg:col-span-3">
          {activeKey === 'faqs' ? (
            /* FAQs Editor */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>FAQs</CardTitle>
                  <CardDescription>Manage frequently asked questions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setNewFaqOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add FAQ
                  </Button>
                  <Button onClick={handleSaveFaqs} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save FAQs'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No FAQs added yet</p>
                  </div>
                ) : (
                  faqItems.map((faq, index) => (
                    <Card key={faq.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                          <div className="flex-1 space-y-3">
                            <div className="space-y-2">
                              <Label>Question</Label>
                              <Input
                                value={faq.question}
                                onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Answer</Label>
                              <Textarea
                                value={faq.answer}
                                onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                                rows={3}
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFaq(faq.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            /* Generic Content Editor */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {CONTENT_PAGES.find(p => p.key === activeKey)?.label || 'Content'}
                  </CardTitle>
                  <CardDescription>Edit page content</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Active</Label>
                    <Switch
                      checked={contents[activeKey]?.isActive || false}
                      onCheckedChange={(checked) => {
                        setContents({
                          ...contents,
                          [activeKey]: { ...contents[activeKey], isActive: checked }
                        });
                      }}
                    />
                  </div>
                  {!editMode ? (
                    <Button onClick={() => setEditMode(true)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSave(activeKey, currentContent)}
                      disabled={saving}
                    >
                      <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={currentContent.title || ''}
                    onChange={(e) => {
                      const updated = { ...currentContent, title: e.target.value };
                      setContents({
                        ...contents,
                        [activeKey]: { ...contents[activeKey], content: updated }
                      });
                    }}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={currentContent.subtitle || ''}
                    onChange={(e) => {
                      const updated = { ...currentContent, subtitle: e.target.value };
                      setContents({
                        ...contents,
                        [activeKey]: { ...contents[activeKey], content: updated }
                      });
                    }}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hero Text</Label>
                  <Textarea
                    value={currentContent.heroText || ''}
                    onChange={(e) => {
                      const updated = { ...currentContent, heroText: e.target.value };
                      setContents({
                        ...contents,
                        [activeKey]: { ...contents[activeKey], content: updated }
                      });
                    }}
                    rows={4}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Main Content</Label>
                  <Textarea
                    value={currentContent.mainContent || ''}
                    onChange={(e) => {
                      const updated = { ...currentContent, mainContent: e.target.value };
                      setContents({
                        ...contents,
                        [activeKey]: { ...contents[activeKey], content: updated }
                      });
                    }}
                    rows={8}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Button Text</Label>
                  <Input
                    value={currentContent.ctaText || ''}
                    onChange={(e) => {
                      const updated = { ...currentContent, ctaText: e.target.value };
                      setContents({
                        ...contents,
                        [activeKey]: { ...contents[activeKey], content: updated }
                      });
                    }}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Link</Label>
                  <Input
                    value={currentContent.ctaLink || ''}
                    onChange={(e) => {
                      const updated = { ...currentContent, ctaLink: e.target.value };
                      setContents({
                        ...contents,
                        [activeKey]: { ...contents[activeKey], content: updated }
                      });
                    }}
                    disabled={!editMode}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New FAQ Dialog */}
      <Dialog open={newFaqOpen} onOpenChange={setNewFaqOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={newFaq.question}
                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                placeholder="What is your question?"
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={newFaq.answer}
                onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                placeholder="Provide a detailed answer..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFaqOpen(false)}>Cancel</Button>
            <Button onClick={addFaq}>Add FAQ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
