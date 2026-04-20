import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Smile, Clock, UtensilsCrossed, Dumbbell, Trophy, Swords, LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CardCustomizer, CardCustomizerValues } from "./CardCustomizer";

interface Props {
  clientId: string;
  trainerId: string;
}

/* -----------------------------------------------------------
 * Helpers — mutations against client_feature_settings
 * --------------------------------------------------------- */
function useFeatureSettings(clientId: string) {
  return useQuery({
    queryKey: ["dash-cards-feature-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      return data as any;
    },
  });
}

function useFeatureUpdate(clientId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update(patch as any)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dash-cards-feature-settings", clientId] });
      qc.invalidateQueries({ queryKey: ["my-feature-settings"] });
      qc.invalidateQueries({ queryKey: ["client-feature-settings"] });
      toast({ title: "Saved" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });
}

/* -----------------------------------------------------------
 * Sections that read from client_feature_settings
 * --------------------------------------------------------- */
function GreetingSection({ clientId }: { clientId: string }) {
  const { data: settings } = useFeatureSettings(clientId);
  const update = useFeatureUpdate(clientId);

  return (
    <CardCustomizer
      fields={["title", "message"]}
      titlePlaceholder="Hello, [Name]"
      messagePlaceholder="Let's do this"
      values={{
        title: settings?.greeting_title,
        message: settings?.greeting_subtitle,
      }}
      saving={update.isPending}
      storagePathPrefix={`${clientId}/greeting`}
      onSave={(v) =>
        update.mutateAsync({
          ...(v.title !== undefined && { greeting_title: v.title }),
          ...(v.message !== undefined && { greeting_subtitle: v.message }),
        })
      }
    />
  );
}

function HeroSection({ clientId }: { clientId: string }) {
  const { data: settings } = useFeatureSettings(clientId);
  const update = useFeatureUpdate(clientId);

  return (
    <CardCustomizer
      fields={["title", "message", "image", "textColor"]}
      titlePlaceholder="Today's focus"
      messagePlaceholder="You've got this! Stay consistent 💪"
      values={{
        title: settings?.dashboard_hero_title,
        message: settings?.dashboard_hero_message,
        imageUrl: settings?.dashboard_hero_image_url,
        textColor: settings?.dashboard_hero_text_color,
      }}
      saving={update.isPending}
      storagePathPrefix={`${clientId}/hero`}
      onSave={(v) =>
        update.mutateAsync({
          ...(v.title !== undefined && { dashboard_hero_title: v.title }),
          ...(v.message !== undefined && { dashboard_hero_message: v.message }),
          ...(v.imageUrl !== undefined && { dashboard_hero_image_url: v.imageUrl }),
          ...(v.textColor !== undefined && { dashboard_hero_text_color: v.textColor }),
        })
      }
    />
  );
}

function FastingSection({ clientId }: { clientId: string }) {
  const { data: settings } = useFeatureSettings(clientId);
  const update = useFeatureUpdate(clientId);

  return (
    <CardCustomizer
      fields={["title", "message", "image", "textColor"]}
      titlePlaceholder="FASTING"
      messagePlaceholder="Fasting is the foundation of your KSOM-360 plan."
      values={{
        title: settings?.fasting_card_title,
        message: settings?.fasting_card_subtitle,
        imageUrl: settings?.fasting_card_image_url,
        textColor: settings?.fasting_card_text_color,
      }}
      saving={update.isPending}
      storagePathPrefix={`${clientId}/fasting-card`}
      onSave={(v) =>
        update.mutateAsync({
          ...(v.title !== undefined && { fasting_card_title: v.title }),
          ...(v.message !== undefined && { fasting_card_subtitle: v.message }),
          ...(v.imageUrl !== undefined && { fasting_card_image_url: v.imageUrl }),
          ...(v.textColor !== undefined && { fasting_card_text_color: v.textColor }),
        })
      }
    />
  );
}

function EatingWindowSection({ clientId }: { clientId: string }) {
  const { data: settings } = useFeatureSettings(clientId);
  const update = useFeatureUpdate(clientId);

  return (
    <CardCustomizer
      fields={["title", "message", "image", "textColor"]}
      titlePlaceholder="EATING WINDOW"
      messagePlaceholder="Time to fuel up — choose a meal."
      values={{
        title: settings?.eating_window_card_title,
        message: settings?.eating_window_card_message,
        imageUrl: settings?.eating_window_card_image_url,
        textColor: settings?.eating_window_card_text_color,
      }}
      saving={update.isPending}
      storagePathPrefix={`${clientId}/eating-window`}
      onSave={(v) =>
        update.mutateAsync({
          ...(v.title !== undefined && { eating_window_card_title: v.title }),
          ...(v.message !== undefined && { eating_window_card_message: v.message }),
          ...(v.imageUrl !== undefined && { eating_window_card_image_url: v.imageUrl }),
          ...(v.textColor !== undefined && { eating_window_card_text_color: v.textColor }),
        })
      }
    />
  );
}

/* -----------------------------------------------------------
 * Rest Day & Sport Day — backed by their own tables
 * --------------------------------------------------------- */
function useDayCard(opts: {
  clientId: string;
  trainerId: string;
  table: "client_rest_day_cards" | "client_sport_day_cards";
  cardType?: "practice" | "game";
  queryKey: string;
}) {
  const { clientId, trainerId, table, cardType, queryKey } = opts;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: [queryKey, clientId, cardType ?? null],
    queryFn: async () => {
      let q: any = (supabase as any).from(table).select("*").eq("client_id", clientId);
      if (cardType) q = q.eq("card_type", cardType);
      const { data } = await q.maybeSingle();
      return data as any;
    },
  });

  const save = useMutation({
    mutationFn: async (v: CardCustomizerValues) => {
      const payload: any = {
        client_id: clientId,
        trainer_id: trainerId,
        ...(cardType && { card_type: cardType }),
        ...(v.title !== undefined && { title: v.title }),
        ...(v.message !== undefined && { message: v.message }),
        ...(v.imageUrl !== undefined && { image_url: v.imageUrl }),
        ...(v.textColor !== undefined && { text_color: v.textColor }),
        ...(v.overlayOpacity !== undefined && { overlay_opacity: v.overlayOpacity }),
      };
      if (data?.id) {
        const { error } = await (supabase as any).from(table).update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey, clientId, cardType ?? null] });
      qc.invalidateQueries({ queryKey: ["rest-day-card"] });
      qc.invalidateQueries({ queryKey: ["sport-day-card"] });
      toast({ title: "Saved" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  return { data, save };
}

function RestDaySection({ clientId, trainerId }: Props) {
  const { data, save } = useDayCard({
    clientId,
    trainerId,
    table: "client_rest_day_cards",
    queryKey: "dash-cards-rest-day",
  });
  return (
    <CardCustomizer
      fields={["title", "message", "image", "textColor", "overlayOpacity"]}
      titlePlaceholder="REST DAY"
      messagePlaceholder="No workouts scheduled for today. Enjoy your rest!"
      values={{
        title: data?.title,
        message: data?.message,
        imageUrl: data?.image_url,
        textColor: data?.text_color,
        overlayOpacity: data?.overlay_opacity,
      }}
      saving={save.isPending}
      storagePathPrefix={`${clientId}/rest`}
      onSave={(v) => save.mutateAsync(v)}
    />
  );
}

function SportDaySection({
  clientId,
  trainerId,
  cardType,
  defaultTitle,
  defaultMessage,
}: Props & { cardType: "practice" | "game"; defaultTitle: string; defaultMessage: string }) {
  const { data, save } = useDayCard({
    clientId,
    trainerId,
    table: "client_sport_day_cards",
    cardType,
    queryKey: "dash-cards-sport-day",
  });
  return (
    <CardCustomizer
      fields={["title", "message", "image", "textColor", "overlayOpacity"]}
      titlePlaceholder={defaultTitle}
      messagePlaceholder={defaultMessage}
      values={{
        title: data?.title,
        message: data?.message,
        imageUrl: data?.image_url,
        textColor: data?.text_color,
        overlayOpacity: data?.overlay_opacity,
      }}
      saving={save.isPending}
      storagePathPrefix={`${clientId}/${cardType}`}
      onSave={(v) => save.mutateAsync(v)}
    />
  );
}

/* -----------------------------------------------------------
 * Top-level
 * --------------------------------------------------------- */
export function DashboardCardsEditor({ clientId, trainerId }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" />
          Dashboard Cards
        </CardTitle>
        <CardDescription>
          Customize every card on this client's Today screen. Every field is optional — leave it blank to use the default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="greeting">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <Smile className="h-4 w-4 text-primary" /> Greeting
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <GreetingSection clientId={clientId} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="hero">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> Hero / Welcome Banner
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <HeroSection clientId={clientId} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fasting">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" /> Fasting Card
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <FastingSection clientId={clientId} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="eating">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <UtensilsCrossed className="h-4 w-4 text-primary" /> Eating Window Card
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <EatingWindowSection clientId={clientId} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="rest">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <Dumbbell className="h-4 w-4 text-primary" /> Rest Day Card
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <RestDaySection clientId={clientId} trainerId={trainerId} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="practice">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" /> Practice Day Card
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <SportDaySection
                clientId={clientId}
                trainerId={trainerId}
                cardType="practice"
                defaultTitle="PRACTICE DAY"
                defaultMessage="Practice scheduled today!"
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="game">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <Swords className="h-4 w-4 text-primary" /> Game Day Card
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <SportDaySection
                clientId={clientId}
                trainerId={trainerId}
                cardType="game"
                defaultTitle="GAME DAY"
                defaultMessage="Game scheduled today!"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}