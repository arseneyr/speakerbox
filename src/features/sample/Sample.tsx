import { clsx } from "clsx/lite";
import { ReactNode, useEffect, useRef, useState } from "react";

const ProgressBar = (props: { endTime: number; children?: ReactNode }) => {
  const leaveDurationMs = 300;
  let transitionDuration;

  const [stage, setStage] = useState<"from" | "enter" | "leave">("from");
  const [duration, setDuration] = useState<number | null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  if (stage === "enter") {
    transitionDuration = `${duration}ms`;
  } else if (stage === "leave") {
    transitionDuration = `${leaveDurationMs}ms`;
  }

  useEffect(() => {
    // force reflow to animate between "from" and "enter"
    void divRef.current?.offsetHeight;
    setDuration(props.endTime - Date.now());
    setStage("enter");
  }, [props.endTime]);

  useEffect(() => {
    const timer = setTimeout(
      () => setStage("leave"),
      props.endTime - Date.now(),
    );
    return () => clearTimeout(timer);
  }, [props.endTime]);

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
      {props.children}
    </div>
  );
};

interface SampleProps {
  title: string;
  onClick?: () => unknown;
  errored?: boolean;
  loading?: boolean;
  progressFinishTime?: number;
}

export const Sample = (props: SampleProps) => {
  return (
    <div className="indicator w-full">
      {props.errored && (
        <span className="badge indicator-item badge-error indicator-center indicator-middle">
          Not found :(
        </span>
      )}
      <button
        className={clsx(
          `relative isolate w-full select-none overflow-hidden rounded border-l-4
          bg-neutral p-2 text-left font-sans text-4xl font-medium shadow-sm transition
          duration-200`,
          props.loading || props.errored
            ? "border-neutral-content/40 text-neutral-content/40"
            : `border-primary hover:text-accent hover:shadow-lg active:scale-[0.98]
              active:shadow-sm`,
          props.loading && "skeleton",
        )}
        disabled={props.loading || props.errored}
        onClick={props.onClick}
      >
        {props.title}
        {props.progressFinishTime && (
          <ProgressBar
            key={props.progressFinishTime ?? 0}
            endTime={props.progressFinishTime}
          >
            <div className="p-2">{props.title}</div>
          </ProgressBar>
        )}
      </button>
    </div>
  );
};
