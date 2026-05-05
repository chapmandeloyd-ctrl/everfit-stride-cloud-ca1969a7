import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Trash2, RefreshCw, Database } from "lucide-react";

interface TableInfo { table_name: string; row_estimate: number }

const PAGE_SIZE = 50;

export default function AdminDataConsole() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ idCol: string; id: any } | null>(null);

  async function call(action: string, payload: Record<string, unknown> = {}) {
    const { data, error } = await supabase.functions.invoke("admin-data-console", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }

  async function loadTables() {
    setLoadingTables(true);
    try {
      const data = await call("list_tables");
      setTables(data.tables ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingTables(false);
    }
  }

  async function loadRows(table: string, pageIdx = 0) {
    setLoadingRows(true);
    try {
      const data = await call("list_rows", {
        table, limit: PAGE_SIZE, offset: pageIdx * PAGE_SIZE,
      });
      setRows(data.rows ?? []);
      setCount(data.count ?? null);
      setPage(pageIdx);
    } catch (e: any) {
      toast.error(e.message);
      setRows([]); setCount(null);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => { loadTables(); }, []);

  const filteredTables = useMemo(
    () => tables.filter(t => t.table_name.toLowerCase().includes(filter.toLowerCase())),
    [tables, filter]
  );

  const columns = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const idColumn = useMemo(() => {
    if (!columns.length) return null;
    if (columns.includes("id")) return "id";
    // fallback: any *_id-looking pk-ish first column
    return columns[0];
  }, [columns]);

  async function handleDelete() {
    if (!selected || !pendingDelete) return;
    try {
      await call("delete_row", {
        table: selected,
        id_column: pendingDelete.idCol,
        id: pendingDelete.id,
      });
      toast.success("Row deleted");
      setPendingDelete(null);
      loadRows(selected, page);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function renderCell(v: any) {
    if (v === null || v === undefined) return <span className="text-muted-foreground italic">null</span>;
    if (typeof v === "object") return <span className="font-mono text-xs">{JSON.stringify(v).slice(0, 80)}</span>;
    const s = String(v);
    return <span className="truncate inline-block max-w-[240px] align-middle">{s.length > 100 ? s.slice(0, 100) + "…" : s}</span>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Data Console</h1>
            <p className="text-sm text-muted-foreground">Browse tables and delete rows. Use with care.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadTables} disabled={loadingTables}>
          <RefreshCw className={`h-4 w-4 ${loadingTables ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Tables list */}
        <aside className="col-span-12 md:col-span-3 border rounded-lg p-3 max-h-[75vh] overflow-y-auto">
          <Input
            placeholder="Filter tables…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-3"
          />
          {loadingTables && <Loader2 className="h-4 w-4 animate-spin" />}
          <ul className="space-y-1">
            {filteredTables.map(t => (
              <li key={t.table_name}>
                <button
                  onClick={() => { setSelected(t.table_name); loadRows(t.table_name, 0); }}
                  className={`w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent ${
                    selected === t.table_name ? "bg-accent font-medium" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.table_name}</span>
                    <span className="text-xs text-muted-foreground">~{Math.max(0, t.row_estimate)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Rows */}
        <section className="col-span-12 md:col-span-9 border rounded-lg p-3 min-h-[60vh]">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground py-20">
              Select a table to view rows.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold">{selected}</h2>
                  <p className="text-xs text-muted-foreground">
                    {count !== null ? `${count} rows total` : "—"} · Page {page + 1}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0 || loadingRows}
                    onClick={() => loadRows(selected, page - 1)}>Prev</Button>
                  <Button size="sm" variant="outline"
                    disabled={loadingRows || (count !== null && (page + 1) * PAGE_SIZE >= count)}
                    onClick={() => loadRows(selected, page + 1)}>Next</Button>
                </div>
              </div>

              {loadingRows ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No rows.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        {columns.map(c => <TableHead key={c}>{c}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              disabled={!idColumn}
                              onClick={() => idColumn && setPendingDelete({ idCol: idColumn, id: r[idColumn] })}
                              title="Delete row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          {columns.map(c => (
                            <TableCell key={c} className="whitespace-nowrap">{renderCell(r[c])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete row from <span className="font-mono">{selected}</span> where{" "}
              <span className="font-mono">{pendingDelete?.idCol} = {String(pendingDelete?.id)}</span>.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}