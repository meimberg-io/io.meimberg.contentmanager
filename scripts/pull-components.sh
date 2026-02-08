#!/bin/bash
set -e

echo "Pulling Storyblok components for space 330326..."
npx storyblok components pull --space 330326

echo "Generating TypeScript types..."
npx storyblok types --space 330326 generate
cp .storyblok/types/330326/storyblok-components.d.ts src/types/component-types-sb.d.ts

echo "✅ Done! Types updated in src/types/component-types-sb.d.ts"
