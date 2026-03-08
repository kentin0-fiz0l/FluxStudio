/**
 * Collaborative Document Yjs Sync Integration Tests
 *
 * Tests real Yjs CRDT synchronization for collaborative documents between
 * two Y.Doc instances using Y.applyUpdate to simulate WebSocket transport.
 * Focuses on Y.XmlFragment content merging (the type Tiptap uses).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';

// ============================================================================
// Helpers
// ============================================================================

/** Connect two Y.Docs so updates propagate bidirectionally. */
function connectDocs(docA: Y.Doc, docB: Y.Doc): () => void {
  const handleA = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') {
      Y.applyUpdate(docB, update, 'remote');
    }
  };
  const handleB = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') {
      Y.applyUpdate(docA, update, 'remote');
    }
  };

  docA.on('update', handleA);
  docB.on('update', handleB);

  // Sync existing state
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA), 'remote');
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB), 'remote');

  return () => {
    docA.off('update', handleA);
    docB.off('update', handleB);
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Collaborative Document Yjs Sync (real CRDT)', () => {
  let docA: Y.Doc;
  let docB: Y.Doc;
  let disconnect: () => void;

  beforeEach(() => {
    docA = new Y.Doc();
    docB = new Y.Doc();
  });

  afterEach(() => {
    disconnect?.();
    docA.destroy();
    docB.destroy();
  });

  // --------------------------------------------------------------------------
  // 1. Concurrent text insertion merges
  // --------------------------------------------------------------------------

  describe('Concurrent text insertion', () => {
    it('should merge text inserted by two clients into the same XmlFragment', () => {
      disconnect = connectDocs(docA, docB);

      const fragA = docA.getXmlFragment('content');
      const fragB = docB.getXmlFragment('content');

      // Client A inserts a paragraph
      docA.transact(() => {
        const p = new Y.XmlElement('paragraph');
        const text = new Y.XmlText('Hello from A');
        p.insert(0, [text]);
        fragA.insert(0, [p]);
      });

      // Client B inserts a paragraph
      docB.transact(() => {
        const p = new Y.XmlElement('paragraph');
        const text = new Y.XmlText('Hello from B');
        p.insert(0, [text]);
        fragB.insert(fragB.length, [p]);
      });

      // Both fragments should contain content from both clients
      expect(fragA.length).toBeGreaterThanOrEqual(2);
      expect(fragB.length).toBeGreaterThanOrEqual(2);

      // Content should be identical on both sides
      const textA = fragA.toDOM().textContent;
      const textB = fragB.toDOM().textContent;
      expect(textA).toBe(textB);
      expect(textA).toContain('Hello from A');
      expect(textA).toContain('Hello from B');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Y.Text concurrent edits within a shared text node
  // --------------------------------------------------------------------------

  describe('Y.Text concurrent edits', () => {
    it('should merge concurrent insertions into the same Y.Text', () => {
      const textA = docA.getText('shared-text');
      const textB = docB.getText('shared-text');

      // Seed with initial content
      textA.insert(0, 'Hello World');

      disconnect = connectDocs(docA, docB);

      // Client A inserts at position 5 (after "Hello")
      textA.insert(5, ' Beautiful');

      // Client B appends at the end
      textB.insert(textB.length, '!');

      // Both should converge
      expect(textA.toString()).toBe(textB.toString());
      expect(textA.toString()).toContain('Hello');
      expect(textA.toString()).toContain('Beautiful');
      expect(textA.toString()).toContain('World');
      expect(textA.toString()).toContain('!');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Document disconnect/reconnect preserves content
  // --------------------------------------------------------------------------

  describe('Disconnect and reconnect', () => {
    it('should preserve content through disconnect/reconnect cycle', () => {
      disconnect = connectDocs(docA, docB);

      const fragA = docA.getXmlFragment('content');

      // Add initial content
      docA.transact(() => {
        const p = new Y.XmlElement('paragraph');
        const text = new Y.XmlText('Initial content');
        p.insert(0, [text]);
        fragA.insert(0, [p]);
      });

      // Verify sync
      const fragB = docB.getXmlFragment('content');
      expect(fragB.length).toBe(1);

      // Disconnect
      disconnect();

      // Both add content while disconnected
      docA.transact(() => {
        const p = new Y.XmlElement('paragraph');
        const text = new Y.XmlText('Added while offline (A)');
        p.insert(0, [text]);
        fragA.insert(fragA.length, [p]);
      });

      docB.transact(() => {
        const p = new Y.XmlElement('paragraph');
        const text = new Y.XmlText('Added while offline (B)');
        p.insert(0, [text]);
        fragB.insert(fragB.length, [p]);
      });

      // Before reconnect: each only sees their own additions
      expect(fragA.length).toBe(2);
      expect(fragB.length).toBe(2);

      // Reconnect
      disconnect = connectDocs(docA, docB);

      // After reconnect: both see all content
      expect(fragA.length).toBe(3);
      expect(fragB.length).toBe(3);

      const textA = fragA.toDOM().textContent;
      const textB = fragB.toDOM().textContent;
      expect(textA).toBe(textB);
      expect(textA).toContain('Initial content');
      expect(textA).toContain('Added while offline (A)');
      expect(textA).toContain('Added while offline (B)');
    });
  });

  // --------------------------------------------------------------------------
  // 4. State encoding roundtrip
  // --------------------------------------------------------------------------

  describe('State encoding roundtrip', () => {
    it('should preserve document through encodeStateAsUpdate / applyUpdate', () => {
      const frag = docA.getXmlFragment('content');

      docA.transact(() => {
        const p1 = new Y.XmlElement('paragraph');
        const t1 = new Y.XmlText('First paragraph');
        p1.insert(0, [t1]);
        frag.insert(0, [p1]);

        const p2 = new Y.XmlElement('paragraph');
        const t2 = new Y.XmlText('Second paragraph');
        p2.insert(0, [t2]);
        frag.insert(1, [p2]);
      });

      // Encode state (simulates IndexedDB save)
      const savedState = Y.encodeStateAsUpdate(docA);

      // Restore into fresh doc (simulates page reload)
      const docRestored = new Y.Doc();
      Y.applyUpdate(docRestored, savedState);

      const restoredFrag = docRestored.getXmlFragment('content');
      expect(restoredFrag.length).toBe(2);

      const text = restoredFrag.toDOM().textContent;
      expect(text).toContain('First paragraph');
      expect(text).toContain('Second paragraph');

      docRestored.destroy();
    });

    it('should merge encoded states from two disconnected docs', () => {
      // Two docs work independently
      const fragA = docA.getXmlFragment('content');
      const fragB = docB.getXmlFragment('content');

      docA.transact(() => {
        const p = new Y.XmlElement('paragraph');
        const t = new Y.XmlText('Content from doc A');
        p.insert(0, [t]);
        fragA.insert(0, [p]);
      });

      docB.transact(() => {
        const p = new Y.XmlElement('paragraph');
        const t = new Y.XmlText('Content from doc B');
        p.insert(0, [t]);
        fragB.insert(0, [p]);
      });

      // Merge by applying both states to a fresh doc
      const docMerged = new Y.Doc();
      Y.applyUpdate(docMerged, Y.encodeStateAsUpdate(docA));
      Y.applyUpdate(docMerged, Y.encodeStateAsUpdate(docB));

      const mergedFrag = docMerged.getXmlFragment('content');
      expect(mergedFrag.length).toBe(2);

      const text = mergedFrag.toDOM().textContent;
      expect(text).toContain('Content from doc A');
      expect(text).toContain('Content from doc B');

      docMerged.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Metadata map for document properties
  // --------------------------------------------------------------------------

  describe('Document metadata sync', () => {
    it('should sync document title and properties via Y.Map', () => {
      disconnect = connectDocs(docA, docB);

      const metaA = docA.getMap('document:meta');
      const metaB = docB.getMap('document:meta');

      docA.transact(() => {
        metaA.set('title', 'Project Brief');
        metaA.set('lastEditedBy', 'user-a');
      });

      expect(metaB.get('title')).toBe('Project Brief');
      expect(metaB.get('lastEditedBy')).toBe('user-a');

      // Client B updates
      docB.transact(() => {
        metaB.set('lastEditedBy', 'user-b');
      });

      expect(metaA.get('lastEditedBy')).toBe('user-b');
    });
  });
});
