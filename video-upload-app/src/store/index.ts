import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
  setTheme: (isDark) => set({ isDark }),
}));

interface Video {
  _id: string;
  title: string;
  description?: string;
  publicId: string;
  secureUrl: string;
  format: string;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  bitRate?: number;
  frameRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  fileSize: number;
  thumbnail: string;
  isMultipart?: boolean;
  totalParts?: number;
  parts?: Array<{
    publicId: string;
    secureUrl: string;
    format: string;
    duration: number;
    width: number;
    height: number;
    aspectRatio?: string;
    bitRate?: number;
    frameRate?: number;
    videoCodec?: string;
    audioCodec?: string;
    fileSize: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  setVideos: (videos: Video[]) => void;
  setCurrentVideo: (video: Video | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: any) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videos: [],
  currentVideo: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  },
  setVideos: (videos) => set({ videos }),
  setCurrentVideo: (currentVideo) => set({ currentVideo }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPagination: (pagination) => set({ pagination }),
}));
