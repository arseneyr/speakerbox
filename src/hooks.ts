import { useEffect, useState } from "react";

const getWidth = () =>
  window.innerWidth ||
  document.documentElement.clientWidth ||
  document.body.clientWidth;

export const useWindowWidth = () => {
  const [width, setWidth] = useState(getWidth());
  useEffect(() => {
    let timeout: any = null;
    const resizeListener = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setWidth(getWidth()), 150);
    };
    window.addEventListener("resize", resizeListener);
    return () => window.removeEventListener("resize", resizeListener);
  }, []);
  return width;
};
