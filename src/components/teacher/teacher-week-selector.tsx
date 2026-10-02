"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type WeekOption = {
  id: string;
  label: string;
};

type TeacherWeekSelectorProps = {
  weeks: WeekOption[];
  selectedWeekId: string;
  previousWeekId: string | null;
  currentWeekId: string | null;
  nextWeekId: string | null;
  labels: {
    selectWeek: string;
    previousWeek: string;
    currentWeek: string;
    nextWeek: string;
  };
};

export function TeacherWeekSelector({
  weeks,
  selectedWeekId,
  previousWeekId,
  currentWeekId,
  nextWeekId,
  labels,
}: TeacherWeekSelectorProps) {
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState(selectedWeekId);

  function goToWeek(weekId: string | null) {
    if (!weekId) return;
    setSelectedValue(weekId);
    router.push(`/teacher?week=${encodeURIComponent(weekId)}`, {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <label className="space-y-1 text-sm font-medium">
        <span>{labels.selectWeek}</span>
        <select
          value={selectedValue}
          onChange={(event) => goToWeek(event.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          aria-label={labels.selectWeek}
        >
          {weeks.map((week) => (
            <option key={week.id} value={week.id}>
              {week.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!previousWeekId}
          onClick={() => goToWeek(previousWeekId)}
        >
          {labels.previousWeek}
        </Button>
        <Button
          type="button"
          variant={
            currentWeekId && currentWeekId === selectedValue
              ? "default"
              : "outline"
          }
          size="sm"
          disabled={!currentWeekId}
          onClick={() => goToWeek(currentWeekId)}
        >
          {labels.currentWeek}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!nextWeekId}
          onClick={() => goToWeek(nextWeekId)}
        >
          {labels.nextWeek}
        </Button>
      </div>
    </div>
  );
}
