'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface MemoryDialogProps {
    onSaved: () => void;
}

export function MemoryDialog({ onSaved }: MemoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [telegramChatId, setTelegramChatId] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const res = await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramChatId, content }),
        });

        if (res.ok) {
            setOpen(false);
            setTelegramChatId('');
            setContent('');
            onSaved();
        }
        setSaving(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" type="button">
                        <Plus className="mr-1 h-4 w-4" />
                        New Memory
                    </Button>
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Memory</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="chatId">Telegram Chat ID</Label>
                        <Input
                            id="chatId"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={3}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
