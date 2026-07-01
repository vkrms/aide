'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Plus } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string | null;
    person: boolean;
    interest: boolean;
    challenge: boolean;
    novelty: boolean;
    urgency: boolean;
    consequence: string | null;
    nextStep: string | null;
}

interface TaskDialogProps {
    mode: 'create' | 'edit';
    task?: Task;
    onSaved: () => void;
}

const FLAGS = [
    { key: 'person', label: 'Person (P)' },
    { key: 'interest', label: 'Interest (I)' },
    { key: 'challenge', label: 'Challenge (C)' },
    { key: 'novelty', label: 'Novelty (N)' },
    { key: 'urgency', label: 'Urgency (U)' },
] as const;

type FlagKey = (typeof FLAGS)[number]['key'];

export function TaskDialog({ mode, task, onSaved }: TaskDialogProps) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [flags, setFlags] = useState<Record<FlagKey, boolean>>({
        person: false,
        interest: false,
        challenge: false,
        novelty: false,
        urgency: false,
    });
    const [consequence, setConsequence] = useState('');
    const [nextStep, setNextStep] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description ?? '');
            setFlags({
                person: task.person,
                interest: task.interest,
                challenge: task.challenge,
                novelty: task.novelty,
                urgency: task.urgency,
            });
            setConsequence(task.consequence ?? '');
            setNextStep(task.nextStep ?? '');
        } else {
            setTitle('');
            setDescription('');
            setFlags({ person: false, interest: false, challenge: false, novelty: false, urgency: false });
            setConsequence('');
            setNextStep('');
        }
    }, [task, open]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const url = mode === 'create' ? '/api/tasks' : `/api/tasks/${task!.id}`;
        const method = mode === 'create' ? 'POST' : 'PATCH';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description: description || null,
                ...flags,
                consequence: consequence || null,
                nextStep: nextStep || null,
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
                            New Task
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" type="button" title="Edit task">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'New Task' : 'Edit Task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
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
                            <Label>Priority (PICNU)</Label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {FLAGS.map(({ key, label }) => (
                                    <Label
                                        key={key}
                                        htmlFor={`flag-${key}`}
                                        className="flex items-center gap-2 font-normal"
                                    >
                                        <Checkbox
                                            id={`flag-${key}`}
                                            checked={flags[key]}
                                            onCheckedChange={(checked) =>
                                                setFlags((prev) => ({ ...prev, [key]: checked }))
                                            }
                                        />
                                        {label}
                                    </Label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="consequence">Consequence</Label>
                            <Textarea
                                id="consequence"
                                value={consequence}
                                onChange={(e) => setConsequence(e.target.value)}
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nextStep">Next step</Label>
                            <Input
                                id="nextStep"
                                value={nextStep}
                                onChange={(e) => setNextStep(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
