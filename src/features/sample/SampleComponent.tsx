interface SampleProps {
  id: string;
}

export const SampleComponent = (_props: SampleProps) => (
  <button
    className="min-w-80 max-w-xl select-none rounded bg-neutral p-2 text-left font-sans
      text-4xl font-medium shadow-sm transition duration-200 hover:text-accent
      hover:shadow-lg active:scale-[0.98] active:shadow-sm"
  >
    YOoooo
  </button>
);
