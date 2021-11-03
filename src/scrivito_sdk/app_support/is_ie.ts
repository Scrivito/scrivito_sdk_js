export function isIE(): boolean {
  const userAgent = window.navigator.userAgent;
  return userAgent.indexOf('MSIE') >= 0 || userAgent.indexOf('Trident') >= 0;
}
