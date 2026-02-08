"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  RefreshCw,
  Download,
  Paperclip,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface EmailItem {
  id: string;
  subject: string;
  from: string;
  date: string;
  hasAttachments: boolean;
  attachmentNames: string[];
  preview: string;
}

interface ImportResult {
  emailId: string;
  success: boolean;
  postId?: string;
  slug?: string;
  error?: string;
}

export default function ImportPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [showPostsLink, setShowPostsLink] = useState(false);

  const checkInbox = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedIds(new Set());

    try {
      const response = await fetch('/api/import/emails');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      setEmails(data.emails || []);
      setHasChecked(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map(e => e.id)));
    }
  };

  const importSelected = async () => {
    if (selectedIds.size === 0) return;

    setImporting(true);
    setResults([]);

    try {
      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: Array.from(selectedIds) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import emails');
      }

      setResults(data.results || []);

      // Remove successfully imported emails from the list
      const successIds = new Set(
        (data.results || [])
          .filter((r: ImportResult) => r.success)
          .map((r: ImportResult) => r.emailId)
      );

      setEmails(prev => prev.filter(e => !successIds.has(e.id)));
      setSelectedIds(new Set());

      const successCount = (data.results || []).filter((r: ImportResult) => r.success).length;
      
      if (successCount > 0) {
        toast({
          title: "Import successful",
          description: `${successCount} post(s) imported. Open them to generate content with AI.`,
        });
        setShowPostsLink(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold tracking-tight">Import from Inbox</h1>
        <p className="text-muted-foreground mt-1">
          Check the blog inbox for new Plaud transcriptions and import them as blog posts.
        </p>
      </div>

      {/* Check Inbox Button */}
      <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <Button
          size="lg"
          className="gap-2"
          onClick={checkInbox}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Mail className="h-5 w-5" />
          )}
          {loading ? 'Checking...' : 'Check Inbox'}
        </Button>

        {hasChecked && !loading && (
          <Button variant="ghost" size="sm" className="gap-2" onClick={checkInbox}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Connection Error</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Import Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(result => (
            <div
              key={result.emailId}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                result.success
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-red-500/30 bg-red-500/10"
              )}
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {result.success
                  ? `Imported successfully${result.slug ? ` → ${result.slug}` : ''}`
                  : `Failed: ${result.error}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Link to posts list after import */}
      {showPostsLink && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-sm">Import complete.</span>
            <Link
              href="/posts?content=ry&published=r"
              className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              View imported posts (draft & incomplete)
            </Link>
          </div>
        </div>
      )}

      {/* Email List */}
      {hasChecked && emails.length === 0 && !loading && (
        <div className="text-center py-12 border border-border/50 rounded-lg bg-card">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No new emails in the inbox</p>
          <p className="text-sm text-muted-foreground mt-1">
            Send Plaud transcriptions to the blog inbox to import them.
          </p>
        </div>
      )}

      {emails.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.size === emails.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {emails.length} email(s) found
              </span>
            </div>

            {selectedIds.size > 0 && (
              <Button
                className="gap-2"
                onClick={importSelected}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Import Selected ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Email Cards */}
          <div className="space-y-2">
            {emails.map((email, index) => (
              <div
                key={email.id}
                className={cn(
                  "flex items-start gap-4 rounded-lg border border-border/50 bg-card p-4 transition-all hover:border-primary/30 cursor-pointer animate-slide-up",
                  selectedIds.has(email.id) && "ring-2 ring-primary border-primary/50"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => toggleSelect(email.id)}
              >
                <Checkbox
                  checked={selectedIds.has(email.id)}
                  onCheckedChange={() => toggleSelect(email.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium truncate">{email.subject}</h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(email.date).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">From: {email.from}</p>

                  {email.hasAttachments && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      {email.attachmentNames.map((name, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
