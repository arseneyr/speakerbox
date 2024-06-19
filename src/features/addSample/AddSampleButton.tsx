import React, { MouseEventHandler } from "react";

interface AddSampleButtonProps {
  onClick: MouseEventHandler;
}

const AddSampleButton: React.FunctionComponent<AddSampleButtonProps> = (
  props,
) => {
  return (
    <button className="btn" onClick={props.onClick}>
      Add Sample
    </button>
  );
};

export default AddSampleButton;
