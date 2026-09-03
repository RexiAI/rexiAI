/**
 * Observed meeting duration.
 *
 * The original implementation read Teams attendance reports via Graph — that
 * path is gone: attendance reports need OnlineMeetingArtifact.Read.All and a
 * work/school account, and meetings are Jitsi rooms now (personal Microsoft
 * account). Duration comes from the meeting recording instead (ffprobe on the
 * recorded file) in the recording pipeline.
 *
 * Until that pipeline feeds a duration store, this returns null — "no opinion".
 * Callers must keep treating null as a no-op, never a billing signal.
 */

export async function getRecordedMinutes(_ref: string): Promise<number | null> {
  return null
}