'use client';

import { useCallback, useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { ProjectDialog } from '@/components/project-dialog';
import { ReminderDialog } from '@/components/reminder-dialog';
import { MemoryDialog } from '@/components/memory-dialog';
import { Trash2 } from 'lucide-react';

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

    const fetchProjects = useCallback(async () => {
        const res = await fetch('/api/projects');
        if (res.ok) setProjects(await res.json());
    }, []);

    const fetchReminders = useCallback(async () => {
        const res = await fetch('/api/reminders');
        if (res.ok) setReminders(await res.json());
    }, []);

    const fetchMemories = useCallback(async () => {
        const res = await fetch('/api/memories');
        if (res.ok) setMemories(await res.json());
    }, []);

    useEffect(() => {
        fetchProjects();
        fetchReminders();
        fetchMemories();
    }, [fetchProjects, fetchReminders, fetchMemories]);

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
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Delete project"
                        onClick={() => deleteProject(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Delete reminder"
                        onClick={() => deleteReminder(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Delete memory"
                        onClick={() => deleteMemoryById(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <main className="mx-auto max-w-5xl p-6">
            <h1 className="mb-6 text-2xl font-semibold">
                ADHD Accountability Bot — Admin
            </h1>

            <div className="mb-4 flex items-center gap-2 border-b pb-2">
                <Button
                    variant={tab === 'projects' ? 'default' : 'ghost'}
                    onClick={() => setTab('projects')}
                >
                    Projects
                </Button>
                <Button
                    variant={tab === 'reminders' ? 'default' : 'ghost'}
                    onClick={() => setTab('reminders')}
                >
                    Reminders
                </Button>
                <Button
                    variant={tab === 'memories' ? 'default' : 'ghost'}
                    onClick={() => setTab('memories')}
                >
                    Memories
                </Button>
            </div>

            {tab === 'projects' && (
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
                    />
                </div>
            )}

            {tab === 'reminders' && (
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
                    />
                </div>
            )}

            {tab === 'memories' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <MemoryDialog onSaved={fetchMemories} />
                    </div>
                    <DataTable
                        columns={memoryColumns}
                        data={memories}
                        searchPlaceholder="Search memories…"
                    />
                </div>
            )}
        </main>
    );
}
