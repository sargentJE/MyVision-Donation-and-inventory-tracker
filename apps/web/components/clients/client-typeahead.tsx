'use client';

import { useState, useDeferredValue } from 'react';
import { useClientSearch, type ClientSummary } from '@/hooks/use-clients';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Plus, X } from 'lucide-react';
import { CreateClientDialog } from './create-client-dialog';

interface ClientTypeaheadProps {
  onSelect: (client: ClientSummary | null) => void;
  selectedClient?: ClientSummary | null;
}

export function ClientTypeahead({ onSelect, selectedClient }: ClientTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const search = useClientSearch(deferredQuery);
  const results = search.data?.data ?? [];
  const showResults = query.length >= 2 && !selectedClient;

  if (selectedClient) {
    return (
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">{selectedClient.displayName}</p>
          <p className="text-xs text-muted-foreground">{selectedClient.charitylogId}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            onSelect(null);
            setQuery('');
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove client</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Label htmlFor="client-search" className="sr-only">Search clients</Label>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="client-search"
          placeholder="Search by name or CharityLog ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {showResults && (
        <div className="rounded-md border max-h-48 overflow-y-auto">
          {results.map((client) => (
            <button
              key={client.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              onClick={() => {
                onSelect(client);
                setQuery('');
              }}
            >
              <span className="font-medium">{client.displayName}</span>
              <span className="text-xs text-muted-foreground">{client.charitylogId}</span>
            </button>
          ))}

          {results.length === 0 && !search.isLoading && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No clients found</p>
          )}

          <button
            type="button"
            className="flex w-full items-center gap-2 border-t px-3 py-2 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create new client
          </button>
        </div>
      )}

      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(client) => {
          onSelect(client);
          setQuery('');
        }}
      />
    </div>
  );
}
