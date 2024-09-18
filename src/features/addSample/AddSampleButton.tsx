import React from "react";
import AddIcon from "@assets/plus.svg?react";
import DownIcon from "@assets/chevron_down.svg?react";

interface AddSampleButtonOption {
  icon: React.ReactElement;
  text: string;
  onClick: React.MouseEventHandler;
}

interface AddSampleButtonProps {
  options: AddSampleButtonOption[];
  default: AddSampleButtonOption | null;
}

function blurOnClick(
  onClick: React.MouseEventHandler,
): React.MouseEventHandler {
  return (event) => {
    const focused = event.currentTarget.closest("*:focus");
    focused && focused instanceof HTMLElement && focused.blur();
    onClick(event);
  };
}

const AddSampleWithDefault: React.FunctionComponent<AddSampleButtonProps> = (
  props,
) => {
  const {
    icon: defaultIcon,
    text: defaultText,
    onClick: defaultOnClick,
  } = props.default!;
  return (
    <div className="relative inline-flex">
      <button
        className="btn btn-primary rounded-r-none pr-2 text-lg"
        onClick={defaultOnClick}
      >
        {defaultIcon}
        {defaultText}
      </button>
      <div className="dropdown dropdown-end dropdown-bottom static">
        <div
          tabIndex={0}
          role="button"
          className="btn btn-primary rounded-l-none border-0 border-l-2 border-neutral p-1 text-lg
            hover:border-neutral"
        >
          <DownIcon />
        </div>
        <ul
          tabIndex={0}
          className="menu dropdown-content absolute inset-0 min-w-full px-0"
        >
          {props.options.map((option) => (
            <li className="pb-2" key={option.text}>
              <a onClick={blurOnClick(option.onClick)} className="text-nowrap">
                {option.icon}
                {option.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const AddSampleButton: React.FunctionComponent<AddSampleButtonProps> = (
  props,
) => {
  return props.default ? (
    <AddSampleWithDefault
      {...props}
      options={props.options.filter((o) => o !== props.default)}
    />
  ) : (
    <div className="dropdown">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-primary collapse-arrow text-lg"
      >
        <AddIcon />
        Add sample
      </div>
      <ul tabIndex={0} className="menu dropdown-content min-w-full px-0">
        {props.options.map((option) => (
          <li className="pb-2" key={option.text}>
            <a onClick={blurOnClick(option.onClick)}>
              {option.icon}
              {option.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddSampleButton;
