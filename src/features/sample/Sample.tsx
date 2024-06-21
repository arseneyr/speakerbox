import { clsx } from "clsx/lite";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

const ProgressBar = (props: { duration: number; children?: ReactNode }) => {
  const leaveDurationMs = 300;
  let transitionDuration;

  const [stage, setStage] = useState<"from" | "enter" | "leave">("from");
  const divRef = useRef<HTMLDivElement>(null);
  if (stage === "enter") {
    transitionDuration = `${props.duration}ms`;
  } else if (stage === "leave") {
    transitionDuration = `${leaveDurationMs}ms`;
  }

  useLayoutEffect(() => {
    // force reflow to animate between "from" and "enter"
    void divRef.current?.offsetHeight;
    setStage("enter");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setStage("leave"), props.duration);
    return () => clearTimeout(timer);
  }, [props.duration]);

  return (
    <div
      ref={divRef}
      className={clsx(
        `absolute left-0 top-0 z-10 h-full overflow-hidden bg-primary
        text-primary-content ease-linear`,
        stage === "from" ? "w-0" : "w-full",
        stage === "leave" ? "opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration }}
    >
      <div className="p-2">{props.children}</div>
    </div>
  );
};

interface SampleProps {
  title: string;
  onClick?: () => unknown;
  loading?: boolean;
  progressFinishTime?: number;
}

export const Sample = (props: SampleProps) => {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!props.progressFinishTime) {
      return;
    }

    const duration = props.progressFinishTime - Date.now();
    if (duration > 0) {
      setDuration(duration);
    }
  }, [props.progressFinishTime]);

  return (
    <button
      className={clsx(
        `relative isolate select-none overflow-hidden rounded border-l-4 border-primary
        bg-neutral p-2 text-left font-sans text-4xl font-medium shadow-sm transition
        duration-200`,
        props.loading
          ? "skeleton text-neutral-content/40"
          : "hover:text-accent hover:shadow-lg active:scale-[0.98] active:shadow-sm",
      )}
      disabled={props.loading}
      onClick={props.onClick}
    >
      {props.title}
      {duration && (
        <ProgressBar key={props.progressFinishTime ?? 0} duration={duration}>
          {props.title}
        </ProgressBar>
      )}
    </button>
  );
};
