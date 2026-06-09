'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
    title: string;
    description: string;
    onConfirm: () => void;
}

export function ConfirmDelete({ title, description, onConfirm }: ConfirmDialogProps) {
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                variant="ghost"
                size="icon"
                type="button"
                title="Delete"
                onClick={() => setOpen(true)}
            >
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleting}
                        onClick={async () => {
                            setDeleting(true);
                            await onConfirm();
                            setOpen(false);
                            setDeleting(false);
                        }}
                    >
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
