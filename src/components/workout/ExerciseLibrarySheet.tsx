import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { fetchAllExercises } from "@/lib/fetchAllRows";
import { Search, SlidersHorizontal, Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Exercise {
  id: string;
  name: string;
  image_url: string | null;
  video_url: string | null;
  category: string | null;
  muscle_group: string | null;
}

interface ExerciseLibrarySheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (exercises: Exercise[]) => void;
  title?: string;
}

export function ExerciseLibrarySheet({ open, onClose, onAdd, title }: ExerciseLibrarySheetProps) {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Get trainer_id from client_feature_settings
  const { data: trainerId } = useQuery({
    queryKey: ["my-trainer-id", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("trainer_id")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data?.trainer_id || null;
    },
    enabled: !!clientId,
  });

  // Fetch ALL exercises from trainer's library (paginated past 1000-row default)
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["trainer-exercises-all", trainerId],
    queryFn: async () => {
      const all = await fetchAllExercises(trainerId!);
      return all as Exercise[];
    },
    enabled: !!trainerId,
  });

  // Realtime subscription: instantly sync exercise changes from admin
  useEffect(() => {
    if (!trainerId) return;
    const channel = supabase
      .channel('exercises-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercises', filter: `trainer_id=eq.${trainerId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["trainer-exercises-all", trainerId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trainerId, queryClient]);

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const selectedExercises = exercises.filter((ex) => selected.has(ex.id));
    onAdd(selectedExercises);
    setSelected(new Set());
    setSearch("");
    onClose();
  };

  const getThumb = (ex: Exercise) => {
    if (ex.image_url) return ex.image_url;
    if (ex.video_url) {
      const ytMatch = ex.video_url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    }
    return null;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={() => { onClose(); setSelected(new Set()); setSearch(""); }}
          className="text-sm font-medium text-muted-foreground"
        >
          Cancel
        </button>
        <span className="text-sm font-semibold">{title || "Add Exercises"}</span>
        <button
          onClick={handleAdd}
          disabled={selected.size === 0}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground disabled:opacity-40 transition-opacity"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for exercise..."
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Exercise list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Loading exercises...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No exercises found
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((ex) => {
              const thumb = getThumb(ex);
              const isSelected = selected.has(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => toggleSelect(ex.id)}
                  className="grid w-full grid-cols-[3.5rem,minmax(0,1fr),1.5rem] items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors"
                >
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {thumb ? (
                      <img src={thumb} alt={ex.name} className="w-full h-full object-cover" />
                    ) : (
                      <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="min-w-0 overflow-hidden">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {ex.name}
                    </span>
                  </div>

                  <div
                    className={`h-5 w-5 justify-self-end rounded border-[1.5px] flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-destructive border-destructive"
                        : "border-destructive bg-transparent"
                    }`}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-destructive-foreground" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
