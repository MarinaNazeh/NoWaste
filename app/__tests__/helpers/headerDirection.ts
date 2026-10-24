// Reads the layout direction that expo-router passes to the native screen header (back arrow, title, header
// buttons). It comes from LocaleProvider in app/_layout.tsx (decision D-14).
import { screen } from 'expo-router/testing-library';

interface TreeNode {
  type: unknown;
  props: Record<string, unknown>;
  children?: unknown[];
}

function isNode(value: unknown): value is TreeNode {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

export function headerDirections(): unknown[] {
  const found: unknown[] = [];
  const walk = (node: unknown) => {
    if (!isNode(node)) return;
    if (node.type === 'RNSScreenStackHeaderConfig') found.push(node.props.direction);
    (node.children ?? []).forEach(walk);
  };
  walk(screen.root);
  return found;
}
