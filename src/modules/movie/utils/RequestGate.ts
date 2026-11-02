/** Latest-request and lifecycle guard. A ticket must be checked before every success/error side effect. */
export function createRequestGate(readContext: () => string) {
  let disposed = false;
  let generation = 0;
  const channels = new Map<string, number>();
  return {
    begin(channel = 'default') {
      const context = readContext();
      const epoch = generation;
      const version = (channels.get(channel) || 0) + 1;
      channels.set(channel, version);
      return () =>
        !disposed &&
        epoch === generation &&
        context === readContext() &&
        channels.get(channel) === version;
    },
    invalidate() {
      generation++;
      channels.clear();
    },
    dispose() {
      disposed = true;
      generation++;
      channels.clear();
    },
  };
}
