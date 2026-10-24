import requestText from "@easyimmerse/fixtures/sample-audio-alignment.json?raw";
import type {
  AddAlignmentRequest,
  Alignment,
  AlignmentContent,
} from "@easyimmerse/types";

const request = JSON.parse(requestText) as AddAlignmentRequest;

/**
 * The fixture's audio alignment of the EPUB fixture, whose text `exampleShortBook` holds, as the server lists it for book b1:
 * one segment per sentence within the three seconds of `sample.mp3`. The fixture's placeholder audio file id becomes the one given.
 */
export function exampleAudioAlignment(audioMediaFileId: string): Alignment {
  return {
    id: "audio-alignment",
    media_file_id: "b1",
    provider: request.provider,
    created_at_ms: 0,
    content: withAudioFile(request.content, audioMediaFileId),
  };
}

function withAudioFile(
  content: AlignmentContent,
  audioMediaFileId: string,
): AlignmentContent {
  return content.kind === "audio"
    ? { ...content, audio_media_file_id: audioMediaFileId }
    : content;
}
