"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BuffWorkflow } from "@/components/buff_workflow";
import { SectionPanel } from "@/components/section_panel";
import { logPageMount } from "@/utils/ui_perf";

export default function BuffPage() {
  useEffect(() => {
    logPageMount("Buff");
  }, []);

  return (
    <div className="page_stack page_buff">
      <div className="buff_page_label page_label_lifted">
        <span className="eyebrow">My Buffs</span>
      </div>

      <SectionPanel
        copy="Buff gameplay is now started from Home. This page remains available for legacy access."
        title="Legacy Buff access"
      >
        <p className="secondary_text">
          Use Home to start new Buff sessions. Claim follow-up, pending results, and ready-to-settle matches now live in{" "}
          <Link href="/profile" className="inline_link">
            Profile - Claims
          </Link>
          .
        </p>
      </SectionPanel>

      <BuffWorkflow sourceContext="buff" />
    </div>
  );
}
