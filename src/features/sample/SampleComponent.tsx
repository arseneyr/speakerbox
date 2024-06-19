import { clsx } from "clsx/lite";

interface SampleComponentProps {
  title: string;
  onClick?: () => unknown;
  loading?: boolean;
}

const SampleCollapse = () => {
  return;
};

export const SampleComponent = (props: SampleComponentProps) => (
  <div>
    <button
      className={clsx(
        `select-none rounded bg-neutral p-2 pl-4 text-left font-sans text-4xl font-medium
        shadow-sm transition duration-200`,
        props.loading
          ? "skeleton text-neutral-content/40"
          : "hover:text-accent hover:shadow-lg active:scale-[0.98] active:shadow-sm",
      )}
      disabled={props.loading}
      onClick={props.onClick}
    >
      {props.title}
    </button>
    <div
      className="[&:not(:focus)]:collapse-close collapse collapse-arrow"
      tabIndex={0}
    >
      <input type="checkbox" />
      <div className="collapse-title h-fit p-1"></div>
      <div className="collapse-content">Edit</div>
    </div>
  </div>
);
