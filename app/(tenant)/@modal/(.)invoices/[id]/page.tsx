"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

/**
 * Modal-intercepting deaktiveret.
 *
 * Klik på et item navigerer direkte til fuld-side i stedet for at åbne en peek-modal.
 * Modalerne var langsomme og deres "Åbn fuld side"-knap upålideligt; konsistent
 * full-page navigation giver bedre UX.
 */
export default function ModalRedirect() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  useEffect(() => {
    if (!id) return;
    window.location.replace(`/invoices/${id}`);
  }, [id]);

  return null;
}
