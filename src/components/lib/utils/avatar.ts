export const AVATAR_STYLES = [
  'adventurer',
  'avataaars',
  'big-ears',
  'big-ears-neutral',
  'big-smile',
  'bottts',
  'croodles',
  'fun-emoji',
  'icons',
  'identicon',
  'initials',
  'lorelei',
  'micah',
  'miniavs',
  'open-peeps',
  'personas',
  'pixel-art',
  'shapes',
  'thumbs'
] as const;

export type AvatarStyle = typeof AVATAR_STYLES[number];

export function generateAvatarUrl(
  name: string, 
  style: AvatarStyle = 'adventurer', 
  size: number = 128
): string {

  const seed = encodeURIComponent(name);

  const baseUrl = 'https://api.dicebear.com/7.x';
  const params = new URLSearchParams({
    seed,
    size: size.toString(),
    backgroundColor: 'transparent',

    ...(style === 'adventurer' && {
      flip: 'false',
      rotate: '0',
      scale: '100',
      translateX: '0',
      translateY: '0',
    }),
    ...(style === 'avataaars' && {
      flip: 'false',
      rotate: '0',
      scale: '100',
    }),
    ...(style === 'big-ears' && {
      flip: 'false',
      rotate: '0',
      scale: '100',
    })
  });

  return `${baseUrl}/${style}/svg?${params.toString()}`;
}

export function getAgentAvatar(
  agentName: string, 
  agentType?: string, 
  isSystemAgent: boolean = false
): string {

  let style: AvatarStyle = 'adventurer';

  if (isSystemAgent) {

    style = 'personas';
  } else if (agentType === 'CHAT') {

    style = 'adventurer';
  } else {

    style = 'big-ears';
  }

  return generateAvatarUrl(agentName, style);
}

export function preloadAvatar(url: string): void {
  const img = new Image();
  img.src = url;
}

export function preloadAvatars(urls: string[]): void {
  urls.forEach(url => {
    preloadAvatar(url);
  });
}

export function getFallbackAvatarUrl(name: string): string {

  return generateAvatarUrl(name, 'initials');
} 