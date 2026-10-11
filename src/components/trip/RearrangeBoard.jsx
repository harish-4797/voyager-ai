import React from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { CloudRain, GripVertical, Info, StickyNote } from "lucide-react";
import { PERIODS, isOutdoor, moveActivity } from "@/lib/itinerary";
import { PERIOD_COLORS } from "@/components/trip/DayMap";

const LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

/**
 * Kanban-style board of every day. Drag within a day to reorder its slots; drop onto
 * another day to swap places with the activity there.
 */
export default function RearrangeBoard({ itinerary, weather, onChange }) {
  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const from = { dayIndex: Number(source.droppableId), index: source.index };
    const to = { dayIndex: Number(destination.droppableId), index: destination.index };
    if (from.dayIndex === to.dayIndex && from.index === to.index) return;
    onChange(moveActivity(itinerary, from, to));
  };

  return (
    <div>
      <p className="mb-5 flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
        Drag to reorder a day. Drop onto another day to swap the two activities. Changes save automatically.
      </p>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:px-0">
          {itinerary.days.map((day, dayIndex) => {
            const wx = weather?.[dayIndex];
            return (
              <div key={dayIndex} className="surface w-72 shrink-0 p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-sunset">Day {day.day}</p>
                    <p className="truncate text-sm font-semibold text-ink">{day.theme}</p>
                  </div>
                  {wx?.rainy && (
                    <span title="Rainy day" className="flex shrink-0 items-center gap-1 rounded-full bg-ocean/10 px-2 py-1 text-[10px] font-semibold text-ocean">
                      <CloudRain className="h-3 w-3" /> Rain
                    </span>
                  )}
                </div>
                <Droppable droppableId={String(dayIndex)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[120px] space-y-2 rounded-2xl p-1 transition-colors ${snapshot.isDraggingOver ? "bg-sunset/10" : ""}`}
                    >
                      {PERIODS.map((period, index) => {
                        const activity = day[period];
                        if (!activity) return null;
                        return (
                          <Draggable key={`${dayIndex}-${period}-${activity.activity}`} draggableId={`${dayIndex}-${index}`} index={index}>
                            {(drag, dragSnapshot) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                className={`group flex cursor-grab items-start gap-2 rounded-2xl border bg-white p-3 active:cursor-grabbing ${dragSnapshot.isDragging ? "border-sunset shadow-lift" : "border-ink/[0.07] shadow-soft"}`}
                              >
                                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-ink/25 group-hover:text-sunset" />
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: PERIOD_COLORS[period] }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: PERIOD_COLORS[period] }} />
                                    {LABELS[period]}
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">{activity.activity}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                                    {activity.location && <span className="truncate">{activity.location}</span>}
                                    {activity.note && (
                                      <span className="flex items-center gap-0.5 text-sunset">
                                        <StickyNote className="h-3 w-3" /> note
                                      </span>
                                    )}
                                    {wx?.rainy && isOutdoor(activity) && (
                                      <span className="flex items-center gap-0.5 text-ocean">
                                        <CloudRain className="h-3 w-3" /> outdoor
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
