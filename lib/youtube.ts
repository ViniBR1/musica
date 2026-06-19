export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Limpar a URL
  const cleanUrl = url.trim();
  
  // Padrões de URL do YouTube
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
    /(?:youtube\.com\/v\/)([^?]+)/,
    /(?:youtube\.com\/shorts\/)([^?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Se não encontrou nenhum padrão, tentar extrair o último segmento
  const lastSegment = cleanUrl.split('/').pop()?.split('?')[0];
  if (lastSegment && lastSegment.length === 11) {
    return lastSegment;
  }
  
  return null;
}

export function getEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}

export function getWatchUrl(url: string): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}