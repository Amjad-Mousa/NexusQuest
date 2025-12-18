import { Play } from 'lucide-react';
import { useState } from 'react';

interface YouTubeEmbedProps {
  videoUrl: string;
  title?: string;
  theme?: 'dark' | 'light';
}

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

export default function YouTubeEmbed({ videoUrl, title, theme = 'dark' }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoId = getYouTubeVideoId(videoUrl);

  if (!videoId) {
    return (
      <div className={`rounded-xl p-6 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <p className="text-red-400">Invalid YouTube URL</p>
      </div>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Play className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-lg">{title || 'Video Tutorial'}</h3>
      </div>
      
      <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
        {!isLoaded ? (
          // Thumbnail with play button (lazy load)
          <button
            onClick={() => setIsLoaded(true)}
            className="w-full h-full relative group cursor-pointer"
            aria-label="Play video"
          >
            <img
              src={thumbnailUrl}
              alt={title || 'Video thumbnail'}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to default thumbnail if maxres not available
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }}
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </div>
            </div>
            {/* YouTube logo */}
            <div className="absolute bottom-4 right-4 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube
            </div>
          </button>
        ) : (
          // Actual iframe
          <iframe
            src={embedUrl}
            title={title || 'YouTube video'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
