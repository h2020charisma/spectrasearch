/* eslint-disable react/prop-types */

const iconPackLoaders = {
  fa: () => import("react-icons/fa"),
  fa6: () => import("react-icons/fa6"),
  md: () => import("react-icons/md"),
  hi: () => import("react-icons/hi"),
  hi2: () => import("react-icons/hi2"),
  ai: () => import("react-icons/ai"),
};

// Icon "FaFileAlt" not found in pack "fa6"
// Error: Icon "FaFileAlt" not found in pack "fa6"

import { lazy, Suspense } from "react";

function DynamicIcon({ name, pack }) {
  if (!pack || !name) return;

  // console.log(iconPackLoaders[pack]);

  const Icon = lazy(() => {
    return iconPackLoaders[pack]().then((module) => {
      const Component = module[name];

      if (!Component) {
        throw new Error(`Icon "${name}" not found in pack "${pack}"`);
      }

      return { default: Component };
    });
  });

  return (
    <Suspense fallback={null}>
      <Icon />
    </Suspense>
  );
}

export default DynamicIcon;
