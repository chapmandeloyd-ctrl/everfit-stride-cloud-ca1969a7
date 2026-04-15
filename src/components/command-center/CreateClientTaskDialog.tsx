import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FileText, Camera, Activity, ClipboardList, Target, ArrowLeft, Calendar, PlusCircle, ChevronDown, Settings, Repeat } from "lucide-react";
import { TaskAttachmentUpload, TaskAttachment } from "./TaskAttachmentUpload";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CreateClientTaskDialogProps {
  clientId: string;
  initialDate?: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseFromLibrary: () => void;
  onCreateHabit?: () => void;
}

const taskTypes = [
  { value: "general", label: "General", icon: FileText, color: "text-amber-600", bg: "bg-amber-100", emoji: "📋" },
  { value: "progress_photo", label: "Progress Photo", icon: Camera, color: "text-blue-600", bg: "bg-blue-100", emoji: "📸" },
  { value: "body_metrics", label: "Body Metrics", icon: Activity, color: "text-purple-600", bg: "bg-purple-100", emoji: "📊" },
  { value: "form", label: "Form", icon: ClipboardList, color: "text-green-600", bg: "bg-green-100", emoji: "📝" },
  { value: "habit", label: "Habit", icon: Target, color: "text-orange-600", bg: "bg-orange-100", emoji: "🔄" },
];

export function CreateClientTaskDialog({
  clientId,
  initialDate,
  open,
  onOpenChange,
  onChooseFromLibrary,
  onCreateHabit,
}: CreateClientTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"type" | "form">("type");
  const [selectedType, setSelectedType] = useState<string>("");
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDate);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [attachment, setAttachment] = useState<TaskAttachment | null>(null);

  useEffect(() => {
    if (open && initialDate) {
      setDueDate(initialDate);
    }
  }, [open, initialDate]);

  const resetForm = () => {
    setStep("type");
    setSelectedType("");
    setTaskName("");
    setDescription("");
    setDueDate(initialDate);
    setReminderEnabled(false);
    setNoteOpen(false);
    setAdvancedOpen(false);
    setAttachment(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSelectType = (type: string) => {
    if (type === "habit" && onCreateHabit) {
      handleOpenChange(false);
      onCreateHabit();
      return;
    }
    setSelectedType(type);
    setStep("form");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_tasks").insert([{
        client_id: clientId,
        trainer_id: user?.id,
        name: taskName,
        task_type: selectedType as any,
        description: description || null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        reminder_enabled: reminderEnabled,
        attachments: attachment ? JSON.parse(JSON.stringify([attachment])) : null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks"] });
      toast({ title: "Task assigned", description: "Task has been added to the client's schedule." });
      handleOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const selectedTypeInfo = taskTypes.find(t => t.value === selectedType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {step === "type" ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Create a task</DialogTitle>
                <Button
                  variant="link"
                  className="text-primary p-0 h-auto"
                  onClick={() => {
                    handleOpenChange(false);
                    onChooseFromLibrary();
                  }}
                >
                  Choose from Library
                </Button>
              </div>
              <DialogDescription>Select the type of task to create</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-4 pt-2">
              {taskTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleSelectType(type.value)}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:shadow-md transition-all cursor-pointer bg-background"
                  >
                    <div className={`p-3 rounded-xl ${type.bg}`}>
                      <Icon className={`h-8 w-8 ${type.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Header with Back + Type label */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep("type")} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Back</span>
            </div>

            <div className="flex items-center gap-2 -mt-2">
              {selectedTypeInfo && <span className="text-xl">{selectedTypeInfo.emoji}</span>}
              <h2 className="text-xl font-semibold">{selectedTypeInfo?.label}</h2>
            </div>

            <div className="space-y-5">
              {/* Task Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Task Name</Label>
                  <span className="text-xs text-muted-foreground">{taskName.length} / 90</span>
                </div>
                <Input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value.slice(0, 90))}
                  placeholder="Enter task name..."
                />
              </div>

              {/* Attachment Section */}
              <TaskAttachmentUpload
                attachment={attachment}
                onAttachmentChange={setAttachment}
              />

              {/* Add Note (collapsible) */}
              <Collapsible open={noteOpen} onOpenChange={setNoteOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                    <PlusCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Add note</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add instructions or details..."
                    rows={3}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Set Date + Reminder */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Set Date</Label>
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "MMM d, yyyy (EEE)") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="flex items-center gap-2">
                    <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                    <Label className="text-sm">Set Reminder</Label>
                  </div>
                </div>
              </div>

              {/* Repeat */}
              <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Repeat className="h-4 w-4" />
                <span className="text-sm font-medium">Repeat</span>
              </button>

              <div className="border-t" />

              {/* Advanced Settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Settings className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Advanced Settings</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">Advanced options coming soon.</p>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => createMutation.mutate()} disabled={!taskName.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!taskName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save & Close"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
