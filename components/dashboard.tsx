'use client';

import { useCallback, useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { ProjectDialog } from '@/components/project-dialog';
import { ReminderDialog } from '@/components/reminder-dialog';
import { MemoryDialog } from '@/components/memory-dialog';
import { ConfirmDelete } from '@/components/confirm-dialog';
import { Loader2, AlertTriangle } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    description: string | null;
    telegramChatId: string;
    createdAt: string;
}

interface Reminder {
    id: string;
    message: string;
    scheduledAt: string;
    status: string;
    projectId: string | null;
    projectName: string | null;
}

interface Memory {
    id: string;
    telegramChatId: string;
    content: string;
    createdAt: string;
}

export function Dashboard() {
    const [tab, setTab] = useState<'projects' | 'reminders' | 'memories'>('projects');
    const [projects, setProjects] = useState<Project[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        const res = await fetch('/api/projects');
        if (res.ok) { setProjects(await res.json()); setError(null); }
        else setError('Failed to load projects.');
    }, []);

    const fetchReminders = useCallback(async () => {
        const res = await fetch('/api/reminders');
        if (res.ok) { setReminders(await res.json()); setError(null); }
        else setError('Failed to load reminders.');
    }, []);

    const fetchMemories = useCallback(async () => {
        const res = await fetch('/api/memories');
        if (res.ok) { setMemories(await res.json()); setError(null); }
        else setError('Failed to load memories.');
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        await Promise.all([fetchProjects(), fetchReminders(), fetchMemories()]);
        setLoading(false);
    }, [fetchProjects, fetchReminders, fetchMemories]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    async function deleteProject(id: string) {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        fetchProjects();
        fetchReminders();
    }

    async function deleteReminder(id: string) {
        await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
        fetchReminders();
    }

    async function deleteMemoryById(id: string) {
        await fetch(`/api/memories/${id}`, { method: 'DELETE' });
        fetchMemories();
    }

    const projectColumns: ColumnDef<Project>[] = [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'description', header: 'Description' },
        { accessorKey: 'telegramChatId', header: 'Chat ID' },
        {
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ getValue }) =>
                new Date(getValue<string>()).toLocaleDateString(),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <ProjectDialog
                        mode="edit"
                        project={row.original}
                        onSaved={() => {
                            fetchProjects();
                            fetchReminders();
                        }}
                    />
                    <ConfirmDelete
                        title="Delete project"
                        description={`Delete "${row.original.name}" and all its reminders? This cannot be undone.`}
                        onConfirm={() => deleteProject(row.original.id)}
                    />
                </div>
            ),
        },
    ];

    const reminderColumns: ColumnDef<Reminder>[] = [
        { accessorKey: 'message', header: 'Message' },
        {
            accessorKey: 'scheduledAt',
            header: 'Scheduled',
            cell: ({ getValue }) =>
                new Date(getValue<string>()).toLocaleString(),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ getValue }) => {
                const s = getValue<string>();
                const color =
                    s === 'sent'
                        ? 'text-green-600'
                        : s === 'failed'
                            ? 'text-red-600'
                            : 'text-yellow-600';
                return <span className={color}>{s}</span>;
            },
        },
        {
            accessorKey: 'projectName',
            header: 'Project',
            cell: ({ getValue }) => getValue() ?? '—',
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <ReminderDialog
                        mode="edit"
                        reminder={row.original}
                        projects={projects.map((p) => ({
                            id: p.id,
                            name: p.name,
                        }))}
                        onSaved={fetchReminders}
                    />
                    <ConfirmDelete
                        title="Delete reminder"
                        description="Delete this reminder? It will no longer be sent."
                        onConfirm={() => deleteReminder(row.original.id)}
                    />
                </div>
            ),
        },
    ];

    const memoryColumns: ColumnDef<Memory>[] = [
        { accessorKey: 'content', header: 'Content' },
        { accessorKey: 'telegramChatId', header: 'Chat ID' },
        {
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ getValue }) =>
                new Date(getValue<string>()).toLocaleString(),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <ConfirmDelete
                        title="Delete memory"
                        description="Delete this memory? It will be permanently removed."
                        onConfirm={() => deleteMemoryById(row.original.id)}
                    />
                </div>
            ),
        },
    ];

    return (
        <main className="mx-auto max-w-5xl p-6">
            <h1 className="mb-6 text-2xl font-semibold">AIDE Dashboard</h1>

            <div className="mb-6 flex items-center gap-1 border-b">
                {(['projects', 'reminders', 'memories'] as const).map((t) => (
                    <Button
                        key={t}
                        variant="ghost"
                        size="sm"
                        className={
                            tab === t
                                ? 'rounded-none border-b-2 border-primary font-medium text-foreground'
                                : 'rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground'
                        }
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading…
                </div>
            )}

            {error && !loading && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                    <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-destructive underline" onClick={fetchAll}>
                        Retry
                    </Button>
                </div>
            )}

            {!loading && !error && tab === 'projects' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <ProjectDialog
                            mode="create"
                            onSaved={() => {
                                fetchProjects();
                                fetchReminders();
                            }}
                        />
                    </div>
                    <DataTable
                        columns={projectColumns}
                        data={projects}
                        searchPlaceholder="Search projects…"
                        emptyLabel="No projects yet. Create one to get started."
                    />
                </div>
            )}

            {!loading && !error && tab === 'reminders' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <ReminderDialog
                            mode="create"
                            projects={projects.map((p) => ({
                                id: p.id,
                                name: p.name,
                            }))}
                            onSaved={fetchReminders}
                        />
                    </div>
                    <DataTable
                        columns={reminderColumns}
                        data={reminders}
                        searchPlaceholder="Search reminders…"
                        emptyLabel="No reminders yet. Create one to stay on track."
                    />
                </div>
            )}

            {!loading && !error && tab === 'memories' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <MemoryDialog onSaved={fetchMemories} />
                    </div>
                    <DataTable
                        columns={memoryColumns}
                        data={memories}
                        searchPlaceholder="Search memories…"
                        emptyLabel="No memories stored yet. Ask the bot to remember something."
                    />
                </div>
            )}
        </main>
    );
}
