import { create } from 'zustand';

type SessionState = {
  companyName: string | null;
  setCompanyName: (companyName: string | null) => void;
};

export const useSession = create<SessionState>((set) => ({
  companyName: null,
  setCompanyName: (companyName) => {
    set({ companyName });
  },
}));
