/**
 * Spatial Index - Quadtree for O(log n) spatial queries.
 *
 * Used for viewport culling and nearest-neighbor lookups
 * when performer count exceeds 200+.
 */

/** Axis-aligned bounding box */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface QuadTreeEntry {
  id: string;
  x: number;
  y: number;
}

/** Maximum entries per leaf node before splitting */
const MAX_ENTRIES = 8;
/** Maximum tree depth to prevent infinite recursion */
const MAX_DEPTH = 10;

class QuadTreeNode {
  bounds: Bounds;
  entries: QuadTreeEntry[] = [];
  children: QuadTreeNode[] | null = null;
  depth: number;

  constructor(bounds: Bounds, depth: number) {
    this.bounds = bounds;
    this.depth = depth;
  }

  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const hw = width / 2;
    const hh = height / 2;
    this.children = [
      new QuadTreeNode({ x, y, width: hw, height: hh }, this.depth + 1),
      new QuadTreeNode({ x: x + hw, y, width: hw, height: hh }, this.depth + 1),
      new QuadTreeNode({ x, y: y + hh, width: hw, height: hh }, this.depth + 1),
      new QuadTreeNode({ x: x + hw, y: y + hh, width: hw, height: hh }, this.depth + 1),
    ];
  }

  private contains(px: number, py: number): boolean {
    return (
      px >= this.bounds.x &&
      px < this.bounds.x + this.bounds.width &&
      py >= this.bounds.y &&
      py < this.bounds.y + this.bounds.height
    );
  }

  private intersects(b: Bounds): boolean {
    return !(
      b.x > this.bounds.x + this.bounds.width ||
      b.x + b.width < this.bounds.x ||
      b.y > this.bounds.y + this.bounds.height ||
      b.y + b.height < this.bounds.y
    );
  }

  insert(entry: QuadTreeEntry): boolean {
    if (!this.contains(entry.x, entry.y)) return false;

    if (this.children === null) {
      if (this.entries.length < MAX_ENTRIES || this.depth >= MAX_DEPTH) {
        this.entries.push(entry);
        return true;
      }
      this.subdivide();
      // Re-distribute existing entries
      const oldEntries = this.entries;
      this.entries = [];
      for (const e of oldEntries) {
        let inserted = false;
        for (const child of this.children!) {
          if (child.insert(e)) { inserted = true; break; }
        }
        if (!inserted) this.entries.push(e);
      }
    }

    for (const child of this.children!) {
      if (child.insert(entry)) return true;
    }

    // Shouldn't happen, but keep as fallback
    this.entries.push(entry);
    return true;
  }

  query(queryBounds: Bounds, results: QuadTreeEntry[]): void {
    if (!this.intersects(queryBounds)) return;

    for (const entry of this.entries) {
      if (
        entry.x >= queryBounds.x &&
        entry.x < queryBounds.x + queryBounds.width &&
        entry.y >= queryBounds.y &&
        entry.y < queryBounds.y + queryBounds.height
      ) {
        results.push(entry);
      }
    }

    if (this.children) {
      for (const child of this.children) {
        child.query(queryBounds, results);
      }
    }
  }

  nearest(px: number, py: number, count: number, results: { entry: QuadTreeEntry; distSq: number }[]): void {
    // Collect all entries from this node
    for (const entry of this.entries) {
      const dx = entry.x - px;
      const dy = entry.y - py;
      const distSq = dx * dx + dy * dy;
      results.push({ entry, distSq });
    }

    if (this.children) {
      // Sort children by distance to query point for better pruning
      const sortedChildren = [...this.children].sort((a, b) => {
        const aDist = this.pointToBoundsDist(px, py, a.bounds);
        const bDist = this.pointToBoundsDist(px, py, b.bounds);
        return aDist - bDist;
      });

      for (const child of sortedChildren) {
        // Prune: if we have enough results and the child is further than our worst
        if (results.length >= count) {
          results.sort((a, b) => a.distSq - b.distSq);
          const worstDist = results[count - 1].distSq;
          const childDist = this.pointToBoundsDist(px, py, child.bounds);
          if (childDist * childDist > worstDist) continue;
        }
        child.nearest(px, py, count, results);
      }
    }
  }

  private pointToBoundsDist(px: number, py: number, b: Bounds): number {
    const cx = Math.max(b.x, Math.min(px, b.x + b.width));
    const cy = Math.max(b.y, Math.min(py, b.y + b.height));
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }
}

/** Public spatial index API */
export interface SpatialIndex {
  /** Insert a point into the index */
  insert(id: string, x: number, y: number): void;
  /** Remove a point by ID */
  remove(id: string): void;
  /** Query all points within bounds */
  query(bounds: Bounds): Array<{ id: string; x: number; y: number }>;
  /** Find the N nearest points to a position */
  nearest(x: number, y: number, count: number): Array<{ id: string; x: number; y: number; distance: number }>;
  /** Rebuild the entire index from a position map */
  rebuild(positions: Map<string, { x: number; y: number }>): void;
  /** Total number of entries */
  readonly size: number;
}

/**
 * Create a spatial index backed by a quadtree.
 * @param bounds - The bounding area for all points (normalized coordinates, typically {x:0, y:0, width:100, height:100})
 */
export function createSpatialIndex(bounds: Bounds): SpatialIndex {
  let root = new QuadTreeNode(bounds, 0);
  let entryMap = new Map<string, { x: number; y: number }>();

  return {
    insert(id: string, x: number, y: number): void {
      entryMap.set(id, { x, y });
      root.insert({ id, x, y });
    },

    remove(id: string): void {
      entryMap.delete(id);
      // Rebuild on remove (quadtrees don't support efficient deletion)
      this.rebuild(entryMap);
    },

    query(queryBounds: Bounds): Array<{ id: string; x: number; y: number }> {
      const results: QuadTreeEntry[] = [];
      root.query(queryBounds, results);
      return results;
    },

    nearest(x: number, y: number, count: number): Array<{ id: string; x: number; y: number; distance: number }> {
      const raw: { entry: QuadTreeEntry; distSq: number }[] = [];
      root.nearest(x, y, count, raw);
      raw.sort((a, b) => a.distSq - b.distSq);
      return raw.slice(0, count).map(r => ({
        id: r.entry.id,
        x: r.entry.x,
        y: r.entry.y,
        distance: Math.sqrt(r.distSq),
      }));
    },

    rebuild(positions: Map<string, { x: number; y: number }>): void {
      root = new QuadTreeNode(bounds, 0);
      entryMap = new Map(positions);
      for (const [id, pos] of positions) {
        root.insert({ id, x: pos.x, y: pos.y });
      }
    },

    get size(): number {
      return entryMap.size;
    },
  };
}
