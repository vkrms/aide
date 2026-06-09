'use client';

import { useState, useEffect } from 'react';
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
import { Pencil, Plus } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    description: string | null;
    telegramChatId: string;
}

interface ProjectDialogProps {
    mode: 'create' | 'edit';
    project?: Project;
    onSaved: () => void;
}

export function ProjectDialog({ mode, project, onSaved }: ProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description ?? '');
            setTelegramChatId(project.telegramChatId);
        } else {
            setName('');
            setDescription('');
            setTelegramChatId('');
        }
    }, [project, open]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const url =
            mode === 'create'
                ? '/api/projects'
                : `/api/projects/${project!.id}`;
        const method = mode === 'create' ? 'POST' : 'PATCH';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: description || null, telegramChatId }),
        });

        if (res.ok) {
            setOpen(false);
            onSaved();
        }
        setSaving(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    mode === 'create' ? (
                        <Button size="sm" type="button">
                            <Plus className="mr-1 h-4 w-4" />
                            New Project
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" type="button" title="Edit project">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' ? 'New Project' : 'Edit Project'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="chatId">Telegram Chat ID</Label>
                        <Input
                            id="chatId"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
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
