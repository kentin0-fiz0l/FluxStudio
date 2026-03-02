export type { ShowPlan, DraftStatus } from '@/store/slices/formationDraftSlice';

export interface FormationDraftPanelProps {
  formationId: string;
  songId?: string | null;
  performerCount: number;
  onClose: () => void;
}
