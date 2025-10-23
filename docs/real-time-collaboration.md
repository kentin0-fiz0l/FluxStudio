# Real-Time Collaboration Design Doc

## Overview
This document outlines a proposed architecture for adding real-time co-editing with version control to FluxStudio. The goal is to allow multiple users to collaborate on design files simultaneously while preserving a history of changes and enabling private drafts.

## Objectives
- Enable multiple users to edit the same design file in real time.
- Provide a version history and the ability to revert to previous versions.
- Allow users to branch off the main design into private drafts, then merge when ready.
- Maintain consistent state across clients with low latency.
- Integrate seamlessly with the existing Git-based workflow.

## Architecture

### CRDT-based Editor
Use a conflict-free replicated data type (CRDT) framework such as [Yjs](https://github.com/yjs/yjs) or [Automerge](https://github.com/automerge/automerge) to manage concurrent edits. CRDTs ensure eventual consistency and enable offline editing.

### Drafts and Branching
Inspired by version control systems and research like Ink & Switch's *Upwelling* project【145342851078410†L20-L27】, each design will have:
- **Main branch**: The shared, public version that collaborators see in real time.
- **Draft branches**: Private working copies where designers can experiment without others watching. Changes remain invisible until the draft is merged back into the main branch.
- **Merge requests**: When a designer is ready, they can create a merge request to bring their draft into the main branch. Collaborators can review and resolve conflicts before merging.

### Change History
All edits are stored as operations in the CRDT log. Snapshots are periodically saved to provide a clear version history. Users can explore a timeline of changes, compare different versions, and revert if necessary.

### Backend & Persistence
Store CRDT document states and snapshots in the existing PostgreSQL database or a document store like Redis. Socket.IO can be used to broadcast real-time updates to connected clients. Ensure operations are persisted to allow recovery in case of network failures.

### Permissions & Privacy
Users control who can see and edit drafts. Real-time editing should avoid the "fishbowl effect" by allowing collaborators to work privately before sharing【145342851078410†L116-L142】.

## Implementation Plan
1. Research and select a CRDT library compatible with React and Node.js.
2. Build a proof-of-concept editor component that uses CRDT to sync text or basic objects across clients.
3. Define API endpoints for creating drafts, merging them, and retrieving version histories.
4. Integrate Socket.IO channels for real-time updates.
5. Develop UI components for branching, merging, and viewing history.
6. Write tests to ensure consistency and handle merge conflicts gracefully.
7. Document the feature and update the contributor guidelines.

## Conclusion
By introducing CRDT-based real-time editing, branch-based drafting, and a robust version history, FluxStudio can offer an intuitive and powerful collaboration experience similar to Figma or Google Docs. The combination of real-time and asynchronous workflows will help teams co-create while retaining control over when and how changes are shared.
