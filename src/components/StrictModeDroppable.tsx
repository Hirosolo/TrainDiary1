import React, { useEffect, useState } from "react";
import { Droppable, DroppableProps } from "@hello-pangea/dnd";

export const StrictModeDroppable: React.FC<DroppableProps> = (props) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  // Suppress linter error by casting Droppable as any
  const DroppableAny = Droppable as any;
  return <DroppableAny {...props}>{props.children}</DroppableAny>;
}; 