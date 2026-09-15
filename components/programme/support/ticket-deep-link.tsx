"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Opens `?ticket=TK-2052` links (from FAQs & trends). Render inside its own Suspense boundary. */
export function TicketDeepLink({ onOpen }: { onOpen: (id: string) => void }) {
  const id = useSearchParams().get("ticket");
  useEffect(() => {
    if (id) onOpen(id);
  }, [id, onOpen]);
  return null;
}
