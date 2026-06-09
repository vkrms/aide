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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Pencil, Plus } from 'lucide-react';

interface Project {
    id: string;
    name: string;
}

interface Reminder {
    id: string;
    message: string;
    scheduledAt: string;
    status: string;
    projectId: string | null;
}

interface ReminderDialogProps {
    mode: 'create' | 'edit';
    reminder?: Reminder;
    projects: Project[];
    onSaved: () => void;
}

export function ReminderDialog({
    mode,
    reminder,
    projects,
    onSaved,
}: ReminderDialogProps) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [status, setStatus] = useState('pending');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (reminder) {
            setMessage(reminder.message);
            setScheduledAt(reminder.scheduledAt.slice(0, 16));
            setStatus(reminder.status);
            setProjectId(reminder.projectId);
        } else {
            setMessage('');
            setScheduledAt('');
            setStatus('pending');
            setProjectId(null);
        }
    }, [reminder, open]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const url =
            mode === 'create'
                ? '/api/reminders'
                : `/api/reminders/${reminder!.id}`;
        const method = mode === 'create' ? 'POST' : 'PATCH';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                scheduledAt: new Date(scheduledAt).toISOString(),
                status,
                projectId: projectId || null,
            }),
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
                            New Reminder
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" type="button" title="Edit reminder">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' ? 'New Reminder' : 'Edit Reminder'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="msg">Message</Label>
                        <Input
                            id="msg"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sched">Scheduled At</Label>
                        <Input
                            id="sched"
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v ?? 'pending')}>
                            <SelectTrigger id="status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="project">Project (optional)</Label>
                        <Select
                            value={projectId ?? ''}
                            onValueChange={(v) =>
                                setProjectId(v || null)
                            }
                        >
                            <SelectTrigger id="project">
                                <SelectValue placeholder="No project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">No project</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
