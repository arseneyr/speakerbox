import React, { ReactElement } from "react";

interface SampleGridProps {
  children: ReactElement[];
}

const SampleGrid: React.FunctionComponent<SampleGridProps> = (props) => {
  return <div className="grid grid-cols-8">{props.children}</div>;
};

export default SampleGrid;
