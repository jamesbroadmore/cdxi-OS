import React from "react";
import { Construction } from "lucide-react";
import { Card } from "../components/ui/Primitives";

export default function ComingSoon({ title, codename, description }) {
  return (
    <div className="p-6 lg:p-8" data-testid={`coming-soon-${title.toLowerCase()}`}>
      <div className="cdxi-label">{codename}</div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>
      <Card className="mt-8 p-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="w-14 h-14 mx-auto rounded-xl bg-muted grid place-items-center mb-4"><Construction className="w-5 h-5 text-amber-500" /></div>
          <h3 className="font-display text-xl font-semibold">In the pipeline</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            This module is on the cdxi OS roadmap. Ask Atlas about early access or priorities to ship first.
          </p>
        </div>
      </Card>
    </div>
  );
}
