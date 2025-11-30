'use client';

import { useState } from 'react';
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { email?: string; displayName?: string; username?: string }) => Promise<void>;
  walletAddress: string;
  initialEmail?: string;
  initialDisplayName?: string;
  initialUsername?: string;
}

export function UserInfoDialog({ 
  open, 
  onClose, 
  onSubmit, 
  walletAddress,
  initialEmail,
  initialDisplayName,
  initialUsername
}: UserInfoDialogProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [username, setUsername] = useState(initialUsername || '');
  const [loading, setLoading] = useState(false);

  // Update state when initial values change
  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialDisplayName) setDisplayName(initialDisplayName);
    if (initialUsername) setUsername(initialUsername);
  }, [initialEmail, initialDisplayName, initialUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        email: email || undefined,
        displayName: displayName || undefined,
        username: username || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error submitting user info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide some information to complete your account setup
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet">Wallet Address</Label>
            <Input
              id="wallet"
              value={walletAddress}
              disabled
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username (Optional)</Label>
            <Input
              id="username"
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Skip
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

