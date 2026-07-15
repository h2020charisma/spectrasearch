/* eslint-disable react/prop-types */

const iconPackLoaders = {
  fa: () => import("react-icons/fa"),
  fa6: () => import("react-icons/fa6"),
  md: () => import("react-icons/md"),
  hi: () => import("react-icons/hi"),
  hi2: () => import("react-icons/hi2"),
  ai: () => import("react-icons/ai"),
};
import { lazy, Suspense, useMemo } from "react";

function DynamicIcon({ name, pack }) {
  const Icon = useMemo(() => {
    if (!pack || !name) return null;

    return lazy(() =>
      iconPackLoaders[pack]().then((module) => ({
        default: module[name],
      })),
    );
  }, [pack, name]);

  if (!Icon) return null;

  return (
    <Suspense fallback={null}>
      <Icon />
    </Suspense>
  );
}

export default DynamicIcon;
