"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Modal-intercepting deaktiveret for projekter.
 *
 * Tidligere åbnede klik på et projekt en peek-modal med "Åbn fuld side"-link.
 * Modalen var langsom og "Åbn fuld side" var upålidelig (intercept + parallel-route
 * havde edge-cases). Vi sender brugeren direkte til fuld-side via window.location
 * — det er en hard-navigation der omgår Next.js' intercept-cache helt.
 */
export default function ProjectModalRedirect() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  useEffect(() => {
    if (!id) return;
    // Hard navigation — Next.js' router.push vil holde os i intercept-slottet.
    // window.location forcerer en frisk page load der lander på det rigtige projekt.
    window.location.replace(`/projects/${id}`);
  }, [id]);

  return null;
}
