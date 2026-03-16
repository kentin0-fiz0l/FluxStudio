/**
 * useScene3D - Scene state management hook (facade)
 *
 * Composes focused sub-hooks into a single interface for backward compatibility.
 * Consumers that only need a subset of properties should import the specific
 * sub-hook directly to reduce re-renders:
 *
 *   useSceneObjects   - CRUD operations and object list
 *   useSceneSelection - Selected object state
 *   useSceneTools     - Active tool and view mode
 *   useScenePanels    - Panel open/close state
 *   useSceneSettings  - Grid, labels, shadows, etc.
 */

import { useSceneObjects } from './useSceneObjects';
import { useSceneSelection } from './useSceneSelection';
import { useSceneTools } from './useSceneTools';
import { useScenePanels } from './useScenePanels';
import { useSceneSettings } from './useSceneSettings';

export function useScene3D() {
  const objects = useSceneObjects();
  const selection = useSceneSelection();
  const tools = useSceneTools();
  const panels = useScenePanels();
  const settings = useSceneSettings();

  return {
    ...objects,
    ...selection,
    ...tools,
    ...panels,
    ...settings,
  };
}
