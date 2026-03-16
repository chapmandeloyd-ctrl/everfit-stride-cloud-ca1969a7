import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all rows from a table by paginating through 1000-row chunks.
 */
export async function fetchAllRows<T = any>(
  table: string,
  query?: { column?: string; value?: any; select?: string; order?: string }
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let q = supabase
      .from(table)
      .select(query?.select || "*")
      .range(from, from + PAGE_SIZE - 1);

    if (query?.column && query?.value !== undefined) {
      q = q.eq(query.column, query.value);
    }
    if (query?.order) {
      q = q.order(query.order);
    }

    const { data, error } = await q;
    if (error) throw error;

    allData = allData.concat((data as T[]) || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}
