import React, { ReactNode } from "react";

interface SampleGridProps {
  // samples: ComponentProps<typeof Sample>[];
  children?: ReactNode[];
}

const SampleGrid: React.FunctionComponent<SampleGridProps> = (props) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2 xl:grid-cols-5">
      {props.children}
    </div>
  );
};

export default SampleGrid;
