/**
 * DiceBear avatar URL helpers shared by user profile and agent avatar pickers.
 */

export const AVATAR_STYLES = [
  'adventurer',
  'avataaars',
  'big-ears',
  'big-ears-neutral',
  'big-smile',
  'bottts',
  'croodles',
  'fun-emoji',
  'identicon',
  'lorelei',
  'micah',
  'miniavs',
  'open-peeps',
  'personas',
  'pixel-art',
  'shapes',
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

/**
 * Generate a deterministic DiceBear SVG URL from a seed name.
 */
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
    }),
  });

  return `${baseUrl}/${style}/svg?${params.toString()}`;
}
