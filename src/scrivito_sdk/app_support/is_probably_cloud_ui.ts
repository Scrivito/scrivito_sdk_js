export function isProbablyCloudUi(): boolean {
  const parentFrame = window.parent;

  // if we aren't inside an iframe, the hosts can't differ
  if (parentFrame === window) return false;

  // if the hosts differ, we probably are inside the Cloud UI already
  return getFrameHost(parentFrame) !== window.location.host;
}

function getFrameHost(frame: Window): string | undefined {
  try {
    return frame.location.host;
  } catch (_ignore) {
    // an error means that the frame is cross-origin,
    // and therefore we are not allowed to know the host.
  }
}
