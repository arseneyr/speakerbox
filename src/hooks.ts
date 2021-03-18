import { useCallback, useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import ResizeObserver from "resize-observer-polyfill";

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

export const useSize = ({
  box = "content-box",
  useWidth = true,
  useHeight = true,
}: Partial<{
  box: "content-box" | "border-box";
  useWidth: boolean;
  useHeight: boolean;
}> = {}) => {
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const onResize: ResizeObserverCallback = (entries) => {
    for (const entry of entries as any) {
      if (box === "content-box" && entry.contentBoxSize) {
        useWidth && setWidth(entry.contentBoxSize[0].inlineSize);
        useHeight && setHeight(entry.contentBoxSize[0].blockSize);
      } else if (box === "border-box" && entry.borderBoxSize) {
        useWidth && setWidth(entry.borderBoxSize[0].inlineSize);
        useHeight && setHeight(entry.borderBoxSize[0].blockSize);
      } else {
        useWidth && setWidth(entry.contentRect.width);
        useHeight && setHeight(entry.contentRect.height);
      }
    }
  };

  const observerRef = useRef<ResizeObserver>(null as any);
  if (!observerRef.current) {
    observerRef.current = new ResizeObserver(onResize);
  }

  const ref = useCallback((el: Element | null) => {
    if (!el) {
      observerRef.current.disconnect();
      return;
    }

    observerRef.current.observe(el);
  }, []);

  return [ref, width, height] as const;
};

export const useDocumentDrop = () => {
  const [collected, drop] = useDrop({
    accept: NativeTypes.FILE,
    collect: (monitor) => ({ item: monitor.getItem() }),
  });
  useEffect(() => {
    drop(document.documentElement);
  }, [drop]);
  return collected;
};
