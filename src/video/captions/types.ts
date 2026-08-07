export interface CaptionWord {
  text: string;
  startSeconds: number;
  endSeconds: number;
  isKeyWord: boolean;
}

export interface CaptionPhrase {
  text: string;
  startSeconds: number;
  endSeconds: number;
  words: CaptionWord[];
}
